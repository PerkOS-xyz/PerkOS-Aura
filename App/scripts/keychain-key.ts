#!/usr/bin/env tsx
/**
 * macOS Keychain Private Key Management
 * 
 * Usage:
 *   Store:   npx tsx scripts/keychain-key.ts store 0xYourPrivateKey
 *   Get:     npx tsx scripts/keychain-key.ts get
 *   Delete: npx tsx scripts/keychain-key.ts delete
 */

import { storePrivateKeyInKeychain, getPrivateKeyFromKeychain, deletePrivateKeyFromKeychain, isMacOS } from "../lib/utils/keychain";

const command = process.argv[2];
const input = process.argv[3];

if (!isMacOS()) {
  console.error("❌ This script only works on macOS");
  console.error("   Use TEST_PRIVATE_KEY in .env file instead");
  process.exit(1);
}

if (!command) {
  console.error("Usage:");
  console.error("  Store:   npx tsx scripts/keychain-key.ts store 0xYourPrivateKey");
  console.error("  Get:     npx tsx scripts/keychain-key.ts get");
  console.error("  Delete:  npx tsx scripts/keychain-key.ts delete");
  process.exit(1);
}

try {
  switch (command) {
    case "store":
      if (!input) {
        console.error("❌ Please provide a private key to store");
        console.error("   Usage: npx tsx scripts/keychain-key.ts store 0xYourPrivateKey");
        process.exit(1);
      }

      if (!input.startsWith("0x")) {
        console.error("❌ Private key must start with 0x");
        process.exit(1);
      }

      storePrivateKeyInKeychain(input);
      console.log("\n✅ Private key stored in macOS Keychain");
      console.log("   Service: PerkOS-Token-Api-Service");
      console.log("   Account: TEST_PRIVATE_KEY");
      console.log("\n💡 You can now remove TEST_PRIVATE_KEY from your .env file");
      break;

    case "get":
      const key = getPrivateKeyFromKeychain();
      if (key) {
        console.log("\n✅ Private key retrieved from Keychain:");
        console.log(key);
      } else {
        console.error("\n❌ No private key found in Keychain");
        console.error("   Store one first: npx tsx scripts/keychain-key.ts store 0xYourPrivateKey");
        process.exit(1);
      }
      break;

    case "delete":
      deletePrivateKeyFromKeychain();
      console.log("\n✅ Private key deleted from Keychain");
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.error("   Use 'store', 'get', or 'delete'");
      process.exit(1);
  }
} catch (error) {
  console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
  
  if (error instanceof Error && error.message.includes("Keychain")) {
    console.error("\n💡 Troubleshooting:");
    console.error("   - Make sure you're on macOS");
    console.error("   - Grant Terminal/Node access to Keychain when prompted");
    console.error("   - Check Keychain Access app for 'PerkOS-Token-Api-Service'");
  }
  
  process.exit(1);
}

