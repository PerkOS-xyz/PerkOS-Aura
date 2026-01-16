/**
 * GET /api/payment/requirements
 * Get payment requirements for a specific endpoint (x402 v2 compliant)
 * Per spec: https://github.com/coinbase/x402/tree/v2-development
 */

import { NextRequest, NextResponse } from "next/server";
import { paymentRoutes, x402Config, SUPPORTED_NETWORKS, usdcAddresses, getCAIP2Network, getResourceUrl } from "@/lib/config/x402";
import { parsePriceToUSDC, getTokenName, getDomainVersion } from "@/lib/utils/x402-payment";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");
    const method = searchParams.get("method") || "POST";

    if (!endpoint) {
      return NextResponse.json(
        { error: "endpoint parameter is required" },
        { status: 400 }
      );
    }

    const route = `${method} ${endpoint}`;

    // Get route config from paymentRoutes
    const routePrice = paymentRoutes[endpoint as keyof typeof paymentRoutes];
    if (!routePrice) {
      return NextResponse.json(
        {
          x402Version: 2,
          accepts: [],
          error: "Payment not required for this endpoint",
        },
        { status: 200 }
      );
    }

    // Parse price to atomic units (same for all networks)
    const priceStr = `$${routePrice}`;
    const priceAmount = parsePriceToUSDC(priceStr);
    const description = `Payment for ${endpoint}`;

    // Build accepts array for all supported networks
    // Each network may have different EIP-712 domain parameters:
    // - Token name: Celo uses "USDC", others use "USD Coin"
    // - Version: Celo uses "1", others use "2"
    const accepts = SUPPORTED_NETWORKS.map((network) => {
      const usdcAddress = usdcAddresses[network];
      const caip2Network = getCAIP2Network(network);
      // Use network-specific token name and version for EIP-712 domain
      const tokenName = getTokenName(network);
      const tokenVersion = getDomainVersion(network);

      return {
        scheme: "exact",
        network: caip2Network,
        maxAmountRequired: priceAmount.toString(),
        resource: getResourceUrl(endpoint), // Full URL of resource (per x402 v2 spec)
        description,
        mimeType: "application/json",
        payTo: x402Config.payTo,
        maxTimeoutSeconds: 30,
        asset: usdcAddress,
        extra: {
          // Token name and version for EIP-712 domain construction
          // Client and facilitator use this to sign/verify correctly
          name: tokenName,
          version: tokenVersion,
          // Include legacy network name for easier client handling
          networkName: network,
        },
      };
    });

    // Return x402 v2 compliant payment requirements with all supported networks
    return NextResponse.json({
      x402Version: 2,
      accepts,
      // Include default network for backwards compatibility
      defaultNetwork: x402Config.network,
    });
  } catch (error) {
    console.error("Payment requirements error:", error);
    return NextResponse.json(
      {
        x402Version: 2,
        accepts: [],
        error: error instanceof Error ? error.message : "Failed to get payment requirements",
      },
      { status: 500 }
    );
  }
}

