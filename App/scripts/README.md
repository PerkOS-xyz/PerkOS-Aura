# Test Scripts

## test-chat.ts

Test script for the `/api/chat` endpoint. Does not require payment signing.

## test-balance-payment.ts

Test script for the `/api/balance/check` endpoint with x402 payment signing.

**Requires:** `TEST_PRIVATE_KEY` in `.env` (wallet address is derived automatically)

### Setup

1. Make sure you have a `.env` file in the `App` directory with:
   - `TEST_PRIVATE_KEY` (preferred - will derive wallet address automatically)
   - OR `TEST_WALLET_ADDRESS` (fallback - for chat testing without signing)
   - OR `ADMIN_WALLETS` (fallback - first address will be used)
   - `NEXT_PUBLIC_SERVICE_URL` (optional, defaults to `http://localhost:3000`)

2. Install dependencies:
   ```bash
   npm install
   ```

**Note:** For `test-balance-payment.ts`, you **must** provide `TEST_PRIVATE_KEY` since it needs to sign payment envelopes. The wallet address will be automatically derived from the private key.

### Usage

**Chat Testing (no payment required):**
```bash
# Test with default message ("What's my USDC balance?")
npm run test:chat

# Test with custom message
npm run test:chat "Hello, can you help me create a token?"

# Or use npx tsx directly
npx tsx scripts/test-chat.ts "What's my USDC balance?"
```

**Balance Check Testing (with payment signing):**
```bash
# Test balance check with payment (default network from config)
npm run test:balance

# Test with specific network
npx tsx scripts/test-balance-payment.ts base
```

### What they do

**test-chat.ts:**
1. Loads environment variables from `.env`
2. Derives wallet address from `TEST_PRIVATE_KEY` (or uses `TEST_WALLET_ADDRESS`/`ADMIN_WALLETS` as fallback)
3. Sends a POST request to `/api/chat` with:
   - Your message
   - Wallet address
   - Optional conversation ID for follow-up messages
4. Displays the response from the elizaOS agent
5. Optionally sends a follow-up message in the same conversation

**test-balance-payment.ts:**
1. Loads environment variables from `.env`
2. Derives wallet address from `TEST_PRIVATE_KEY` (required)
3. Gets payment requirements from `/api/payment/requirements`
4. Signs a payment envelope using the private key
5. Sends GET request to `/api/balance/check` with signed payment in `PAYMENT-SIGNATURE` header (x402 v2)
6. Displays the balance check response

### Example Output

```
🧪 Testing Chat Endpoint
==================================================

📤 Sending chat request...
   URL: http://localhost:3000/api/chat
   Wallet: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7
   Message: "What's my USDC balance?"

✅ Success response:
   Conversation ID: conv_1766519507404
   Response: ✅ USDC Balance Check

Wallet: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7
Network: base
Balance: 0.000000 USDC
...
```

