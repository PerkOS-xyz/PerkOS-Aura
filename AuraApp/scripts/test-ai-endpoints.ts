/**
 * Test script for AI endpoints with x402 payment
 * Usage: npx tsx scripts/test-ai-endpoints.ts
 * 
 * This script tests the /api/ai/generate endpoint with signed payment envelopes
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { privateKeyToAccount } from "viem/accounts";
import { signPaymentEnvelope } from "../lib/utils/sign-payment";
import { x402Config, aiServiceConfig } from "../lib/config/x402";
import { getPrivateKey } from "../lib/utils/foundry-keystore";
import { formatPaymentSignature } from "../lib/utils/x402-payment";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, "../.env") });

const SERVICE_URL = process.env.NEXT_PUBLIC_SERVICE_URL || "http://localhost:3000";
const walletName = process.env.FOUNDRY_KEYSTORE_NAME || "defaultKey";
const PRIVATE_KEY = getPrivateKey(walletName);

if (!PRIVATE_KEY) {
    console.error("❌ No private key found. Please set a private key in .env or keystore.");
    process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const TEST_WALLET = account.address;

console.log(`✅ Using wallet: ${TEST_WALLET}`);

async function testGenerateImage() {
    const url = `${SERVICE_URL}/api/ai/generate`;
    const network = process.argv[2] || x402Config.network;

    console.log("\n🎨 Testing Image Generation with x402 Payment");
    console.log("=".repeat(50));
    console.log(`   URL: ${url}`);
    console.log(`   Price: $${aiServiceConfig.generatePriceUsd}`);

    try {
        // Step 1: Get payment requirements (simulated 402 check or hardcoded for test)
        // For simplicity, we construct requirements based on config, mirroring how a client would via OPTIONS/402
        // But to be robust, let's just make the request and handle the 402

        console.log("\n📦 Step 1: Making initial request to get payment requirements...");
        const initialResponse = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: "A futuristic city on Mars" })
        });

        if (initialResponse.status !== 402) {
            console.log(`⚠️  Expected 402 Payment Required, got ${initialResponse.status}`);
            if (initialResponse.ok) {
                console.log("   ✅ Request succeeded without payment (is payment disabled?)");
                return;
            }
        }

        const initialData = await initialResponse.json().catch(() => ({}));
        const paymentRequiredHeader = initialResponse.headers.get("payment-required");

        let requirements;
        if (paymentRequiredHeader) {
            const decoded = Buffer.from(paymentRequiredHeader, "base64").toString("utf-8");
            const parsed = JSON.parse(decoded);
            const req = parsed.accepts[0];

            const maxAmount = BigInt(req.maxAmountRequired);
            const priceInUsd = Number(maxAmount) / 1_000_000;
            const priceString = `$${priceInUsd.toFixed(6).replace(/\.?0+$/, "")}`;

            requirements = {
                endpoint: req.resource,
                method: "POST",
                price: priceString,
                network: req.network,
                payTo: req.payTo,
                facilitator: x402Config.facilitatorUrl
            };
        } else {
            // Fallback logic if header missing (shouldn't happen with v2)
            console.error("❌ Missing Payment-Required header in 402 response");
            return;
        }

        console.log(`   ✅ Requirements received: ${requirements.price} on ${requirements.network}`);

        // Step 2: Sign envelope
        console.log("\n✍️  Step 2: Signing payment envelope...");

        // CAIP-2 to legacy conversion for signing util
        let networkForSigning = requirements.network;
        if (networkForSigning.includes(":")) {
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

        const signingRequirements = { ...requirements, network: networkForSigning };
        const envelope = await signPaymentEnvelope(signingRequirements, PRIVATE_KEY as `0x${string}`);

        // Step 3: Send request with payment
        console.log("\n🚀 Step 3: Sending request with payment...");
        const paymentSignature = formatPaymentSignature(envelope, network, true);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "PAYMENT-SIGNATURE": paymentSignature,
            },
            body: JSON.stringify({ prompt: "A futuristic city on Mars, high quality, 4k" })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`❌ Request failed: ${response.status}`);
            console.error(JSON.stringify(data, null, 2));
            return;
        }

        console.log("\n✅ Success!");
        console.log(`   Image URL: ${data.data.url}`);
        console.log(`   Revised Prompt: ${data.data.revisedPrompt}`);

    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

async function main() {
    await testGenerateImage();
    // We could add more tests here for other endpoints
}

main().catch(console.error);
