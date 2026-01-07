/**
 * Decrypt Private Key from Environment
 * Automatically decrypts TEST_PRIVATE_KEY_ENCRYPTED if available
 */

import { decryptPrivateKey } from "./encrypt-key";

/**
 * Get decrypted private key from environment
 * Tries TEST_PRIVATE_KEY_ENCRYPTED first (encrypted), falls back to TEST_PRIVATE_KEY (plain)
 */
export function getDecryptedPrivateKey(): string | null {
  const encryptedKey = process.env.TEST_PRIVATE_KEY_ENCRYPTED;
  const plainKey = process.env.TEST_PRIVATE_KEY;
  const password = process.env.ENCRYPTION_PASSWORD;

  // If encrypted key is provided, decrypt it
  if (encryptedKey && password) {
    try {
      return decryptPrivateKey(encryptedKey, password);
    } catch (error) {
      console.error("⚠️  Failed to decrypt TEST_PRIVATE_KEY_ENCRYPTED:", error);
      console.error("   Falling back to TEST_PRIVATE_KEY if available");
    }
  }

  // Fall back to plain key
  if (plainKey) {
    return plainKey;
  }

  return null;
}

