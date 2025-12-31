/**
 * x402 Payment Configuration
 * Configures x402 v2 protocol settings for PerkOS Vendor API
 */

export interface PaymentConfig {
  payTo: `0x${string}`;
  facilitatorUrl: string;
  network: "base" | "base-sepolia" | "avalanche" | "avalanche-fuji" | "celo" | "celo-sepolia";
  priceUsd: string;
}

// Validate required environment variables
const requiredEnvVars = {
  PAY_TO_ADDRESS: process.env.NEXT_PUBLIC_PAY_TO_ADDRESS || process.env.PAYMENT_WALLET_ADDRESS,
  FACILITATOR_URL: process.env.FACILITATOR_URL || process.env.NEXT_PUBLIC_FACILITATOR_URL || "https://stack.perkos.xyz",
  NETWORK: process.env.NEXT_PUBLIC_NETWORK || "avalanche",
  PAYMENT_PRICE_USD: process.env.NEXT_PUBLIC_PAYMENT_PRICE_USD || "0.01",
};

// Check for missing required variables (only payTo is critical)
if (!requiredEnvVars.PAY_TO_ADDRESS) {
  console.warn("⚠️  PAY_TO_ADDRESS not set. Payment verification will fail.");
}

// Validate network
const validNetworks = ["base", "base-sepolia", "avalanche", "avalanche-fuji", "celo", "celo-sepolia"];
if (!validNetworks.includes(requiredEnvVars.NETWORK)) {
  console.warn(`⚠️  Invalid network: ${requiredEnvVars.NETWORK}. Valid: ${validNetworks.join(", ")}`);
}

// Export configuration
export const x402Config: PaymentConfig = {
  payTo: (requiredEnvVars.PAY_TO_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  facilitatorUrl: requiredEnvVars.FACILITATOR_URL,
  network: requiredEnvVars.NETWORK as PaymentConfig["network"],
  priceUsd: requiredEnvVars.PAYMENT_PRICE_USD,
};

// AI Service Pricing Configuration (ALL 20 SERVICES)
export const aiServiceConfig = {
  // Original 4 services
  analyzePriceUsd: 0.05,
  generatePriceUsd: 0.15,
  transcribePriceUsd: 0.04,
  synthesizePriceUsd: 0.04,
  // Batch 1: NLP Services
  summarizePriceUsd: 0.03,
  translatePriceUsd: 0.03,
  sentimentPriceUsd: 0.02,
  moderatePriceUsd: 0.01,
  // Batch 2: More NLP + Business
  simplifyPriceUsd: 0.02,
  extractPriceUsd: 0.03,
  emailGeneratePriceUsd: 0.02,
  productDescribePriceUsd: 0.03,
  // Batch 3: Developer Tools
  codeGeneratePriceUsd: 0.08,
  codeReviewPriceUsd: 0.05,
  sqlGeneratePriceUsd: 0.03,
  regexGeneratePriceUsd: 0.02,
  // Batch 4: Advanced
  seoOptimizePriceUsd: 0.05,
  quizGeneratePriceUsd: 0.05,
  docsGeneratePriceUsd: 0.05,
  ocrPriceUsd: 0.04,
};

// Service discovery configuration
export const serviceDiscovery = {
  service: "PerkOS AI Vendor Service",
  version: "2.0.0",
  description: "AI-powered services with x402 micropayments",
  capabilities: [
    "image-analysis",
    "image-generation",
    "audio-transcription",
    "text-to-speech",
    "text-summarization",
    "language-translation",
    "sentiment-analysis",
    "content-moderation",
    "text-simplification",
    "entity-extraction",
    "email-generation",
    "product-descriptions",
    "seo-optimization",
    "code-generation",
    "code-review",
    "sql-generation",
    "regex-generation",
    "api-documentation",
    "ocr",
    "quiz-generation"
  ],
};

// CAIP-2 Network Mappings (for x402 v2)
export const networkMappings: Record<string, string> = {
  "avalanche": "eip155:43114",
  "avalanche-fuji": "eip155:43113",
  "base": "eip155:8453",
  "base-sepolia": "eip155:84532",
  "celo": "eip155:42220",
  "celo-sepolia": "eip155:11142220",
};

// Get CAIP-2 network identifier
export function getCAIP2Network(network: string): string {
  return networkMappings[network] || network;
}

// USDC Contract Addresses by Network
export const usdcAddresses: Record<string, `0x${string}`> = {
  "avalanche": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  "avalanche-fuji": "0x5425890298aed601595a70AB815c96711a31Bc65",
  "base": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "celo": "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  "celo-sepolia": "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B"
};

// Payment route configurations (for middleware)
export const paymentRoutes = {
  "/api/ai/analyze": aiServiceConfig.analyzePriceUsd,
  "/api/ai/generate": aiServiceConfig.generatePriceUsd,
  "/api/ai/transcribe": aiServiceConfig.transcribePriceUsd,
  "/api/ai/synthesize": aiServiceConfig.synthesizePriceUsd,
  "/api/ai/summarize": aiServiceConfig.summarizePriceUsd,
  "/api/ai/translate": aiServiceConfig.translatePriceUsd,
  "/api/ai/sentiment": aiServiceConfig.sentimentPriceUsd,
  "/api/ai/moderate": aiServiceConfig.moderatePriceUsd,
  "/api/ai/simplify": aiServiceConfig.simplifyPriceUsd,
  "/api/ai/extract": aiServiceConfig.extractPriceUsd,
  "/api/ai/email/generate": aiServiceConfig.emailGeneratePriceUsd,
  "/api/ai/product/describe": aiServiceConfig.productDescribePriceUsd,
  "/api/ai/seo/optimize": aiServiceConfig.seoOptimizePriceUsd,
  "/api/ai/code/generate": aiServiceConfig.codeGeneratePriceUsd,
  "/api/ai/code/review": aiServiceConfig.codeReviewPriceUsd,
  "/api/ai/sql/generate": aiServiceConfig.sqlGeneratePriceUsd,
  "/api/ai/regex/generate": aiServiceConfig.regexGeneratePriceUsd,
  "/api/ai/docs/generate": aiServiceConfig.docsGeneratePriceUsd,
  "/api/ai/ocr": aiServiceConfig.ocrPriceUsd,
  "/api/ai/quiz/generate": aiServiceConfig.quizGeneratePriceUsd,
};
