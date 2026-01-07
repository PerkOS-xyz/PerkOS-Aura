/**
 * Private Key Encryption Utilities
 * Encrypts/decrypts private keys for secure storage in .env files
 * 
 * Usage:
 *   Encrypt: npx tsx scripts/encrypt-key.ts encrypt 0xYourPrivateKey
 *   Decrypt: npx tsx scripts/encrypt-key.ts decrypt ENCRYPTED_KEY
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha512");
}

/**
 * Encrypt a private key
 */
export function encryptPrivateKey(privateKey: string, password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(privateKey, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const tag = cipher.getAuthTag();
  
  // Combine: salt + iv + tag + encrypted
  const combined = Buffer.concat([salt, iv, tag, encrypted]);
  
  // Return base64 encoded
  return combined.toString("base64");
}

/**
 * Decrypt a private key
 */
export function decryptPrivateKey(encryptedKey: string, password: string): string {
  try {
    const combined = Buffer.from(encryptedKey, "base64");
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    const key = deriveKey(password, salt);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString("utf8");
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get encryption password from environment or prompt
 */
export function getEncryptionPassword(): string {
  const password = process.env.ENCRYPTION_PASSWORD;
  if (!password) {
    throw new Error(
      "ENCRYPTION_PASSWORD not set. Please set it in your .env file or export it:\n" +
      "  export ENCRYPTION_PASSWORD='your-secure-password'\n" +
      "Or add to .env: ENCRYPTION_PASSWORD=your-secure-password"
    );
  }
  return password;
}

