# macOS Keychain Setup Guide

This guide explains how to securely store your private key in macOS Keychain instead of plain text in `.env` files.

## Why Use Keychain?

- ✅ **Native macOS security** - Uses Apple's built-in Keychain system
- ✅ **No plain text storage** - Private key never stored in `.env` files
- ✅ **OS-level encryption** - Protected by macOS security features
- ✅ **Automatic access control** - macOS manages permissions
- ✅ **No password needed** - Uses your macOS user account

## Setup Instructions

### Step 1: Store Private Key in Keychain

Run the keychain store command:

```bash
npm run keychain:store 0xYourPrivateKeyHere
```

**First time only**: macOS will prompt you to allow Terminal/Node access to Keychain. Click "Allow" or "Always Allow".

### Step 2: Verify It's Stored

Check that the key was stored:

```bash
npm run keychain:get
```

This will display your private key (for verification only).

### Step 3: Remove from .env (Optional)

Once stored in Keychain, you can remove the plain text key from your `.env`:

```bash
# TEST_PRIVATE_KEY=0xYourPrivateKeyHere  # Remove or comment out
```

## Usage

The test scripts automatically retrieve the key from Keychain:

```bash
# These will automatically use Keychain if available
npm run test:balance
npm run test:chat "What's my balance?"
```

## Keychain Commands

### Store Private Key
```bash
npm run keychain:store 0xYourPrivateKeyHere
```

### Retrieve Private Key (for verification)
```bash
npm run keychain:get
```

### Delete Private Key
```bash
npm run keychain:delete
```

## How It Works

1. **Storage**: Private key is stored in macOS Keychain under:
   - Service: `PerkOS-Token-Api-Service`
   - Account: `TEST_PRIVATE_KEY`

2. **Retrieval**: Scripts automatically check Keychain first, then fall back to:
   - `TEST_PRIVATE_KEY_ENCRYPTED` (if `ENCRYPTION_PASSWORD` is set)
   - `TEST_PRIVATE_KEY` (plain text, least secure)

3. **Security**: macOS Keychain encrypts the key using your user account credentials

## Troubleshooting

### "This script only works on macOS"
- Keychain is macOS-only. On other platforms, use:
  - `TEST_PRIVATE_KEY_ENCRYPTED` (encrypted)
  - `TEST_PRIVATE_KEY` (plain text, less secure)

### "Failed to store private key in Keychain"
- **Grant Keychain Access**: When prompted, click "Allow" or "Always Allow"
- **Check Permissions**: Open Keychain Access app → Search for "PerkOS-Token-Api-Service"
- **Manual Fix**: Keychain Access → Right-click entry → "Get Info" → Check "Allow all applications to access this item"

### "No private key found in Keychain"
- Make sure you've stored it: `npm run keychain:store 0xYourPrivateKey`
- Check Keychain Access app for the entry
- Try storing again

### Keychain Access Prompt

When you first store a key, macOS will ask:
```
"Terminal" wants to use your confidential information stored in "PerkOS-Token-Api-Service" in your keychain.
```

Click **"Allow"** or **"Always Allow"** to proceed.

## Viewing in Keychain Access

You can view/manage the stored key in macOS Keychain Access:

1. Open **Keychain Access** app (Applications → Utilities)
2. Search for **"PerkOS-Token-Api-Service"**
3. Double-click to view details
4. Check "Show password" to see the stored key (requires your macOS password)

## Security Benefits

- 🔒 **OS-level encryption** - Protected by macOS security
- 🔒 **No file exposure** - Not stored in `.env` files
- 🔒 **Access control** - macOS manages who can access it
- 🔒 **User-specific** - Tied to your macOS user account

## Fallback Priority

The system tries keys in this order:

1. **macOS Keychain** (if on macOS) ← **Recommended**
2. `TEST_PRIVATE_KEY_ENCRYPTED` (if `ENCRYPTION_PASSWORD` is set)
3. `TEST_PRIVATE_KEY` (plain text, least secure)

This ensures compatibility across different platforms while prioritizing security.

