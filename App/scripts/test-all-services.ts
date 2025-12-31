/**
 * Comprehensive test for all 20 AI services
 * Usage: npm run test:all-services
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

if (!PRIVATE_KEY || !PRIVATE_KEY.startsWith("0x")) {
    console.error("❌ Invalid private key");
    process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const TEST_WALLET = account.address;

async function testService(endpoint: string, price: number, payload: any): Promise<boolean> {
    try {
        console.log(`\n🧪 Testing ${endpoint}`);

        const envelope = await signPaymentEnvelope({
            endpoint, method: "POST", price: `$${price}`,
            network: x402Config.network, payTo: x402Config.payTo,
            facilitator: x402Config.facilitatorUrl,
        }, PRIVATE_KEY as `0x${string}`);

        const paymentSignature = formatPaymentSignature(envelope, x402Config.network, true);
        const response = await fetch(`${SERVICE_URL}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "PAYMENT-SIGNATURE": paymentSignature,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
            console.error(`   ❌ FAILED (${response.status}):`, data.error);
            return false;
        }

        console.log(`   ✅ SUCCESS`);
        return true;
    } catch (error) {
        console.error(`   ❌ ERROR:`, error instanceof Error ? error.message : String(error));
        return false;
    }
}

async function main() {
    console.log("🚀 Testing All 20 AI Services");
    console.log("=".repeat(70));
    console.log(`Wallet: ${TEST_WALLET}\n`);

    const results: Record<string, boolean> = {};

    // Original 4
    results.analyze = await testService("/api/ai/analyze", aiServiceConfig.analyzePriceUsd, {
        image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        question: "What color is this?"
    });

    results.generate = await testService("/api/ai/generate", aiServiceConfig.generatePriceUsd, {
        prompt: "A sunset over mountains"
    });

    // NLP Services
    results.summarize = await testService("/api/ai/summarize", aiServiceConfig.summarizePriceUsd, {
        text: "Artificial intelligence is transforming industries. Machine learning enables computers to learn from data.",
        length: "short"
    });

    results.translate = await testService("/api/ai/translate", aiServiceConfig.translatePriceUsd, {
        text: "Hello, how are you?",
        sourceLang: "English",
        targetLang: "Spanish"
    });

    results.sentiment = await testService("/api/ai/sentiment", aiServiceConfig.sentimentPriceUsd, {
        text: "I love this product! It's amazing and works perfectly."
    });

    results.moderate = await testService("/api/ai/moderate", aiServiceConfig.moderatePriceUsd, {
        content: "This is a test of family-friendly content."
    });

    results.simplify = await testService("/api/ai/simplify", aiServiceConfig.simplifyPriceUsd, {
        text: "The ramifications of this unprecedented phenomenon are multifaceted.",
        readingLevel: "elementary"
    });

    results.extract = await testService("/api/ai/extract", aiServiceConfig.extractPriceUsd, {
        text: "Apple Inc. CEO Tim Cook announced new products on January 15, 2024 in Cupertino, California."
    });

    // Business Services
    results.email = await testService("/api/ai/email/generate", aiServiceConfig.emailGeneratePriceUsd, {
        purpose: "Follow up after meeting",
        tone: "formal",
        keyPoints: ["Thank them for their time", "Confirm next steps", "Request feedback"]
    });

    results.product = await testService("/api/ai/product/describe", aiServiceConfig.productDescribePriceUsd, {
        productName: "Smart Wireless Earbuds",
        features: ["Noise cancellation", "24-hour battery", "Water resistant"],
        targetAudience: "Active professionals"
    });

    results.seo = await testService("/api/ai/seo/optimize", aiServiceConfig.seoOptimizePriceUsd, {
        content: "Our company provides great services",
        keywords: ["cloud services", "enterprise solutions", "scalable infrastructure"]
    });

    // Developer Tools
    results.codeGen = await testService("/api/ai/code/generate", aiServiceConfig.codeGeneratePriceUsd, {
        description: "Function to calculate fibonacci sequence",
        language: "Python"
    });

    results.codeReview = await testService("/api/ai/code/review", aiServiceConfig.codeReviewPriceUsd, {
        code: "def add(a,b):\\n    return a+b",
        language: "Python"
    });

    results.sql = await testService("/api/ai/sql/generate", aiServiceConfig.sqlGeneratePriceUsd, {
        schema: "users (id, name, email, created_at)",
        query: "Find all users created in the last 7 days"
    });

    results.regex = await testService("/api/ai/regex/generate", aiServiceConfig.regexGeneratePriceUsd, {
        description: "Match email addresses"
    });

    results.docs = await testService("/api/ai/docs/generate", aiServiceConfig.docsGeneratePriceUsd, {
        code: "function getUserById(id: string) { return users.find(u => u.id === id); }",
        framework: "TypeScript"
    });

    // Advanced
    results.ocr = await testService("/api/ai/ocr", aiServiceConfig.ocrPriceUsd, {
        image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    });

    results.quiz = await testService("/api/ai/quiz/generate", aiServiceConfig.quizGeneratePriceUsd, {
        topic: "World Geography",
        numQuestions: 3,
        difficulty: "easy"
    });

    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("📊 TEST RESULTS");
    console.log("=".repeat(70));

    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;

    console.log(`\n✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);

    if (passed === total) {
        console.log("\n🎉 ALL TESTS PASSED!");
    } else {
        console.log("\n⚠️  Some tests failed. Check logs above.");
    }
}

main().catch(console.error);
