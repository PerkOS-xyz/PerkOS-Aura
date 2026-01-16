/**
 * x402 Payment Middleware for Next.js API Routes
 * Verifies and settles x402 v2 payments via PerkOS-Stack facilitator
 */

import { NextRequest, NextResponse } from "next/server";
import { x402Config, paymentRoutes, SUPPORTED_NETWORKS, usdcAddresses, getCAIP2Network, networkMappings, getResourceUrl } from "@/lib/config/x402";
import { toCAIP2Network, parsePriceToUSDC, getDomainVersion, getTokenName } from "@/lib/utils/x402-payment";

export interface PaymentEnvelope {
  network: string;
  authorization: {
    from: string;
    to: string;
    value: string;
    nonce: string;
    validBefore: string;
  };
  signature: string;
}

export interface PaymentVerificationResult {
  isValid: boolean;
  payer?: string;
  invalidReason?: string;
  transactionHash?: string;
}

/**
 * Extract payment envelope from request headers
 * x402 V2 uses PAYMENT-SIGNATURE header (replaces deprecated X-Payment)
 * Per spec: https://www.x402.org/writing/x402-v2-launch
 */
export function extractPaymentEnvelope(request: NextRequest): PaymentEnvelope | null {
  // Try V2 header first (PAYMENT-SIGNATURE)
  let paymentHeader = request.headers.get("payment-signature");

  // Fallback to deprecated X-Payment for backward compatibility
  if (!paymentHeader) {
    paymentHeader = request.headers.get("x-payment");
  }

  if (!paymentHeader) {
    console.log("🔍 No payment header found");
    return null;
  }

  try {
    // V2 spec says payment data should be in headers (base64 encoded JSON)
    // For now, we support both JSON and base64-encoded JSON
    let parsed: any;

    // Try parsing as base64 first (V2 standard)
    try {
      const decoded = Buffer.from(paymentHeader, "base64").toString("utf-8");
      parsed = JSON.parse(decoded);
    } catch {
      // Fallback to direct JSON parsing (backward compatibility)
      parsed = JSON.parse(paymentHeader);
    }

    // x402 v2 format: { x402Version: 2, scheme: "exact", network: "eip155:43114", payload: { ...envelope } }
    // Extract the actual envelope from the payload
    let envelope: PaymentEnvelope;

    if (parsed.x402Version === 2 && parsed.payload) {
      // V2 format: envelope is in payload field
      envelope = parsed.payload as PaymentEnvelope;
      console.log("✅ Extracted V2 payment envelope:", {
        outerNetwork: parsed.network,
        envelopeNetwork: envelope.network,
        from: envelope.authorization?.from,
      });
    } else {
      // V1 format or direct envelope
      envelope = parsed as PaymentEnvelope;
      console.log("✅ Extracted V1 payment envelope:", {
        network: envelope.network,
        from: envelope.authorization?.from,
      });
    }

    return envelope;
  } catch (error) {
    console.error("❌ Failed to parse PAYMENT-SIGNATURE header:", error);
    return null;
  }
}

/**
 * Verify payment with PerkOS-Stack facilitator
 */
