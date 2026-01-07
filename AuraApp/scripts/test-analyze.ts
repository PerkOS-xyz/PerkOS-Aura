/**
 * Test script for AI image analysis endpoint
 * Usage: npx tsx scripts/test-analyze.ts
 * 
 * This script tests the /api/ai/analyze endpoint with x402 payment
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { privateKeyToAccount } from "viem/accounts";
import { signPaymentEnvelope } from "../lib/utils/sign-payment";
import { x402Config, aiServiceConfig } from "../lib/config/x402";
import { getPrivateKey } from "../lib/utils/foundry-keystore";
import { formatPaymentSignature } from "../lib/utils/x402-payment";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, "../.env") });

const SERVICE_URL = process.env.NEXT_PUBLIC_SERVICE_URL || "http://localhost:3000";
const walletName = process.env.FOUNDRY_KEYSTORE_NAME || "defaultKey";
const PRIVATE_KEY = getPrivateKey(walletName);

if (!PRIVATE_KEY?.startsWith("0x") || PRIVATE_KEY.length !== 66) {
    console.error("❌ Invalid private key. Please configure wallet access.");
    process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const TEST_WALLET = account.address;

// Simple test image (1x1 red pixel PNG in base64)
const TEST_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

async function testAnalyze() {
    console.log("\n🧪 Testing AI Image Analysis");
    console.log("=".repeat(60));
    console.log(`   URL: ${SERVICE_URL}/api/ai/analyze`);
    console.log(`   Wallet: ${TEST_WALLET}`);
    console.log(`   Price: $${aiServiceConfig.analyzePriceUsd}`);

    try {
        // Step 1: Get payment requirements
        console.log("\n📋 Step 1: Getting payment requirements...");
        const reqResponse = await fetch(
            `${SERVICE_URL}/api/payment/requirements?endpoint=/api/ai/analyze&method=POST`
        );
        const reqData = await reqResponse.json();

        if (!reqData.accepts?.[0]) {
            throw new Error("No payment requirements returned");
        }

        const paymentReq = reqData.accepts[0];
        console.log(`   ✅ Price: $${(Number(paymentReq.maxAmountRequired) / 1_000_000).toFixed(2)}`);
        console.log(`   Network: ${paymentReq.network}`);

        // Step 2: Sign payment envelope
        console.log("\n✍️  Step 2: Signing payment envelope...");
        const envelope = await signPaymentEnvelope(
            {
                endpoint: "/api/ai/analyze",
                method: "POST",
                price: `$${aiServiceConfig.analyzePriceUsd}`,
                network: x402Config.network,
                payTo: x402Config.payTo,
                facilitator: x402Config.facilitatorUrl,
            },
            PRIVATE_KEY as `0x${string}`
        );
        console.log("   ✅ Payment signed");

        // Step 3: Make request with payment
        console.log("\n💳 Step 3: Analyzing image with GPT-4o...");
        const paymentSignature = formatPaymentSignature(envelope, x402Config.network, true);

        const response = await fetch(`${SERVICE_URL}/api/ai/analyze`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "PAYMENT-SIGNATURE": paymentSignature,
            },
            body: JSON.stringify({
                image: TEST_IMAGE,
                question: "What color is this image?",
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("\n❌ Error response:");
            console.error(`   Status: ${response.status}`);
            console.error(`   Error: ${JSON.stringify(data, null, 2)}`);
            return null;
        }

        console.log("\n✅ Success!");
        console.log("=".repeat(60));
        console.log(`   Analysis: ${data.data.analysis}`);
        console.log("=".repeat(60));

        const paymentResponse = response.headers.get("payment-response");
        if (paymentResponse) {
            try {
                const decoded = Buffer.from(paymentResponse, "base64").toString("utf-8");
                const paymentInfo = JSON.parse(decoded);
                console.log(`\n💸 Payment processed:`);
                console.log(`   TX Hash: ${paymentInfo.transactionHash || "N/A"}`);
            } catch (e) {
                // Ignore parsing errors
            }
        }

        return data;
    } catch (error) {
        console.error("\n❌ Request failed:");
        console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

async function main() {
    await testAnalyze();
    console.log("\n" + "=".repeat(60));
    console.log("✅ Test completed");
}

main().catch(console.error);
