# Private Key Encryption Guide

This guide explains how to securely store your private key in `.env` files using encryption.

## Why Encrypt?

Storing private keys in plain text in `.env` files is a security risk. If your `.env` file is accidentally committed to git or accessed by unauthorized users, your private key could be compromised.

## How It Works

1. **Encryption**: Your private key is encrypted using AES-256-GCM with a password you choose
2. **Storage**: The encrypted key is stored in `.env` as `TEST_PRIVATE_KEY_ENCRYPTED`
3. **Decryption**: At runtime, the system automatically decrypts the key using `ENCRYPTION_PASSWORD`

## Setup Instructions

### Step 1: Set Encryption Password

Add to your `.env` file:

```bash
ENCRYPTION_PASSWORD=your-strong-password-here
```

**Important**: Choose a strong, unique password. This password is used to encrypt/decrypt your private key.

### Step 2: Encrypt Your Private Key

Run the encryption script:

```bash
npm run encrypt:key 0xYourPrivateKeyHere
```

This will output an encrypted string like:
```
✅ Encrypted private key:
aBc123XyZ789...very-long-encrypted-string...
```

### Step 3: Add to .env

Copy the encrypted string to your `.env` file:

```bash
TEST_PRIVATE_KEY_ENCRYPTED=aBc123XyZ789...very-long-encrypted-string...
```

### Step 4: Remove Plain Text Key

Remove or comment out the plain text key:

```bash
# TEST_PRIVATE_KEY=0xYourPrivateKeyHere  # Remove this line
```

## Usage

The system automatically detects and decrypts the encrypted key:

- **Test scripts** (`test-balance-payment.ts`, `test-chat.ts`) automatically decrypt `TEST_PRIVATE_KEY_ENCRYPTED`
- **Fallback**: If encryption fails or `TEST_PRIVATE_KEY_ENCRYPTED` is not set, it falls back to `TEST_PRIVATE_KEY` (plain text)

## Decrypting (for verification)

To verify your encrypted key can be decrypted:

```bash
npm run decrypt:key ENCRYPTED_KEY_STRING
```

## Security Best Practices

1. ✅ **Use encryption** for production environments
2. ✅ **Use a strong password** for `ENCRYPTION_PASSWORD`
3. ✅ **Never commit** `.env` files to git (already in `.gitignore`)
4. ✅ **Store `ENCRYPTION_PASSWORD` securely** - consider using a password manager
5. ⚠️ **Don't share** `ENCRYPTION_PASSWORD` - if compromised, re-encrypt your key

## Example .env Configuration

```bash
# Encryption password (keep this secret!)
ENCRYPTION_PASSWORD=my-super-secure-password-123

# Encrypted private key (safe to store)
TEST_PRIVATE_KEY_ENCRYPTED=aBc123XyZ789...encrypted-string...

# Plain text key (remove this if using encryption)
# TEST_PRIVATE_KEY=0xYourPrivateKeyHere
```

## Troubleshooting

### "ENCRYPTION_PASSWORD not set"
- Make sure `ENCRYPTION_PASSWORD` is set in your `.env` file
- Restart your dev server after adding it

### "Decryption failed"
- Verify `ENCRYPTION_PASSWORD` matches the one used to encrypt
- Check that `TEST_PRIVATE_KEY_ENCRYPTED` is correctly copied (no extra spaces/newlines)
- Try re-encrypting with the correct password

### "No private key found"
- Make sure either `TEST_PRIVATE_KEY_ENCRYPTED` or `TEST_PRIVATE_KEY` is set
- If using encryption, ensure `ENCRYPTION_PASSWORD` is set

## Technical Details

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2 with SHA-512 (100,000 iterations)
- **Salt**: Random 64-byte salt (unique per encryption)
- **IV**: Random 16-byte initialization vector
- **Authentication**: GCM authentication tag for integrity verification

This provides strong encryption suitable for protecting private keys in development and production environments.