export async function verifyPayment(
  envelope: PaymentEnvelope,
  route: string,
  expectedPrice: string
): Promise<PaymentVerificationResult> {
  try {
    console.log("🔍 Verifying payment:", {
      route,
      from: envelope.authorization.from,
      to: envelope.authorization.to,
      value: envelope.authorization.value,
      network: envelope.network,
    });

    const routePrice = paymentRoutes[route as keyof typeof paymentRoutes];
    if (routePrice === undefined) { // Check for undefined, as 0 is a valid price
      return {
        isValid: false,
        invalidReason: `Route ${route} not configured for payment`,
      };
    }

    // Create route config from price
    const routeConfig = {
      price: routePrice, // Store as number
      priceString: `$${routePrice}`, // Store as formatted string
      description: `Payment for ${route}`,
    };

    // Verify network is in supported networks list
    // envelope.network can be in legacy format (e.g., "avalanche") or CAIP-2 (e.g., "eip155:43114")
    const envelopeNetwork = envelope.network;

    // Build reverse mapping from CAIP-2 to legacy network names
    const caip2ToLegacy: Record<string, string> = {};
    for (const [legacy, caip2] of Object.entries(networkMappings)) {
      caip2ToLegacy[caip2] = legacy;
    }

    // Normalize to legacy format for validation
    const normalizedEnvelopeNetwork = caip2ToLegacy[envelopeNetwork] || envelopeNetwork;

    // Check if the network is in our supported networks list
    if (!SUPPORTED_NETWORKS.includes(normalizedEnvelopeNetwork as typeof SUPPORTED_NETWORKS[number])) {
      console.error("❌ Unsupported network:", {
        envelopeNetwork,
        normalizedEnvelopeNetwork,
        supportedNetworks: SUPPORTED_NETWORKS,
      });
      return {
        isValid: false,
        invalidReason: `Unsupported network: ${envelopeNetwork}. Supported: ${SUPPORTED_NETWORKS.join(", ")}`,
      };
    }

    console.log("✅ Network supported:", { envelopeNetwork, normalizedEnvelopeNetwork });

    // Verify recipient address
    if (envelope.authorization.to.toLowerCase() !== x402Config.payTo.toLowerCase()) {
      return {
        isValid: false,
        invalidReason: `Recipient mismatch. Expected ${x402Config.payTo}, got ${envelope.authorization.to}`,
      };
    }

    // Call facilitator verify endpoint
    const verifyUrl = `${x402Config.facilitatorUrl}/api/v2/x402/verify`;

    // Parse price to atomic units (USDC has 6 decimals)
    const priceAmount = parsePriceToUSDC(routeConfig.priceString);

    // Get USDC address for the payment network (user's selected network)
    const usdcAddress = usdcAddresses[normalizedEnvelopeNetwork] || usdcAddresses["avalanche"];

    // Network-specific token name: Celo USDC returns "USDC", others return "USD Coin"
    const tokenName = getTokenName(normalizedEnvelopeNetwork);
    // Network-specific EIP-712 version: All Circle native USDC uses "2"
    const tokenVersion = getDomainVersion(normalizedEnvelopeNetwork);

    console.log("🔍 Payment verification details:", {
      paymentNetwork: normalizedEnvelopeNetwork,
      usdcAddress,
      tokenName,
      tokenVersion,
      priceAmount: priceAmount.toString(),
    });

    let verifyResponse: Response;
    try {
      verifyResponse = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          x402Version: 2, // Use x402 V2 protocol
          paymentRequirements: {
            scheme: "exact", // Required: exact or deferred
            network: getCAIP2Network(normalizedEnvelopeNetwork), // Use envelope's network in CAIP-2 format
            maxAmountRequired: priceAmount.toString(), // Atomic units as string (e.g., "1000" for $0.001)
            resource: getResourceUrl(route), // Full URL of resource (per x402 v2 spec)
            description: routeConfig.description || "Payment required",
            mimeType: "application/json", // Response MIME type (per x402 v2 spec)
            payTo: x402Config.payTo,
            maxTimeoutSeconds: 30, // Maximum time for server to respond (per x402 v2 spec)
            asset: usdcAddress, // Token contract address (required for signature verification)
            extra: {
              // For exact scheme on EVM: token name and version for EIP-712 domain (per x402 v2 spec)
              // Facilitator uses this to construct the correct EIP-712 domain
              name: tokenName,
              version: tokenVersion
            }
          },
          paymentPayload: {
            x402Version: 2, // V2 protocol
            network: toCAIP2Network(envelope.network), // V2 uses CAIP-2 format
            scheme: "exact", // Required: exact or deferred
            payload: envelope,
          },
        }),
      });
    } catch (fetchError) {
      // Connection error - facilitator not running or unreachable
      const errorMessage = fetchError instanceof Error ? fetchError.message : "Unknown error";
      console.error(`❌ Facilitator connection failed: ${verifyUrl}`, {
        error: errorMessage,
        facilitatorUrl: x402Config.facilitatorUrl,
        hint: "Make sure the x402 facilitator is running on the configured port",
      });
      return {
        isValid: false,
        invalidReason: `Facilitator unavailable at ${x402Config.facilitatorUrl}. Please ensure the facilitator service is running.`,
      };
    }

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json().catch(() => ({}));
      return {
        isValid: false,
        invalidReason: errorData.invalidReason || `Verification failed: ${verifyResponse.statusText}`,
      };
    }

    const verifyResult = await verifyResponse.json();

    if (verifyResult.isValid) {
      console.log("✅ Payment verification succeeded:", {
        payer: verifyResult.payer,
      });
    } else {
      console.error("❌ Payment verification failed:", {
        invalidReason: verifyResult.invalidReason,
        payer: verifyResult.payer,
      });
    }

    return {
      isValid: verifyResult.isValid || false,
      payer: verifyResult.payer,
      invalidReason: verifyResult.invalidReason,
    };
  } catch (error) {
    console.error("Payment verification error:", error);
    return {
      isValid: false,
      invalidReason: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

/**
 * Settle payment with PerkOS-Stack facilitator
 */
export async function settlePayment(
  envelope: PaymentEnvelope,
  resourceUrl: string // Full URL of the resource being accessed (required for vendor domain extraction)
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    const settleUrl = `${x402Config.facilitatorUrl}/api/v2/x402/settle`;

    // Build reverse mapping from CAIP-2 to legacy network names
    const caip2ToLegacy: Record<string, string> = {};
    for (const [legacy, caip2] of Object.entries(networkMappings)) {
      caip2ToLegacy[caip2] = legacy;
    }

    // Normalize envelope network to legacy format for USDC lookup
    const normalizedNetwork = caip2ToLegacy[envelope.network] || envelope.network;

    // Get USDC address for the payment network
    const usdcAddress = usdcAddresses[normalizedNetwork] || usdcAddresses["avalanche"];

    // Network-specific token name: Celo USDC returns "USDC", others return "USD Coin"
    const tokenName = getTokenName(normalizedNetwork);
    // Network-specific EIP-712 version: All Circle native USDC uses "2"
    const tokenVersion = getDomainVersion(normalizedNetwork);

    console.log("🔍 Payment settlement details:", {
      network: normalizedNetwork,
      usdcAddress,
      tokenName,
      tokenVersion,
    });

    let settleResponse: Response;
    try {
      settleResponse = await fetch(settleUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          x402Version: 2, // Use x402 V2 protocol
          paymentPayload: {
            x402Version: 2, // V2 protocol
            network: toCAIP2Network(envelope.network), // V2 uses CAIP-2 format
            scheme: "exact", // Required: exact or deferred
            payload: envelope,
          },
          paymentRequirements: {
            scheme: "exact", // Must match paymentPayload scheme
            network: toCAIP2Network(envelope.network), // V2 uses CAIP-2 format
            maxAmountRequired: envelope.authorization.value, // Use value from authorization
            resource: resourceUrl, // Full URL for vendor domain extraction
            description: "Payment settlement",
            mimeType: "application/json",
            payTo: envelope.authorization.to,
            maxTimeoutSeconds: 30,
            asset: usdcAddress, // Token contract address (required for signature verification)
            extra: {
              // Facilitator uses this to construct the correct EIP-712 domain
              name: tokenName,
              version: tokenVersion
            }
          },
        }),
      });
    } catch (fetchError) {
      // Connection error - facilitator not running or unreachable
      const errorMessage = fetchError instanceof Error ? fetchError.message : "Unknown error";
      console.error(`❌ Facilitator connection failed during settlement: ${settleUrl}`, {
        error: errorMessage,
        facilitatorUrl: x402Config.facilitatorUrl,
        hint: "Make sure the x402 facilitator is running on the configured port",
      });
      return {
        success: false,
        error: `Facilitator unavailable at ${x402Config.facilitatorUrl}. Please ensure the facilitator service is running.`,
      };
    }

    if (!settleResponse.ok) {
      const errorData = await settleResponse.json().catch(() => ({}));
      const errorReason = errorData.errorReason || errorData.error || `Settlement failed: ${settleResponse.statusText}`;

      console.error("❌ Payment settlement failed:", {
        status: settleResponse.status,
        errorReason,
        payer: envelope.authorization.from,
        network: envelope.network,
      });

      return {
        success: false,
        error: errorReason,
      };
    }

    const settleResult = await settleResponse.json();

    // Log the full response for debugging
    console.log("🔍 Facilitator settle response:", JSON.stringify(settleResult, null, 2));

    if (!settleResult.success) {
      const errorReason = settleResult.errorReason || settleResult.error || "Settlement failed";
      console.error("❌ Payment settlement returned success: false:", {
        errorReason,
        payer: settleResult.payer,
        network: settleResult.network,
      });

      return {
        success: false,
        error: errorReason,
      };
    }

    // Extract transaction hash from various possible response formats
    // Facilitator returns transaction as a string or in receipt.settlement.transaction
    const transactionHash =
      (typeof settleResult.transaction === "string" ? settleResult.transaction : undefined) ||
      settleResult.transaction?.hash ||
      settleResult.transaction?.transactionHash ||
      settleResult.receipt?.settlement?.transaction ||
      settleResult.transactionHash ||
      settleResult.hash ||
      undefined;

    console.log("✅ Payment settled successfully:", {
      transactionHash,
      payer: settleResult.payer,
      network: settleResult.network,
      responseKeys: Object.keys(settleResult),
    });

    return {
      success: true,
      transactionHash,
      error: undefined,
    };
  } catch (error) {
    console.error("Payment settlement error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Settlement failed",
    };
  }
}

