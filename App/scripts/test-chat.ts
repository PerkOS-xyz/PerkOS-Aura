/**
 * Test script for chat endpoint
 * Usage: npx tsx scripts/test-chat.ts "Your message here"
 * 
 * This script tests the /api/chat endpoint with a wallet address from .env
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { privateKeyToAccount } from "viem/accounts";
import { getPrivateKey } from "../lib/utils/foundry-keystore";

// Get __dirname equivalent for ES modules (tsx uses ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, "../.env") });

const SERVICE_URL = process.env.NEXT_PUBLIC_SERVICE_URL || "http://localhost:3000";
// For chat testing, we can use a wallet address directly or derive from private key
// Priority: Foundry keystore > Keychain > Encrypted > Plain text > Wallet address
// Use FOUNDRY_KEYSTORE_NAME from env, or default to "defaultKey"
const walletName = process.env.FOUNDRY_KEYSTORE_NAME || "defaultKey";
const PRIVATE_KEY = getPrivateKey(walletName);
let TEST_WALLET = "";

if (PRIVATE_KEY && PRIVATE_KEY.startsWith("0x")) {
  // Derive wallet address from private key
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  TEST_WALLET = account.address;
} else {
  // Fallback to explicit wallet address
  TEST_WALLET = process.env.TEST_WALLET_ADDRESS || process.env.ADMIN_WALLETS?.split(",")[0] || "";
}

if (!TEST_WALLET) {
  console.error("❌ No wallet address found. Please set one of:");
  console.error("   - Foundry keystore (recommended): cast wallet import <name> --interactive");
  console.error("     Then set FOUNDRY_KEYSTORE_PASSWORD and FOUNDRY_KEYSTORE_NAME in .env");
  console.error("   - macOS Keychain: npm run keychain:store 0xYourPrivateKey");
  console.error("   - TEST_PRIVATE_KEY_ENCRYPTED (encrypted, requires ENCRYPTION_PASSWORD)");
  console.error("   - TEST_PRIVATE_KEY (plain text)");
  console.error("   - TEST_WALLET_ADDRESS");
  console.error("   - ADMIN_WALLETS (first address will be used)");
  process.exit(1);
}

async function testChat(message: string, conversationId?: string) {
  const url = `${SERVICE_URL}/api/chat`;
  
  console.log("\n📤 Sending chat request...");
  console.log(`   URL: ${url}`);
  console.log(`   Wallet: ${TEST_WALLET}`);
  console.log(`   Message: "${message}"`);
  if (conversationId) {
    console.log(`   Conversation ID: ${conversationId}`);
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        walletAddress: TEST_WALLET,
        conversationId: conversationId || null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("\n❌ Error response:");
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${JSON.stringify(data, null, 2)}`);
      return null;
    }

    console.log("\n✅ Success response:");
    console.log(`   Conversation ID: ${data.conversationId}`);
    console.log(`   Response: ${data.response}`);
    
    return data;
  } catch (error) {
    console.error("\n❌ Request failed:");
    if (error instanceof Error) {
      if (error.message.includes("fetch failed") || error.message.includes("ECONNREFUSED")) {
        console.error(`   Error: Cannot connect to ${url}`);
        console.error(`   Make sure the server is running: npm run dev`);
      } else {
        console.error(`   Error: ${error.message}`);
      }
    } else {
      console.error(`   Error: ${String(error)}`);
    }
    return null;
  }
}

async function main() {
  const message = process.argv[2] || "What's my USDC balance?";
  
  console.log("🧪 Testing Chat Endpoint");
  console.log("=" .repeat(50));
  
  // First message
  const result1 = await testChat(message);
  
  if (result1 && result1.conversationId) {
    // Follow-up message in same conversation
    console.log("\n" + "=".repeat(50));
    console.log("📝 Testing follow-up message...");
    await testChat("Tell me more about my balance", result1.conversationId);
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("✅ Test completed");
}

main().catch(console.error);

