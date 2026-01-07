#!/usr/bin/env tsx
/**
 * Foundry Keystore Private Key Management
 * 
 * Usage:
 *   List:    npx tsx scripts/foundry-key.ts list
 *   Get:     npx tsx scripts/foundry-key.ts get [walletName]
 *   Address: npx tsx scripts/foundry-key.ts address [walletName]
 */

import { getPrivateKeyFromFoundry, hasFoundryKeystore, listFoundryKeystores } from "../lib/utils/foundry-keystore";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, "../.env") });

const command = process.argv[2];
const walletName = process.argv[3] || "defaultKey";

if (!command) {
  console.error("Usage:");
  console.error("  List:    npx tsx scripts/foundry-key.ts list");
  console.error("  Get:     npx tsx scripts/foundry-key.ts get [walletName]");
  console.error("  Address: npx tsx scripts/foundry-key.ts address [walletName]");
  console.error("\nNote: Set FOUNDRY_KEYSTORE_PASSWORD in your .env file");
  process.exit(1);
}

try {
  switch (command) {
    case "list":
      const keystores = listFoundryKeystores();
      if (keystores.length === 0) {
        console.log("\n📭 No Foundry keystores found");
        console.log("   Create one with: cast wallet import defaultKey --interactive");
      } else {
        console.log("\n📋 Foundry Keystores:");
        keystores.forEach((name) => {
          console.log(`   - ${name}`);
        });
      }
      break;

    case "get":
      if (!hasFoundryKeystore(walletName)) {
        console.error(`\n❌ Keystore "${walletName}" not found`);
        console.error(`   Create it with: cast wallet import ${walletName} --interactive`);
        process.exit(1);
      }

      const password = process.env.FOUNDRY_KEYSTORE_PASSWORD;
      if (!password) {
        console.error("\n❌ FOUNDRY_KEYSTORE_PASSWORD not set in .env");
        console.error("   Add it to your .env file to decrypt the keystore");
        process.exit(1);
      }

      const privateKey = getPrivateKeyFromFoundry(walletName, password);
      if (privateKey) {
        console.log("\n✅ Private key retrieved from Foundry keystore:");
        console.log(privateKey);
      } else {
        console.error("\n❌ Failed to decrypt keystore");
        console.error("   Check that FOUNDRY_KEYSTORE_PASSWORD is correct");
        process.exit(1);
      }
      break;

    case "address":
      if (!hasFoundryKeystore(walletName)) {
        console.error(`\n❌ Keystore "${walletName}" not found`);
        process.exit(1);
      }

      try {
        const keystorePath = require("path").join(
          process.env.HOME || process.env.USERPROFILE || "",
          ".foundry",
          "keystores",
          walletName
        );
        
        // Use cast to get address (doesn't require password)
        const address = execSync(
          `cast wallet address --keystore "${keystorePath}" 2>/dev/null`,
          { encoding: "utf8" }
        ).trim();

        console.log(`\n✅ Address for keystore "${walletName}":`);
        console.log(address);
      } catch (error) {
        console.error("\n❌ Failed to get address");
        console.error("   Make sure Foundry is installed: foundryup");
        process.exit(1);
      }
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.error("   Use 'list', 'get', or 'address'");
      process.exit(1);
  }
} catch (error) {
  console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}

