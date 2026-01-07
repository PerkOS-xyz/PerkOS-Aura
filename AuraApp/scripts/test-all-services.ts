/**
 * Comprehensive test for all 20 AI services
 * Usage: npm run test:all-services
 *
 * Tests all 20 AI endpoints with x402 payment:
 * - Vision & Audio: analyze, generate, transcribe, synthesize
 * - NLP: summarize, translate, sentiment, moderate, simplify, extract
 * - Business: email/generate, product/describe, seo/optimize
 * - Developer: code/generate, code/review, sql/generate, regex/generate, docs/generate
 * - Advanced: ocr, quiz/generate
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { privateKeyToAccount } from "viem/accounts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env FIRST before accessing any env-dependent modules
config({ path: resolve(__dirname, "../.env") });

// We need to use a bootstrap function since we can't use top-level await
// and we need env vars loaded before importing config modules
async function bootstrap() {
    // Dynamic imports for modules that read env vars at load time
    const { signPaymentEnvelope } = await import("../lib/utils/sign-payment");
    const { x402Config, aiServiceConfig } = await import("../lib/config/x402");
    const { getPrivateKey } = await import("../lib/utils/foundry-keystore");
    const { formatPaymentSignature } = await import("../lib/utils/x402-payment");

    const SERVICE_URL = process.env.NEXT_PUBLIC_SERVICE_URL || "http://localhost:3000";
    const walletName = process.env.FOUNDRY_KEYSTORE_NAME || "defaultKey";
    const PRIVATE_KEY = getPrivateKey(walletName);

    if (!PRIVATE_KEY || !PRIVATE_KEY.startsWith("0x")) {
        console.error("❌ Invalid private key");
        process.exit(1);
    }

    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    const TEST_WALLET = account.address;

// Special test for synthesize (returns binary audio)
async function testSynthesizeService(): Promise<boolean> {
    const endpoint = "/api/ai/synthesize";
    try {
        console.log(`\n🧪 Testing ${endpoint} (audio response)`);

        const envelope = await signPaymentEnvelope({
            endpoint, method: "POST", price: `$${aiServiceConfig.synthesizePriceUsd}`,
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
            body: JSON.stringify({ text: "Hello, this is a test.", voice: "alloy" }),
        });

        if (!response.ok) {
            const data = await response.json();
            console.error(`   ❌ FAILED (${response.status}):`, data.error);
            return false;
        }

        // Synthesize returns audio buffer, not JSON
        const audioBuffer = await response.arrayBuffer();
        if (audioBuffer.byteLength > 0) {
            console.log(`   ✅ SUCCESS (${audioBuffer.byteLength} bytes audio)`);
            return true;
        }
        console.error(`   ❌ FAILED: Empty audio response`);
        return false;
    } catch (error) {
        console.error(`   ❌ ERROR:`, error instanceof Error ? error.message : String(error));
        return false;
    }
}

// Special test for transcribe (requires FormData with audio file)
async function testTranscribeService(): Promise<boolean> {
    const endpoint = "/api/ai/transcribe";
    try {
        console.log(`\n🧪 Testing ${endpoint} (FormData upload)`);

        const envelope = await signPaymentEnvelope({
            endpoint, method: "POST", price: `$${aiServiceConfig.transcribePriceUsd}`,
            network: x402Config.network, payTo: x402Config.payTo,
            facilitator: x402Config.facilitatorUrl,
        }, PRIVATE_KEY as `0x${string}`);

        const paymentSignature = formatPaymentSignature(envelope, x402Config.network, true);

        // Create a proper WAV file with a short sine wave (more reliable for transcription)
        // WAV header + minimal audio data
        const sampleRate = 16000;
        const duration = 0.5; // 0.5 second
        const numSamples = Math.floor(sampleRate * duration);
        const dataSize = numSamples * 2; // 16-bit samples
        const fileSize = 44 + dataSize;

        const wavBuffer = new ArrayBuffer(fileSize);
        const view = new DataView(wavBuffer);

        // RIFF header
        const writeString = (offset: number, str: string) => {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };
        writeString(0, 'RIFF');
        view.setUint32(4, fileSize - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true); // fmt chunk size
        view.setUint16(20, 1, true); // PCM format
        view.setUint16(22, 1, true); // mono
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true); // byte rate
        view.setUint16(32, 2, true); // block align
        view.setUint16(34, 16, true); // bits per sample
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);

        // Generate a simple 440Hz sine wave (A note)
        for (let i = 0; i < numSamples; i++) {
            const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 16000;
            view.setInt16(44 + i * 2, sample, true);
        }

        const formData = new FormData();
        const audioBlob = new Blob([wavBuffer], { type: "audio/wav" });
        formData.append("file", audioBlob, "test-audio.wav");

        const response = await fetch(`${SERVICE_URL}${endpoint}`, {
            method: "POST",
            headers: {
                "PAYMENT-SIGNATURE": paymentSignature,
                // Note: Don't set Content-Type - let browser set it with boundary
            },
            body: formData,
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

    // Audio Services (special handling)
    results.synthesize = await testSynthesizeService();
    results.transcribe = await testTranscribeService();

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

    // Run main inside bootstrap
    await main();
}

// Execute bootstrap
bootstrap().catch(console.error);
