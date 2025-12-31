/**
 * Test script for AI text-to-speech endpoint
 * Usage: npx tsx scripts/test-synthesize.ts "Text to speak"
 * 
 * This script tests the /api/ai/synthesize endpoint with x402 payment
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { writeFileSync } from "fs";
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

async function testSynthesize(text: string) {
    console.log("\n🧪 Testing AI Text-to-Speech");
    console.log("=".repeat(60));
    console.log(`   URL: ${SERVICE_URL}/api/ai/synthesize`);
    console.log(`   Wallet: ${TEST_WALLET}`);
    console.log(`   Price: $${aiServiceConfig.synthesizePriceUsd}`);
    console.log(`   Text: "${text}"`);

    try {
        // Step 1: Get payment requirements
        console.log("\n📋 Step 1: Getting payment requirements...");
        const reqResponse = await fetch(
            `${SERVICE_URL}/api/payment/requirements?endpoint=/api/ai/synthesize&method=POST`
        );
        const reqData = await reqResponse.json();

        if (!reqData.accepts?.[0]) {
            throw new Error("No payment requirements returned");
        }

        console.log("   ✅ Payment requirements received");

        // Step 2: Sign payment envelope
        console.log("\n✍️  Step 2: Signing payment envelope...");
        const envelope = await signPaymentEnvelope(
            {
                endpoint: "/api/ai/synthesize",
                method: "POST",
                price: `$${aiServiceConfig.synthesizePriceUsd}`,
                network: x402Config.network,
                payTo: x402Config.payTo,
                facilitator: x402Config.facilitatorUrl,
            },
            PRIVATE_KEY as `0x${string}`
        );
        console.log("   ✅ Payment signed");

        // Step 3: Make request with payment
        console.log("\n🔊 Step 3: Synthesizing speech...");
        const paymentSignature = formatPaymentSignature(envelope, x402Config.network, true);

        const response = await fetch(`${SERVICE_URL}/api/ai/synthesize`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "PAYMENT-SIGNATURE": paymentSignature,
            },
            body: JSON.stringify({
                text,
                voice: "alloy",
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("\n❌ Error response:");
            console.error(`   Status: ${response.status}`);
            console.error(`   Error: ${JSON.stringify(errorData, null, 2)}`);
            return null;
        }

        // Get audio buffer
        const audioBuffer = await response.arrayBuffer();
        const audioData = Buffer.from(audioBuffer);

        console.log("\n✅ Success!");
        console.log("=".repeat(60));
        console.log(`   Audio size: ${audioData.length} bytes`);
        console.log(`   Content-Type: ${response.headers.get("content-type")}`);

        // Save audio file
        const outputPath = resolve(__dirname, "../test-output.mp3");
        writeFileSync(outputPath, audioData);
        console.log(`   Saved to: ${outputPath}`);
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

        return { audioData, outputPath };
    } catch (error) {
        console.error("\n❌ Request failed:");
        console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

async function main() {
    const text = process.argv[2] || "Hello, this is a test of the text to speech system.";
    await testSynthesize(text);
    console.log("\n" + "=".repeat(60));
    console.log("✅ Test completed");
    console.log("\n💡 Play the audio file:");
    console.log("   afplay test-output.mp3  # macOS");
    console.log("   mpg123 test-output.mp3  # Linux");
}

main().catch(console.error);
