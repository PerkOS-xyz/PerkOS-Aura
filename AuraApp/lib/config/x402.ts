/**
 * x402 Payment Configuration
 * Configures x402 v2 protocol settings for PerkOS Vendor API
 */

export type NetworkName = "base" | "base-sepolia" | "avalanche" | "avalanche-fuji" | "celo" | "celo-sepolia" | "ethereum";

export interface PaymentConfig {
  payTo: `0x${string}`;
  facilitatorUrl: string;
  network: NetworkName;
  priceUsd: string;
}

// Supported networks for multi-chain payments
// Order determines default selection (first = default)
export const SUPPORTED_NETWORKS: NetworkName[] = (
  process.env.NEXT_PUBLIC_SUPPORTED_NETWORKS?.split(",") as NetworkName[] ||
  ["avalanche", "base", "celo", "ethereum"]
).filter(Boolean) as NetworkName[];

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
const validNetworks = ["base", "base-sepolia", "avalanche", "avalanche-fuji", "celo", "celo-sepolia", "ethereum"];
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

// Helper to parse price from env with fallback
const parsePrice = (envVar: string | undefined, fallback: number): number => {
  if (!envVar) return fallback;
  const parsed = parseFloat(envVar);
  return isNaN(parsed) ? fallback : parsed;
};

// AI Service Pricing Configuration (ALL 20 SERVICES)
// All prices configurable via environment variables with sensible defaults
export const aiServiceConfig = {
  // Vision & Audio Services
  analyzePriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_ANALYZE_PRICE_USD, 0.05),
  generatePriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_GENERATE_PRICE_USD, 0.15),
  transcribePriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_TRANSCRIBE_PRICE_USD, 0.04),
  synthesizePriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_SYNTHESIZE_PRICE_USD, 0.04),
  // NLP Services
  summarizePriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_SUMMARIZE_PRICE_USD, 0.03),
  translatePriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_TRANSLATE_PRICE_USD, 0.03),
  sentimentPriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_SENTIMENT_PRICE_USD, 0.02),
  moderatePriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_MODERATE_PRICE_USD, 0.01),
  simplifyPriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_SIMPLIFY_PRICE_USD, 0.02),
  extractPriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_EXTRACT_PRICE_USD, 0.03),
  // Business Tools
  emailGeneratePriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_EMAIL_GENERATE_PRICE_USD, 0.02),
  productDescribePriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_PRODUCT_DESCRIBE_PRICE_USD, 0.03),
  seoOptimizePriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_SEO_OPTIMIZE_PRICE_USD, 0.05),
  // Developer Tools
  codeGeneratePriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_CODE_GENERATE_PRICE_USD, 0.08),
  codeReviewPriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_CODE_REVIEW_PRICE_USD, 0.05),
  sqlGeneratePriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_SQL_GENERATE_PRICE_USD, 0.03),
  regexGeneratePriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_REGEX_GENERATE_PRICE_USD, 0.02),
  docsGeneratePriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_DOCS_GENERATE_PRICE_USD, 0.05),
  // Advanced Services
  ocrPriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_OCR_PRICE_USD, 0.04),
  quizGeneratePriceUsd: parsePrice(process.env.NEXT_PUBLIC_AI_QUIZ_GENERATE_PRICE_USD, 0.05),
};

// Service discovery configuration
export const serviceDiscovery = {
  service: "Aura",
  version: "2.0.0",
  description: "Aura - Intelligent AI Vendor Service with 20 endpoints powered by GPT-4o, FLUX, and Whisper. x402 v2 micropayments.",
  iconUrl: process.env.NEXT_PUBLIC_SERVICE_ICON_URL || "https://aura.perkos.xyz/aura-logo.png",
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
  "ethereum": "eip155:1",
};

// Get CAIP-2 network identifier
export function getCAIP2Network(network: string): string {
  return networkMappings[network] || network;
}

// USDC Contract Addresses by Network (Circle native USDC)
export const usdcAddresses: Record<string, `0x${string}`> = {
  "avalanche": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",    // Circle native USDC
  "avalanche-fuji": "0x5425890298aed601595a70AB815c96711a31Bc65",
  "base": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",         // Circle native USDC
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "celo": "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",         // Circle native USDC
  "celo-sepolia": "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B",
  "ethereum": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",     // Circle native USDC
};

// Network display names for UI
export const networkDisplayNames: Record<string, string> = {
  "avalanche": "Avalanche",
  "avalanche-fuji": "Avalanche Fuji",
  "base": "Base",
  "base-sepolia": "Base Sepolia",
  "celo": "Celo",
  "celo-sepolia": "Celo Sepolia",
  "ethereum": "Ethereum",
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
  // Chat Integration
  "/api/chat/image": aiServiceConfig.analyzePriceUsd,
  "/api/chat/audio": aiServiceConfig.transcribePriceUsd,
};
