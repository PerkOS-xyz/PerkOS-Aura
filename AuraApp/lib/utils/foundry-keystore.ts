/**
 * Foundry Keystore Utilities
 * Read private keys from Foundry's encrypted keystore format
 * 
 * Uses Foundry's `cast wallet private-key` command to decrypt keystores
 * Keystores are stored at: ~/.foundry/keystores/{walletName}
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { getPrivateKeyFromKeychain } from "./keychain";

/**
 * Get Foundry keystore path
 */
function getKeystorePath(walletName: string = "defaultKey"): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) {
    throw new Error("Could not determine home directory");
  }
  return join(homeDir, ".foundry", "keystores", walletName);
}

/**
 * Check if Foundry keystore exists
 */
export function hasFoundryKeystore(walletName: string = "defaultKey"): boolean {
  try {
    const keystorePath = getKeystorePath(walletName);
    return existsSync(keystorePath);
  } catch {
    return false;
  }
}

/**
 * Get private key from Foundry keystore using password
 */
export function getPrivateKeyFromFoundry(
  walletName: string = "defaultKey",
  password?: string
): string | null {
  try {
    const keystorePath = getKeystorePath(walletName);
    
    if (!existsSync(keystorePath)) {
      return null;
    }

    // If password is provided, use it directly
    // Otherwise, cast will prompt interactively (not suitable for scripts)
    if (password) {
      try {
        const privateKey = execSync(
          `cast wallet private-key --keystore "${keystorePath}" --password "${password}" 2>/dev/null`,
          { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
        ).trim();

        if (privateKey && privateKey.startsWith("0x")) {
          return privateKey;
        }
      } catch (error) {
        // Password might be wrong or cast command failed
        return null;
      }
    }

    // If no password provided, return null (can't prompt in non-interactive mode)
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get private key with fallback priority (Foundry-style):
 * 1. Foundry keystore (if FOUNDRY_KEYSTORE_PASSWORD is set)
 * 2. macOS Keychain (if on macOS)
 * 3. TEST_PRIVATE_KEY_ENCRYPTED (if ENCRYPTION_PASSWORD is set)
 * 4. TEST_PRIVATE_KEY (plain text, least secure)
 * 
 * @param walletName - Name of the keystore (default: "defaultKey" or from FOUNDRY_KEYSTORE_NAME env var)
 */
export function getPrivateKey(walletName?: string): string | null {
  // Use FOUNDRY_KEYSTORE_NAME from env if not provided, otherwise default to "defaultKey"
  const keystoreName = walletName || process.env.FOUNDRY_KEYSTORE_NAME || "defaultKey";
  // Try Foundry keystore first (like Foundry does)
  const foundryPassword = process.env.FOUNDRY_KEYSTORE_PASSWORD;
  if (foundryPassword && hasFoundryKeystore(keystoreName)) {
    const foundryKey = getPrivateKeyFromFoundry(keystoreName, foundryPassword);
    if (foundryKey) {
      return foundryKey;
    }
  }

  // Fallback to Keychain (macOS only)
  if (process.platform === "darwin") {
    const keychainKey = getPrivateKeyFromKeychain();
    if (keychainKey) {
      return keychainKey;
    }
  }

  // Fallback to encrypted env variable
  const encryptedKey = process.env.TEST_PRIVATE_KEY_ENCRYPTED;
  const encryptionPassword = process.env.ENCRYPTION_PASSWORD;
  if (encryptedKey && encryptionPassword) {
    try {
      const { decryptPrivateKey } = require("./encrypt-key");
      return decryptPrivateKey(encryptedKey, encryptionPassword);
    } catch (error) {
      console.warn("⚠️  Failed to decrypt TEST_PRIVATE_KEY_ENCRYPTED, trying fallback...");
    }
  }

  // Fallback to plain text (least secure)
  const plainKey = process.env.TEST_PRIVATE_KEY;
  if (plainKey) {
    return plainKey;
  }

  return null;
}

/**
 * List available Foundry keystores
 */
export function listFoundryKeystores(): string[] {
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      return [];
    }

    const keystoreDir = join(homeDir, ".foundry", "keystores");
    if (!existsSync(keystoreDir)) {
      return [];
    }

    const { readdirSync } = require("fs");
    return readdirSync(keystoreDir).filter((file: string) => {
      // Foundry keystores are files, not directories
      const keystorePath = join(keystoreDir, file);
      return existsSync(keystorePath);
    });
  } catch {
    return [];
  }
}

