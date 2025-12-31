# Testing x402 V2 Implementation

## ✅ Ready to Test

All client-side and server-side code has been updated to use x402 v2 headers and standards.

## Pre-Test Checklist

### 1. Environment Variables
Ensure your `.env` file has:
```bash
# x402 Configuration
PAY_TO_ADDRESS=0x...  # Your payment recipient address
FACILITATOR_URL=https://stack.perkos.xyz  # Or http://localhost:3005 for local testing
NEXT_PUBLIC_NETWORK=avalanche  # Or your preferred network

# Private Key (one of these)
FOUNDRY_KEYSTORE_PASSWORD=...
FOUNDRY_KEYSTORE_NAME=zknexus-dev
# OR
TEST_PRIVATE_KEY_ENCRYPTED=...
ENCRYPTION_PASSWORD=...
```

### 2. Facilitator Status
- ✅ **PerkOS-Stack facilitator** should be running
- ⚠️ **Important**: The facilitator needs to be updated to use the `extra.name` field from `paymentRequirements` when constructing the EIP-712 domain

### 3. Server Running
```bash
cd PerkOS-Token-Api-Service/App
npm run dev
```

## Test Commands

### Test 1: Balance Check with x402 V2 Payment
```bash
cd PerkOS-Token-Api-Service/App
npm run test:balance
```

**Expected Behavior**:
1. ✅ Gets payment requirements from `/api/payment/requirements`
2. ✅ Signs payment envelope using private key
3. ✅ Sends request with `PAYMENT-SIGNATURE` header (x402 v2)
4. ✅ Server extracts payment from `PAYMENT-SIGNATURE` header
5. ✅ Server verifies payment with facilitator
6. ✅ Server settles payment
7. ✅ Returns balance check result with `PAYMENT-RESPONSE` header

### Test 2: Chat Agent with Payment
1. Start the dev server: `npm run dev`
2. Navigate to `/dashboard`
3. Connect wallet
4. Ask: "What's my USDC balance?"
5. Click payment button to sign
6. Agent should check balance successfully

### Test 3: Create Token via Agent
1. In chat, ask: "Create a token called TestToken with symbol TEST"
2. Sign payment when prompted
3. Token should be created successfully

## What to Check

### ✅ Server-Side (Middleware)
- [x] Extracts payment from `PAYMENT-SIGNATURE` header
- [x] Falls back to `X-Payment` for backward compatibility
- [x] Detects token info and passes to facilitator
- [x] Returns `PAYMENT-REQUIRED` header with 402 status
- [x] Returns `PAYMENT-RESPONSE` header with 200 status

### ✅ Client-Side (Actions & Scripts)
- [x] Uses `PAYMENT-SIGNATURE` header (not `X-Payment`)
- [x] Formats payment payload correctly (x402 v2 structure)
- [x] Base64-encodes payment signature
- [x] Converts network to CAIP-2 format

### ⚠️ Facilitator-Side (Needs Update)
The facilitator (`PerkOS-Stack`) should:
- [ ] Use `paymentRequirements.extra.name` for EIP-712 domain
- [ ] Use `paymentRequirements.extra.version` for EIP-712 domain
- [ ] Construct domain: `{ name: extra.name, version: extra.version, ... }`

## Expected Logs

### Client (test-balance-payment.ts)
```
✅ Using wallet: 0x...
   Keystore: zknexus-dev

📤 Testing Balance Check with x402 Payment
📋 Step 1: Getting payment requirements...
   ✅ Requirements: {...}

✍️  Step 2: Signing payment envelope...
   ✅ Signed envelope: {...}

💳 Step 3: Making request with signed payment...
   Using PAYMENT-SIGNATURE header (x402 v2)

✅ Success response:
   { balance: "...", hasEnough: true }
```

### Server (Middleware)
```
📝 Signing with domain: {...}
📝 Signing with message: {...}
✅ Signed by: 0x...

🔍 Detecting token info...
✅ Token detected: { name: "USD Coin", symbol: "USDC", decimals: 6 }

📤 Sending to facilitator with token info:
   extra: { name: "USD Coin", version: "2" }
```

### Facilitator (Should Show)
```
🔍 Recovering signer with domain: { name: "USD Coin", version: "2", ... }
✅ Recovered address: 0x...
✅ Signer matches from address
```

## Troubleshooting

### Error: "Signer does not match 'from' address"
**Cause**: Facilitator not using `extra.name` for EIP-712 domain
**Fix**: Update facilitator to use `paymentRequirements.extra.name` instead of hardcoded "USD Coin"

### Error: "Failed to parse PAYMENT-SIGNATURE header"
**Cause**: Header format issue
**Fix**: Check that client is using `formatPaymentSignature()` helper

### Error: "Payment verification failed"
**Cause**: Network mismatch or token address issue
**Fix**: Verify network is in CAIP-2 format and token address is correct

## Next Steps After Testing

1. ✅ Verify all tests pass
2. ⚠️ Update facilitator to use `extra.name` field
3. ✅ Test with different networks
4. ✅ Test with different tokens (if supported)

## References

- [x402 V2 Launch](https://www.x402.org/writing/x402-v2-launch)
- [x402 V2 Headers](./X402_V2_HEADERS.md)
- [Client-Side Updates](./CLIENT_SIDE_V2_UPDATE.md)