/**
 * Create 402 Payment Required response (x402 v2 compliant)
 * Per spec: https://www.x402.org/writing/x402-v2-launch
 * V2 uses PAYMENT-REQUIRED header and moves payment data to headers
 * Returns all supported networks in accepts array for multi-chain support
 */
export function create402Response(
  route: string,
  price: string,
  _network?: string // Deprecated - we now return all supported networks
): NextResponse {
  // Extract just the path if route includes method prefix
  const routePath = route.includes(" ") ? route.split(" ")[1] : route;

  const routePrice = paymentRoutes[routePath as keyof typeof paymentRoutes];
  if (!routePrice) {
    // No payment required for this route
    return NextResponse.json({ error: "Route not configured for payment" }, { status: 500 });
  }

  // Parse price to atomic units (USDC has 6 decimals)
  const priceAmount = parsePriceToUSDC(`$${routePrice}`);
  const description = `Payment required for ${routePath}`;

  // Build accepts array for all supported networks (multi-chain support)
  const accepts = SUPPORTED_NETWORKS.map((network) => {
    const usdcAddress = usdcAddresses[network];
    const caip2Network = getCAIP2Network(network);
    // Network-specific token name: Celo USDC returns "USDC", others return "USD Coin"
    const tokenName = getTokenName(network);
    // Network-specific EIP-712 version: All Circle native USDC uses "2"
    const tokenVersion = getDomainVersion(network);

    return {
      scheme: "exact",
      network: caip2Network,
      maxAmountRequired: priceAmount.toString(),
      resource: getResourceUrl(routePath), // Full URL of resource (per x402 v2 spec)
      description,
      mimeType: "application/json",
      payTo: x402Config.payTo,
      maxTimeoutSeconds: 30,
      asset: usdcAddress,
      extra: {
        name: tokenName,
        version: tokenVersion,
        networkName: network, // Legacy name for client convenience
      },
    };
  });

  // V2: Set PAYMENT-REQUIRED header (base64-encoded JSON)
  // Per spec: "Moving all payment data to headers for the HTTP transport"
  const paymentRequiredHeader = Buffer.from(
    JSON.stringify({
      x402Version: 2,
      accepts,
      defaultNetwork: x402Config.network, // Hint for default selection
    })
  ).toString("base64");

  // Return 402 with PAYMENT-REQUIRED header
  // Response body can now be used for other purposes (per V2 spec)
  return NextResponse.json(
    {
      error: "Payment Required",
      message: "Please include PAYMENT-SIGNATURE header with signed payment envelope.",
    },
    {
      status: 402,
      headers: {
        "PAYMENT-REQUIRED": paymentRequiredHeader,
      },
    }
  );
}

