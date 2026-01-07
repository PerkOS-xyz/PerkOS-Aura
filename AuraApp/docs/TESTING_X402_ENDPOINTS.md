# Testing x402 Endpoints with Foundry Keystore

This guide shows how to test x402-protected endpoints using your Foundry keystore.

## Prerequisites

1. **Foundry keystore set up:**
   ```bash
   cast wallet import zknexus-dev --interactive
   ```

2. **Environment variables in `.env`:**
   ```bash
   FOUNDRY_KEYSTORE_PASSWORD=your-keystore-password
   FOUNDRY_KEYSTORE_NAME=zknexus-dev
   NEXT_PUBLIC_SERVICE_URL=http://localhost:3000
   ```

3. **Server running:**
   ```bash
   npm run dev
   ```

## Test Balance Check Endpoint

The balance check endpoint requires x402 payment ($0.001 USD):

```bash
# Test on default network (from x402Config)
npm run test:balance

# Test on specific network
npm run test:balance base-sepolia
npm run test:balance avalanche-fuji
npm run test:balance celo-sepolia
```

**What it does:**
1. Gets payment requirements from `/api/payment/requirements`
2. Signs the payment envelope using your Foundry keystore
3. Makes the request with `X-Payment` header
4. Returns your USDC balance

**Expected output:**
```
📤 Testing Balance Check with x402 Payment
==================================================
   URL: http://localhost:3000/api/balance/check
   Wallet: 0x...
   Network: base-sepolia
   Price: $0.001

📋 Step 1: Getting payment requirements...
   ✅ Requirements: { ... }

✍️  Step 2: Signing payment envelope...
   ✅ Signed envelope: { ... }

💳 Step 3: Making request with signed payment...
✅ Success response:
   {
     "success": true,
     "balance": "1000000",
     "balanceFormatted": "1.0",
     "network": "base-sepolia",
     "walletAddress": "0x..."
   }
```

## Test AI Endpoints

To test AI endpoints, you can use similar test scripts. For example, the image analysis endpoint requires x402 payment ($0.05 USD).

**Manual test with curl:**

```bash
# Step 1: Get payment requirements
curl "http://localhost:3000/api/payment/requirements?endpoint=/api/ai/analyze&method=POST"

# Step 2: Sign the payment envelope (use the test script pattern)
# Step 3: Make the request with X-Payment header
```

## How It Works

The test scripts use `getPrivateKey()` from `lib/utils/foundry-keystore.ts`, which:

1. **First tries Foundry keystore** (if `FOUNDRY_KEYSTORE_PASSWORD` and `FOUNDRY_KEYSTORE_NAME` are set)
   - Uses `cast wallet private-key --keystore ~/.foundry/keystores/{name} --password {password}`
   
2. **Falls back to macOS Keychain** (if on macOS)
   
3. **Falls back to encrypted env variable** (`TEST_PRIVATE_KEY_ENCRYPTED`)
   
4. **Falls back to plain text** (`TEST_PRIVATE_KEY`)

## Troubleshooting

### "No private key found"
- Check that `FOUNDRY_KEYSTORE_PASSWORD` is set correctly in `.env`
- Check that `FOUNDRY_KEYSTORE_NAME` matches your keystore name
- Verify keystore exists: `cast wallet list`

### "Failed to decrypt keystore"
- Verify the password is correct
- Try getting the private key manually:
  ```bash
  cast wallet private-key --keystore ~/.foundry/keystores/zknexus-dev --password <your-password>
  ```

### "Cannot connect to http://localhost:3000"
- Make sure the dev server is running: `npm run dev`
- Check that `NEXT_PUBLIC_SERVICE_URL` matches your server URL

### "Payment verification failed"
- Check that you have USDC on the network you're testing
- Verify the facilitator URL is correct: `https://stack.perkos.xyz`
- Check network configuration in `lib/config/x402.ts`

## Supported Networks

- **Mainnets:** `avalanche`, `base`, `celo`
- **Testnets:** `avalanche-fuji`, `base-sepolia`, `celo-sepolia`

See `docs/SUPPORTED_NETWORKS.md` for full details.

