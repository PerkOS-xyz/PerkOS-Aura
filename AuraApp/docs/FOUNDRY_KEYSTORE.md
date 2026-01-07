# Foundry Keystore Setup Guide

This guide explains how to use Foundry's encrypted keystore for secure private key storage, just like Foundry does for contract deployment.

## Why Use Foundry Keystore?

- ✅ **Same as Foundry** - Uses the exact same keystore format as `cast wallet import`
- ✅ **Industry standard** - Ethereum keystore format (Ethereum JSON)
- ✅ **Password protected** - Encrypted with a password you choose
- ✅ **No plain text** - Private key never stored in `.env` files
- ✅ **Consistent** - Same keystore used for contract deployment and API testing

## Setup Instructions

### Step 1: Create or Import Wallet to Foundry Keystore

**Option A: Create a new wallet first**
```bash
# Create new wallet
cast wallet new

# Save the address and private key, then import to keystore
cast wallet import defaultKey --interactive
```

**Option B: Import existing private key**
```bash
cast wallet import defaultKey --interactive
```

**Option C: Use a custom wallet name**
```bash
cast wallet import myWallet --interactive
# Then set FOUNDRY_KEYSTORE_NAME=myWallet in .env
```

**What happens:**
1. Prompt: `Enter private key:` → Paste your private key (must start with `0x`)
2. Prompt: `Enter password:` → Create a strong password (12+ characters)
3. Prompt: `Enter password again:` → Confirm your password

**Success output:**
```
`defaultKey` keystore was saved successfully. Address: 0x...
```

Your encrypted keystore is saved at: `~/.foundry/keystores/defaultKey`

### Step 2: Set Keystore Configuration in .env

Add the password and wallet name to your `.env` file:

```bash
FOUNDRY_KEYSTORE_PASSWORD=your-keystore-password-here
FOUNDRY_KEYSTORE_NAME=zknexus-dev
```

**Important**: 
- `FOUNDRY_KEYSTORE_PASSWORD` is the password you used when importing the wallet with `cast wallet import`
- `FOUNDRY_KEYSTORE_NAME` is the name of your keystore (default: `defaultKey` if not set)

### Step 3: Verify Setup

Check that your keystore exists:

```bash
npm run foundry:list
```

Get the wallet address (doesn't require password):

```bash
npm run foundry:address
```

## Usage

The test scripts automatically use Foundry keystore if available:

```bash
# These will automatically use Foundry keystore if FOUNDRY_KEYSTORE_PASSWORD is set
npm run test:balance
npm run test:chat "What's my balance?"
```

## Foundry Commands

### List Keystores
```bash
npm run foundry:list
```

### Get Private Key (for verification)
```bash
npm run foundry:get [walletName]
# Default: defaultKey
```

### Get Wallet Address
```bash
npm run foundry:address [walletName]
# Default: defaultKey
```

## How It Works

1. **Storage**: Private key is stored in Foundry's keystore format at:
   - `~/.foundry/keystores/defaultKey` (or custom wallet name)

2. **Retrieval**: Uses `cast wallet private-key --keystore` command to decrypt
   - Requires `FOUNDRY_KEYSTORE_PASSWORD` from `.env`
   - Same command Foundry uses internally

3. **Fallback Priority**:
   - Foundry keystore (if `FOUNDRY_KEYSTORE_PASSWORD` is set) ← **Recommended**
   - macOS Keychain (if on macOS)
   - `TEST_PRIVATE_KEY_ENCRYPTED` (if `ENCRYPTION_PASSWORD` is set)
   - `TEST_PRIVATE_KEY` (plain text, least secure)

## Multiple Wallets

You can use different wallet names:

```bash
# Import with custom name
cast wallet import myTestWallet --interactive

# Use in scripts (set wallet name in code or use defaultKey)
```

## Security Best Practices

1. ✅ **Use strong password** - 12+ characters, mixed case, numbers, symbols
2. ✅ **Store password securely** - Use a password manager (1Password, Bitwarden)
3. ✅ **Never commit** `.env` files to git (already in `.gitignore`)
4. ✅ **Backup keystore** - Copy `~/.foundry/keystores/defaultKey` to secure location
5. ✅ **Same keystore** - Use the same keystore for contract deployment and API testing

## Change Keystore Password

Foundry doesn't have a direct "change password" command. You need to re-import the keystore:

### Method 1: Manual (Recommended)

```bash
# Step 1: Get private key with old password
cast wallet private-key --keystore ~/.foundry/keystores/zknexus-dev --password <old-password>

# Step 2: Re-import with new password (this overwrites the old keystore)
cast wallet import zknexus-dev --interactive
# When prompted:
# - Enter private key: (paste from step 1)
# - Enter password: (your new password)
# - Enter password again: (confirm new password)
```

### Method 2: Using Helper Script

```bash
# Make sure FOUNDRY_KEYSTORE_PASSWORD is set to your current password in .env
npm run foundry:change-password zknexus-dev
```

The script will:
1. Decrypt the keystore with your current password
2. Prompt you for a new password
3. Provide instructions to re-import

**After changing password:**
- Update `FOUNDRY_KEYSTORE_PASSWORD` in your `.env` file with the new password

## Troubleshooting

### "Keystore not found"
- Make sure you've imported the wallet: `cast wallet import defaultKey --interactive`
- Check keystore exists: `ls -la ~/.foundry/keystores/`
- Verify wallet name matches (default is `defaultKey`)

### "FOUNDRY_KEYSTORE_PASSWORD not set"
- Add `FOUNDRY_KEYSTORE_PASSWORD=your-password` to your `.env` file
- Use the same password you used when importing with `cast wallet import`

### "Failed to decrypt keystore"
- Verify `FOUNDRY_KEYSTORE_PASSWORD` matches the password used during import
- Try re-importing: `cast wallet import defaultKey --interactive` (will overwrite)

### "cast: command not found"
- Install Foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- Verify installation: `cast --version`

## Example .env Configuration

```bash
# Foundry Keystore Password (required if using Foundry keystore)
FOUNDRY_KEYSTORE_PASSWORD=your-strong-keystore-password

# Optional fallbacks (only if not using Foundry keystore)
# TEST_PRIVATE_KEY_ENCRYPTED=...
# TEST_PRIVATE_KEY=0x...
```

## Integration with Contract Deployment

Since you're already using Foundry keystore for contract deployment, this approach:
- ✅ Uses the **same keystore** for both deployment and API testing
- ✅ Uses the **same password** (`FOUNDRY_KEYSTORE_PASSWORD`)
- ✅ Maintains **consistency** across your development workflow
- ✅ Follows **Foundry best practices**

This is the recommended approach for projects using Foundry!

