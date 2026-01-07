/**
 * Test script for balance check endpoint with x402 payment
 * Usage: npx tsx scripts/test-balance-payment.ts
 * 
 * NOTE: This is a LEGACY test from Token Service.
 * Tests the /api/balance/check utility endpoint (USDC balance checker).
 * Primary AI endpoint tests are in test-ai-endpoints.ts
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { privateKeyToAccount } from "viem/accounts";
import { signPaymentEnvelope } from "../lib/utils/sign-payment";
import { x402Config } from "../lib/config/x402";
import { getPrivateKey } from "../lib/utils/foundry-keystore";
import { formatPaymentSignature } from "../lib/utils/x402-payment";

// Debug: Log config values
console.log("🔍 x402Config values:");
console.log(`   payTo: ${x402Config.payTo}`);
console.log(`   network: ${x402Config.network}`);
console.log(`   facilitatorUrl: ${x402Config.facilitatorUrl}`);

// Get __dirname equivalent for ES modules (tsx uses ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, "../.env") });

const SERVICE_URL = process.env.NEXT_PUBLIC_SERVICE_URL || "http://localhost:3000";
// Use FOUNDRY_KEYSTORE_NAME from env, or default to "defaultKey"
const walletName = process.env.FOUNDRY_KEYSTORE_NAME || "defaultKey";
const PRIVATE_KEY = getPrivateKey(walletName);

if (!PRIVATE_KEY) {
  console.error("❌ No private key found");
  console.error("Please set one of:");
  console.error("  - Foundry keystore (recommended): cast wallet import <name> --interactive");
  console.error("    Then set FOUNDRY_KEYSTORE_PASSWORD and FOUNDRY_KEYSTORE_NAME in .env");
  console.error("  - macOS Keychain: npm run keychain:store 0xYourPrivateKey");
  console.error("  - TEST_PRIVATE_KEY_ENCRYPTED (encrypted, requires ENCRYPTION_PASSWORD)");
  console.error("  - TEST_PRIVATE_KEY (plain text, must start with 0x)");
  process.exit(1);
}

if (!PRIVATE_KEY.startsWith("0x")) {
  console.error("❌ Private key must start with 0x");
  process.exit(1);
}

// Validate private key format
if (!PRIVATE_KEY || !PRIVATE_KEY.startsWith("0x") || PRIVATE_KEY.length !== 66) {
  console.error("❌ Invalid private key format");
  console.error(`   Length: ${PRIVATE_KEY?.length || 0}`);
  console.error(`   Starts with 0x: ${PRIVATE_KEY?.startsWith("0x") || false}`);
  process.exit(1);
}

// Derive wallet address from private key
const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const TEST_WALLET = account.address;

console.log(`✅ Using wallet: ${TEST_WALLET}`);
console.log(`   Keystore: ${walletName}`);

async function testBalanceCheck() {
  const url = `${SERVICE_URL}/api/balance/check`;
  const network = process.argv[2] || x402Config.network;

  console.log("\n📤 Testing Balance Check with x402 Payment");
  console.log("=".repeat(50));
  console.log(`   URL: ${url}`);
  console.log(`   Wallet: ${TEST_WALLET}`);
  console.log(`   Network: ${network}`);
  console.log(`   Price: $0.001`); // Legacy test - USDC balance check

  try {
    // Step 1: Get payment requirements
    console.log("\n📋 Step 1: Getting payment requirements...");
    const requirementsResponse = await fetch(`${SERVICE_URL}/api/payment/requirements?endpoint=/api/balance/check&method=GET`);

    const responseData = await requirementsResponse.json();
    let requirements;

    // x402 v2 format: response has `accepts` array with payment requirements
    if (responseData.accepts && Array.isArray(responseData.accepts) && responseData.accepts.length > 0) {
      // V2 format: Get first payment option from accepts array
      const paymentReq = responseData.accepts[0];

      // Convert maxAmountRequired back to price format for compatibility
      // maxAmountRequired is in atomic units (e.g., "1000" for $0.001 USDC with 6 decimals)
      const maxAmount = BigInt(paymentReq.maxAmountRequired || "1000");
      const priceInUsd = Number(maxAmount) / 1_000_000; // USDC has 6 decimals
      const priceString = `$${priceInUsd.toFixed(6).replace(/\.?0+$/, "")}`;

      requirements = {
        endpoint: paymentReq.resource || "/api/balance/check",
        method: "GET",
        price: priceString,
        network: paymentReq.network || network, // CAIP-2 format (e.g., "eip155:43114")
        payTo: paymentReq.payTo,
        facilitator: "https://stack.perkos.xyz", // Not in payment requirements, use default
      };
    } else if (requirementsResponse.status === 402) {
      // Fallback: Parse 402 response (V1 format)
      requirements = {
        endpoint: "/api/balance/check",
        method: "GET",
        price: responseData.payment?.price || responseData.requirements?.price || "$0.001",
        network: responseData.payment?.network || responseData.requirements?.network || network,
        payTo: responseData.payment?.payTo || responseData.requirements?.payTo,
        facilitator: responseData.payment?.facilitator || responseData.requirements?.facilitator || "https://stack.perkos.xyz",
      };
    } else if (responseData.requirements) {
      // Fallback: Normal response with nested requirements
      requirements = {
        endpoint: responseData.requirements.endpoint || "/api/balance/check",
        method: responseData.requirements.method || "GET",
        price: responseData.requirements.price || "$0.001",
        network: responseData.requirements.network || network,
        payTo: responseData.requirements.payTo,
        facilitator: responseData.requirements.facilitator || "https://stack.perkos.xyz",
      };
    } else {
      // Fallback: Flat structure
      requirements = {
        endpoint: responseData.endpoint || "/api/balance/check",
        method: responseData.method || "GET",
        price: responseData.price || "$0.001",
        network: responseData.network || network,
        payTo: responseData.payTo,
        facilitator: responseData.facilitator || "https://stack.perkos.xyz",
      };
    }

    // Ensure price is a string
    if (typeof requirements.price !== "string") {
      requirements.price = `$${requirements.price}`;
    }

    // Ensure payTo is set (required for signing)
    if (!requirements.payTo || requirements.payTo === "0x0000000000000000000000000000000000000000") {
      console.error("❌ payTo address is missing from requirements");
      console.error("   Response data:", JSON.stringify(responseData, null, 2));
      console.error("   Check that NEXT_PUBLIC_PAY_TO_ADDRESS or PAYMENT_WALLET_ADDRESS is set in .env");
      console.error("   Current x402Config.payTo:", x402Config.payTo);
      return null;
    }

    // Convert CAIP-2 network format back to legacy format for signing
    // The payment envelope uses legacy format, but requirements use CAIP-2
    let networkForSigning = requirements.network;
    if (networkForSigning.includes(":")) {
      // CAIP-2 format (eip155:43114) - convert to legacy (avalanche)
      const caip2ToLegacy: Record<string, string> = {
        "eip155:43114": "avalanche",
        "eip155:43113": "avalanche-fuji",
        "eip155:8453": "base",
        "eip155:84532": "base-sepolia",
        "eip155:42220": "celo",
        "eip155:11142220": "celo-sepolia",
      };
      networkForSigning = caip2ToLegacy[networkForSigning] || network;
    }

    console.log(`   ✅ Requirements: ${JSON.stringify(requirements, null, 2)}`);

    // Step 2: Sign payment envelope
    console.log("\n✍️  Step 2: Signing payment envelope...");
    // Use legacy network format for signing (signPaymentEnvelope expects legacy format)
    const signingRequirements = {
      ...requirements,
      network: networkForSigning, // Use converted network format
    };
    const envelope = await signPaymentEnvelope(
      signingRequirements,
      PRIVATE_KEY as `0x${string}`
    );
    console.log(`   ✅ Signed envelope: ${JSON.stringify(envelope, null, 2)}`);

    // Step 3: Make request with payment (x402 v2: use PAYMENT-SIGNATURE header)
    console.log("\n💳 Step 3: Making request with signed payment...");
    const paymentSignature = formatPaymentSignature(envelope, network, true);
    console.log(`   Using PAYMENT-SIGNATURE header (x402 v2)`);

    const response = await fetch(`${url}?walletAddress=${TEST_WALLET}&network=${network}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-SIGNATURE": paymentSignature, // x402 v2 header (replaces X-Payment)
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("\n❌ Error response:");
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${JSON.stringify(data, null, 2)}`);
      return null;
    }

    // Check for PAYMENT-RESPONSE header (x402 v2)
    const paymentResponseHeader = response.headers.get("payment-response");
    let paymentInfo = null;
    if (paymentResponseHeader) {
      try {
        const decoded = Buffer.from(paymentResponseHeader, "base64").toString("utf-8");
        paymentInfo = JSON.parse(decoded);
      } catch (e) {
        // If base64 decode fails, try direct JSON parse
        try {
          paymentInfo = JSON.parse(paymentResponseHeader);
        } catch (e2) {
          // Ignore parsing errors
        }
      }
    }

    console.log("\n✅ Success response:");
    console.log("   " + "=".repeat(48));
    console.log(`   💰 USDC Balance Information:`);
    console.log("   " + "-".repeat(48));
    console.log(`   Wallet Address: ${data.walletAddress}`);
    console.log(`   Network: ${data.network}`);
    console.log(`   Balance: ${data.balance} USDC`);
    console.log(`   Balance (raw): ${data.balanceRaw} (atomic units)`);
    console.log(`   Required: ${data.required} USDC`);
    console.log(`   Has Enough: ${data.hasEnough ? "✅ Yes" : "❌ No"}`);

    // Display payment transaction info if available
    if (paymentInfo?.transactionHash) {
      console.log("   " + "-".repeat(48));
      console.log(`   💳 Payment Transaction:`);
      console.log(`   Transaction Hash: ${paymentInfo.transactionHash}`);
      if (paymentInfo.network) {
        console.log(`   Network: ${paymentInfo.network}`);
      }
      if (paymentInfo.payer) {
        console.log(`   Payer: ${paymentInfo.payer}`);
      }
    }

    console.log("   " + "=".repeat(48));

    // Also show full JSON for debugging
    console.log("\n   Full response (JSON):");
    console.log(`   ${JSON.stringify(data, null, 2)}`);

    return data;
  } catch (error) {
    console.error("\n❌ Request failed:");
    if (error instanceof Error) {
      if (error.message.includes("fetch failed") || error.message.includes("ECONNREFUSED")) {
        console.error(`   Error: Cannot connect to ${url}`);
        console.error(`   Make sure the server is running: npm run dev`);
      } else {
        console.error(`   Error: ${error.message}`);
        console.error(error.stack);
      }
    } else {
      console.error(`   Error: ${String(error)}`);
    }
    return null;
  }
}

async function main() {
  await testBalanceCheck();
  console.log("\n" + "=".repeat(50));
  console.log("✅ Test completed");
}

main().catch(console.error);

