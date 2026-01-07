/**
 * Test script for AI audio transcription endpoint
 * Usage: npx tsx scripts/test-transcribe.ts [path/to/audio.mp3]
 * 
 * This script tests the /api/ai/transcribe endpoint with x402 payment
 * Note: Requires an audio file. If not provided, will create a test file.
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";
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

async function testTranscribe(audioPath?: string) {
    console.log("\n🧪 Testing AI Audio Transcription");
    console.log("=".repeat(60));
    console.log(`   URL: ${SERVICE_URL}/api/ai/transcribe`);
    console.log(`   Wallet: ${TEST_WALLET}`);
    console.log(`   Price: $${aiServiceConfig.transcribePriceUsd}`);

    // Check if audio file exists
    if (!audioPath) {
        console.log("\n⚠️  No audio file provided. Usage:");
        console.log("   npm run test:transcribe -- path/to/audio.mp3");
        console.log("\n💡 You can use the output from test:synthesize:");
        console.log("   npm run test:transcribe -- test-output.mp3");

        // Check if test-output.mp3 exists
        const testOutput = resolve(__dirname, "../test-output.mp3");
        if (existsSync(testOutput)) {
            console.log("\n✅ Found test-output.mp3, using that...");
            audioPath = testOutput;
        } else {
            console.log("\n❌ No test audio file found. Please provide an audio file.");
            return null;
        }
    }

    const fullPath = resolve(process.cwd(), audioPath);
    if (!existsSync(fullPath)) {
        console.error(`\n❌ Audio file not found: ${fullPath}`);
        return null;
    }

    console.log(`   Audio file: ${audioPath}`);

    try {
        // Step 1: Get payment requirements
        console.log("\n📋 Step 1: Getting payment requirements...");
        const reqResponse = await fetch(
            `${SERVICE_URL}/api/payment/requirements?endpoint=/api/ai/transcribe&method=POST`
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
                endpoint: "/api/ai/transcribe",
                method: "POST",
                price: `$${aiServiceConfig.transcribePriceUsd}`,
                network: x402Config.network,
                payTo: x402Config.payTo,
                facilitator: x402Config.facilitatorUrl,
            },
            PRIVATE_KEY as `0x${string}`
        );
        console.log("   ✅ Payment signed");

        // Step 3: Make request with payment
        console.log("\n🎙️  Step 3: Transcribing audio with Whisper...");
        const paymentSignature = formatPaymentSignature(envelope, x402Config.network, true);

        // Read audio file
        const audioBuffer = readFileSync(fullPath);

        // Create FormData
        const formData = new FormData();
        const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
        formData.append("file", audioBlob, "audio.mp3");

        const response = await fetch(`${SERVICE_URL}/api/ai/transcribe`, {
            method: "POST",
            headers: {
                "PAYMENT-SIGNATURE": paymentSignature,
                // Don't set Content-Type - let browser set it with boundary for multipart
            },
            body: formData,
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
        console.log(`   Transcription:`);
        console.log(`   "${data.data.transcription}"`);
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
        if (error instanceof Error && error.stack) {
            console.error(`   Stack: ${error.stack}`);
        }
        return null;
    }
}

async function main() {
    const audioPath = process.argv[2];
    await testTranscribe(audioPath);
    console.log("\n" + "=".repeat(60));
    console.log("✅ Test completed");
}

main().catch(console.error);
