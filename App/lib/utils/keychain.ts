/**
 * macOS Keychain Utilities
 * Store and retrieve private keys securely using macOS Keychain
 * 
 * Uses the `security` command-line tool to interact with macOS Keychain
 */

import { execSync } from "child_process";

const KEYCHAIN_SERVICE = "PerkOS-Token-Api-Service";
const KEYCHAIN_ACCOUNT = "TEST_PRIVATE_KEY";

/**
 * Store private key in macOS Keychain
 */
export function storePrivateKeyInKeychain(privateKey: string): void {
  try {
    // Use security add-generic-password to store the key
    // -a: account name
    // -s: service name
    // -w: password (the private key)
    // -U: update if exists
    execSync(
      `security add-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "${KEYCHAIN_SERVICE}" -w "${privateKey}" -U 2>/dev/null || security add-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "${KEYCHAIN_SERVICE}" -w "${privateKey}"`,
      { stdio: "ignore" }
    );
  } catch (error) {
    throw new Error(
      `Failed to store private key in Keychain: ${error instanceof Error ? error.message : "Unknown error"}\n` +
      `Make sure you're on macOS and have Keychain access permissions.`
    );
  }
}

/**
 * Retrieve private key from macOS Keychain
 */
export function getPrivateKeyFromKeychain(): string | null {
  try {
    // Use security find-generic-password to retrieve the key
    // -a: account name
    // -s: service name
    // -w: write password to stdout
    const privateKey = execSync(
      `security find-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "${KEYCHAIN_SERVICE}" -w 2>/dev/null`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();

    return privateKey || null;
  } catch (error) {
    // Key not found or access denied
    return null;
  }
}

/**
 * Delete private key from macOS Keychain
 */
export function deletePrivateKeyFromKeychain(): void {
  try {
    execSync(
      `security delete-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "${KEYCHAIN_SERVICE}" 2>/dev/null || true`,
      { stdio: "ignore" }
    );
  } catch (error) {
    // Ignore errors (key might not exist)
  }
}

/**
 * Check if running on macOS
 */
export function isMacOS(): boolean {
  return process.platform === "darwin";
}

/**
 * Get private key with fallback priority:
 * 1. macOS Keychain (if on macOS)
 * 2. TEST_PRIVATE_KEY_ENCRYPTED (if ENCRYPTION_PASSWORD is set)
 * 3. TEST_PRIVATE_KEY (plain text, least secure)
 */
export function getPrivateKey(): string | null {
  // Try Keychain first (macOS only)
  if (isMacOS()) {
    const keychainKey = getPrivateKeyFromKeychain();
    if (keychainKey) {
      return keychainKey;
    }
  }

  // Fallback to encrypted env variable
  const encryptedKey = process.env.TEST_PRIVATE_KEY_ENCRYPTED;
  const password = process.env.ENCRYPTION_PASSWORD;
  if (encryptedKey && password) {
    try {
      const { decryptPrivateKey } = require("./encrypt-key");
      return decryptPrivateKey(encryptedKey, password);
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

