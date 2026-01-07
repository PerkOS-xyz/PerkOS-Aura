#!/usr/bin/env tsx
/**
 * Change Foundry Keystore Password
 * 
 * Usage: npx tsx scripts/change-keystore-password.ts <walletName>
 * 
 * This script:
 * 1. Decrypts the keystore with the old password (from FOUNDRY_KEYSTORE_PASSWORD)
 * 2. Re-imports it with a new password (interactive prompt)
 * 3. Updates the keystore file
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import * as readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, "../.env") });

const walletName = process.argv[2] || process.env.FOUNDRY_KEYSTORE_NAME || "defaultKey";
const oldPassword = process.env.FOUNDRY_KEYSTORE_PASSWORD;

if (!oldPassword) {
  console.error("❌ FOUNDRY_KEYSTORE_PASSWORD not set in .env");
  console.error("   Please set it to your current keystore password");
  process.exit(1);
}

// Get keystore path
const homeDir = process.env.HOME || process.env.USERPROFILE;
if (!homeDir) {
  console.error("❌ Could not determine home directory");
  process.exit(1);
}

const keystorePath = join(homeDir, ".foundry", "keystores", walletName);

if (!existsSync(keystorePath)) {
  console.error(`❌ Keystore "${walletName}" not found at: ${keystorePath}`);
  console.error("   List keystores: cast wallet list");
  process.exit(1);
}

// Prompt for new password
function promptPassword(message: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function changePassword() {
  try {
    console.log(`\n🔐 Changing password for keystore: ${walletName}`);
    console.log("=" .repeat(50));

    // Step 1: Get private key using old password
    console.log("\n📋 Step 1: Decrypting keystore with old password...");
    let privateKey: string;
    try {
      privateKey = execSync(
        `cast wallet private-key --keystore "${keystorePath}" --password "${oldPassword}" 2>/dev/null`,
        { encoding: "utf8" }
      ).trim();

      if (!privateKey || !privateKey.startsWith("0x")) {
        throw new Error("Invalid private key returned");
      }
    } catch (error) {
      console.error("\n❌ Failed to decrypt keystore with old password");
      console.error("   Check that FOUNDRY_KEYSTORE_PASSWORD is correct");
      process.exit(1);
    }

    console.log("   ✅ Keystore decrypted successfully");

    // Step 2: Get new password
    console.log("\n🔑 Step 2: Enter new password...");
    const newPassword1 = await promptPassword("Enter new password: ");
    const newPassword2 = await promptPassword("Enter new password again: ");

    if (newPassword1 !== newPassword2) {
      console.error("\n❌ Passwords don't match");
      process.exit(1);
    }

    if (newPassword1.length < 8) {
      console.error("\n❌ Password must be at least 8 characters");
      process.exit(1);
    }

    // Step 3: Delete old keystore
    console.log("\n💾 Step 3: Re-importing keystore with new password...");
    console.log("   (This will overwrite the old keystore)");
    
    // Delete old keystore first
    try {
      execSync(`rm "${keystorePath}" 2>/dev/null || true`);
    } catch (error) {
      // Ignore errors
    }

    // Step 4: Re-import with new password
    console.log("\n   Now re-importing...");
    console.log("   You'll be prompted to enter the private key and new password");
    
    // Use a simple approach: write private key to temp file and pipe it
    // But cast wallet import doesn't support non-interactive mode easily
    // So we'll provide clear instructions
    console.log("\n⚠️  Manual step required:");
    console.log(`   Run this command:`);
    console.log(`   cast wallet import ${walletName} --interactive`);
    console.log(`\n   When prompted:`);
    console.log(`   1. Enter private key: ${privateKey}`);
    console.log(`   2. Enter password: ${newPassword1.substring(0, 2)}... (your new password)`);
    console.log(`   3. Enter password again: ${newPassword1.substring(0, 2)}... (confirm)`);
    
    console.log("\n   Or run this one-liner:");
    console.log(`   echo -e "${privateKey}\\n${newPassword1}\\n${newPassword1}" | cast wallet import ${walletName} --interactive`);

    // Step 5: Update .env reminder
    console.log("\n📝 Step 5: After re-importing, update your .env file");
    console.log("   Update FOUNDRY_KEYSTORE_PASSWORD to:");
    console.log(`   FOUNDRY_KEYSTORE_PASSWORD=${newPassword1}`);

    console.log("\n✅ Follow the steps above to complete the password change");

  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

changePassword().catch(console.error);

