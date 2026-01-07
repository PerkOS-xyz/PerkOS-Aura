#!/usr/bin/env tsx
/**
 * Encrypt/Decrypt Private Key Script
 * 
 * Usage:
 *   Encrypt: npx tsx scripts/encrypt-key.ts encrypt 0xYourPrivateKey
 *   Decrypt: npx tsx scripts/encrypt-key.ts decrypt ENCRYPTED_KEY
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { encryptPrivateKey, decryptPrivateKey, getEncryptionPassword } from "../lib/utils/encrypt-key";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, "../.env") });

const command = process.argv[2];
const input = process.argv[3];

if (!command || !input) {
  console.error("Usage:");
  console.error("  Encrypt: npx tsx scripts/encrypt-key.ts encrypt 0xYourPrivateKey");
  console.error("  Decrypt: npx tsx scripts/encrypt-key.ts decrypt ENCRYPTED_KEY");
  console.error("\nNote: Set ENCRYPTION_PASSWORD in your .env file");
  process.exit(1);
}

try {
  const password = getEncryptionPassword();

  if (command === "encrypt") {
    if (!input.startsWith("0x")) {
      console.error("❌ Private key must start with 0x");
      process.exit(1);
    }

    const encrypted = encryptPrivateKey(input, password);
    console.log("\n✅ Encrypted private key:");
    console.log(encrypted);
    console.log("\n📝 Add this to your .env file:");
    console.log(`TEST_PRIVATE_KEY_ENCRYPTED=${encrypted}`);
    console.log("\n⚠️  Make sure ENCRYPTION_PASSWORD is set in your .env file!");
  } else if (command === "decrypt") {
    const decrypted = decryptPrivateKey(input, password);
    console.log("\n✅ Decrypted private key:");
    console.log(decrypted);
  } else {
    console.error(`❌ Unknown command: ${command}`);
    console.error("Use 'encrypt' or 'decrypt'");
    process.exit(1);
  }
} catch (error) {
  console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}

