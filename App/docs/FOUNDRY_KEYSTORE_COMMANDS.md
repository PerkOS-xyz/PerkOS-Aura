# Foundry Keystore Commands Quick Reference

## List Keystores

### Using Foundry (Built-in)
```bash
cast wallet list
```

### Using npm script
```bash
npm run foundry:list
```

### Direct command line
```bash
ls ~/.foundry/keystores/
```

## Create New Keystore

### Option 1: Import Existing Private Key

```bash
cast wallet import <walletName> --interactive
```

**Example:**
```bash
cast wallet import defaultKey --interactive
```

**What happens:**
1. Prompt: `Enter private key:` → Paste your private key (must start with `0x`)
2. Prompt: `Enter password:` → Create a strong password (12+ characters)
3. Prompt: `Enter password again:` → Confirm your password

**Success output:**
```
`defaultKey` keystore was saved successfully. Address: 0x...
```

### Option 2: Create New Wallet First

If you don't have a private key yet, create a new wallet:

```bash
# Step 1: Create new wallet
cast wallet new

# Step 2: Import it to keystore (use the private key from step 1)
cast wallet import defaultKey --interactive
```

**Example output from `cast wallet new`:**
```
Successfully created new keypair.
Address:     0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7
Private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

⚠️ **Important**: Save both the address and private key securely before importing!

## Get Wallet Address

```bash
# Using npm script
npm run foundry:address <walletName>

# Using Foundry directly
cast wallet address --keystore ~/.foundry/keystores/<walletName>
```

## Get Private Key (Requires Password)

```bash
# Using npm script (requires FOUNDRY_KEYSTORE_PASSWORD in .env)
npm run foundry:get <walletName>

# Using Foundry directly
cast wallet private-key --keystore ~/.foundry/keystores/<walletName> --password <password>
```

## Change Keystore Password

Foundry doesn't have a direct "change password" command. You need to re-import the keystore:

### Method 1: Manual Re-import (Recommended)

```bash
# Step 1: Get the private key with old password
cast wallet private-key --keystore ~/.foundry/keystores/<walletName> --password <old-password>

# Step 2: Re-import with new password (this will overwrite the old keystore)
cast wallet import <walletName> --interactive
# When prompted:
# - Enter private key: (paste from step 1)
# - Enter password: (your new password)
# - Enter password again: (confirm new password)
```

### Method 2: Using Helper Script

```bash
# Set FOUNDRY_KEYSTORE_PASSWORD to your current password in .env
# Then run:
npx tsx scripts/change-keystore-password.ts <walletName>
```

**After changing password:**
- Update `FOUNDRY_KEYSTORE_PASSWORD` in your `.env` file with the new password

## Examples

### Create a new keystore named "myWallet"
```bash
cast wallet import myWallet --interactive
```

### List all keystores
```bash
cast wallet list
```

### Get address for "myWallet"
```bash
cast wallet address --keystore ~/.foundry/keystores/myWallet
```

### Use custom wallet name in code
Set `FOUNDRY_KEYSTORE_NAME=myWallet` in `.env` (if you implement this feature)

