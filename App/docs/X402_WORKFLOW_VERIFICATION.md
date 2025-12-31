# x402 v2 Workflow Verification

## Current Implementation Status

### ✅ Vendor Side (This Service) - **CORRECTLY IMPLEMENTED**

The vendor side follows x402 v2 standard:

1. **API Endpoints with x402 Protection:**
   - ✅ `/api/tokens/create` - Requires x402 payment ($0.10)
   - ✅ `/api/tokens/distribute` - Requires x402 payment ($0.05)
   - ✅ `/api/tokens/list` - Free (no payment)
   - ✅ `/api/tokens/[address]` - Free (no payment)

2. **x402 Middleware (`lib/middleware/x402.ts`):**
   - ✅ Extracts `X-Payment` header
   - ✅ Verifies payment with facilitator: `POST https://stack.perkos.xyz/api/v2/x402/verify`
   - ✅ Settles payment with facilitator: `POST https://stack.perkos.xyz/api/v2/x402/settle`
   - ✅ Returns 402 Payment Required if no payment header
   - ✅ Follows x402 v2 standard format

3. **Payment Verification Flow:**
   ```
   Client Request → Vendor API
   ├── No X-Payment header → 402 Payment Required
   └── X-Payment header present
       ├── Verify with facilitator (stack.perkos.xyz)
       ├── Settle with facilitator
       └── Process request if valid
   ```

### ⚠️ Client Side (elizaOS Agent) - **NEEDS IMPLEMENTATION**

**Current Issue:** elizaOS actions call `tokenService.createToken()` directly, bypassing the x402 payment flow.

**What Should Happen:**
1. elizaOS agent decides to create a token
2. Agent calls vendor API endpoint `/api/tokens/create` (not service directly)
3. Vendor returns 402 Payment Required
4. Client (user's wallet) creates payment signature
5. Client retries with `X-Payment` header
6. Vendor verifies and processes

**Current Implementation:**
- ❌ Actions call `tokenService.createToken()` directly (bypasses x402)
- ❌ No x402 client library integration
- ❌ No payment signature creation
- ❌ No API endpoint calls with payment headers

## Required Changes

### 1. Update elizaOS Actions to Call API Endpoints

Instead of:
```typescript
// ❌ Current (bypasses x402)
const result = await tokenService.createToken({...});
```

Should be:
```typescript
// ✅ Correct (uses x402 flow)
const response = await fetch('/api/tokens/create', {
  method: 'POST',
  headers: {
    'X-Payment': paymentEnvelope, // Created by x402 client
  },
  body: JSON.stringify({...}),
});
```

### 2. Create x402 Client Helper

Create `lib/services/x402/X402Client.ts` that:
- Creates payment signatures using user's wallet
- Handles 402 Payment Required responses
- Retries requests with payment headers
- Integrates with elizaOS actions

### 3. Update MCP Plugin

The MCP plugin should:
- Accept user's wallet address
- Use x402 client to make paid API calls
- Handle payment flow automatically

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT: elizaOS Agent (User's Browser)                     │
│                                                              │
│  1. User: "Create a token called MyToken"                   │
│  2. elizaOS Agent → create_token action                     │
│  3. Action calls: POST /api/tokens/create                    │
│     (without X-Payment header)                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  VENDOR: This Service                                        │
│                                                              │
│  4. API receives request (no X-Payment)                     │
│  5. Returns: 402 Payment Required                            │
│     {                                                         │
│       error: "Payment Required",                             │
│       payment: {                                             │
│         route: "POST /api/tokens/create",                     │
│         price: "$0.10",                                      │
│         network: "avalanche",                                │
│         payTo: "0x...",                                      │
│         facilitator: "https://stack.perkos.xyz"              │
│       }                                                       │
│     }                                                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  CLIENT: x402 Client (User's Browser)                        │
│                                                              │
│  6. x402 Client receives 402 response                        │
│  7. Gets payment requirements                                │
│  8. User's wallet signs payment (EIP-712)                     │
│  9. Creates X-Payment header with signature                  │
│  10. Retries: POST /api/tokens/create                        │
│      (with X-Payment header)                                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  VENDOR: This Service                                        │
│                                                              │
│  11. Extracts X-Payment header                               │
│  12. Verifies with facilitator:                              │
│      POST https://stack.perkos.xyz/api/v2/x402/verify       │
│  13. Settles payment:                                        │
│      POST https://stack.perkos.xyz/api/v2/x402/settle       │
│  14. Processes request: Creates token                        │
│  15. Returns success response                                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  FACILITATOR: stack.perkos.xyz                               │
│                                                              │
│  16. Verifies signature and payment details                 │
│  17. Checks balance/nonce validity                            │
│  18. Settles payment on-chain (gasless)                      │
│  19. Returns transaction hash                                │
└─────────────────────────────────────────────────────────────┘
```

## Next Steps

1. **Create x402 Client Helper** (`lib/services/x402/X402Client.ts`)
2. **Update elizaOS Actions** to use API endpoints instead of services
3. **Integrate x402 Client** with elizaOS actions
4. **Test End-to-End** workflow

## Verification Checklist

- [x] Vendor API endpoints require x402 payment
- [x] Vendor verifies payments with facilitator
- [x] Vendor settles payments with facilitator
- [x] Vendor follows x402 v2 standard format
- [ ] elizaOS actions call API endpoints (not services directly)
- [ ] x402 client creates payment signatures
- [ ] x402 client handles 402 responses and retries
- [ ] End-to-end workflow tested