/**
 * Middleware function to verify x402 payment in Next.js API routes
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const paymentResult = await verifyX402Payment(request, "POST /api/tokens/create");
 *   if (!paymentResult.isValid) {
 *     return paymentResult.response;
 *   }
 *   // Process request...
 * }
 * ```
 */
export async function verifyX402Payment(
  request: NextRequest,
  route: string
): Promise<{
  isValid: boolean;
  response?: NextResponse;
  payer?: string;
  envelope?: PaymentEnvelope;
  paymentResponseHeader?: string; // V2: PAYMENT-RESPONSE header value
}> {
  // Extract just the path if route includes method prefix (e.g., "POST /api/chat/image" -> "/api/chat/image")
  const routePath = route.includes(" ") ? route.split(" ")[1] : route;

  const routePrice = paymentRoutes[routePath as keyof typeof paymentRoutes];
  if (routePrice === undefined) {
    // Route not configured for payment, allow through
    console.log(`🔍 Route ${routePath} not configured for payment, allowing through`);
    return { isValid: true };
  }

  console.log(`💰 Route ${routePath} requires payment: $${routePrice}`);

  // Build route config from price
  const priceString = `$${routePrice}`;

  // Extract payment envelope
  const envelope = extractPaymentEnvelope(request);
  if (!envelope) {
    return {
      isValid: false,
      response: create402Response(route, priceString, x402Config.network),
    };
  }

  // Verify payment (use routePath, not route with method prefix)
  const verification = await verifyPayment(envelope, routePath, priceString);
  if (!verification.isValid) {
    return {
      isValid: false,
      response: NextResponse.json(
        {
          error: "Payment verification failed",
          reason: verification.invalidReason,
        },
        { status: 402 }
      ),
    };
  }

  // Settle payment
  const resourceUrl = getResourceUrl(routePath);
  console.log("💰 Attempting to settle payment...", { resourceUrl });
  const settlement = await settlePayment(envelope, resourceUrl);
  if (!settlement.success) {
    console.error("❌ Payment settlement failed:", settlement.error);

    // Provide helpful error messages for common issues
    let errorMessage = settlement.error || "Payment settlement failed";
    if (errorMessage.includes("sponsor wallet") || errorMessage.includes("No sponsor")) {
      errorMessage = "Payment settlement failed: No sponsor wallet configured for this payer. The facilitator requires a sponsor wallet to pay for gas fees. Please configure a sponsor wallet in the facilitator dashboard.";
    } else if (errorMessage.includes("authorization is used or canceled")) {
      // This error from USDC contract typically means:
      // 1. The nonce was already used (unlikely with fresh nonces)
      // 2. Transaction simulation detected an issue
      // 3. Possible RPC state inconsistency
      errorMessage = "Payment authorization failed. The transaction could not be processed. Please try signing a new payment. If this persists, check your USDC balance and try again in a few seconds.";
    } else if (errorMessage.includes("TRANSACTION_SIMULATION_FAILED")) {
      errorMessage = "Payment transaction simulation failed. Please try again in a few seconds.";
    }

    return {
      isValid: false,
      response: NextResponse.json(
        {
          error: "Payment settlement failed",
          reason: errorMessage,
          details: settlement.error,
        },
        { status: 402 }
      ),
    };
  }

  console.log("✅ Payment settled successfully:", {
    transactionHash: settlement.transactionHash,
    payer: verification.payer,
  });

  // V2: Return payment response in PAYMENT-RESPONSE header
  // Per spec: https://www.x402.org/writing/x402-v2-launch
  const paymentResponse = {
    success: true,
    transactionHash: settlement.transactionHash,
    network: envelope.network,
  };
  const paymentResponseHeader = Buffer.from(
    JSON.stringify(paymentResponse)
  ).toString("base64");

  return {
    isValid: true,
    payer: verification.payer,
    envelope,
    paymentResponseHeader, // Include for response headers
  };
}

