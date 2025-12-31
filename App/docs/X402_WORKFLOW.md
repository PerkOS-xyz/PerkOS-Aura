# x402 v2 Payment Workflow

This document describes the x402 v2 payment workflow for the Token Service API.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT SIDE                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  User Wallet (Connected)                                  │  │
│  │  └──> elizaOS Agent (with MCP Plugin)                       │  │
│  │       └──> x402 Client (creates payment signatures)       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP Request + X-Payment Header
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VENDOR SIDE (This Service)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Endpoint (e.g., /api/tokens/create)                  │  │
│  │  └──> x402 Middleware (verifyX402Payment)                 │  │
│  │       ├──> Extract X-Payment header                       │  │
│  │       ├──> Verify with Facilitator                        │  │
│  │       └──> Settle with Facilitator                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ POST /api/v2/x402/verify
                              │ POST /api/v2/x402/settle
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FACILITATOR (stack.perkos.xyz)                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PerkOS-Stack Facilitator                                 │  │
│  │  ├──> Verify payment signature                            │  │
│  │  ├──> Check balance/nonce                                 │  │
│  │  └──> Settle payment on-chain                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Workflow Steps

### 1. Client Request (elizaOS Agent + MCP Plugin)

When the elizaOS agent needs to call a paid endpoint (e.g., create token):

1. **Agent decides to use action** (e.g., `create_token`)
2. **MCP Plugin receives request** with user's wallet address
3. **x402 Client creates payment**:
   - Gets payment requirements from vendor (402 response or discovery)
   - Creates payment signature using user's wallet
   - Includes `X-Payment` header in request

### 2. Vendor Receives Request

The vendor API endpoint:

1. **Extracts payment envelope** from `X-Payment` header
2. **Verifies payment** with facilitator:
   - POST to `https://stack.perkos.xyz/api/v2/x402/verify`
   - Sends payment envelope and requirements
3. **Settles payment** if verification succeeds:
   - POST to `https://stack.perkos.xyz/api/v2/x402/settle`
4. **Processes request** if payment is valid

### 3. Facilitator Processing

The facilitator (stack.perkos.xyz):

1. **Verifies signature** and payment details
2. **Checks balance/nonce** validity
3. **Settles payment** on-chain (gasless transaction)
4. **Returns transaction hash**

## x402 v2 Standard Format

### Payment Envelope Structure

```typescript
{
  network: "avalanche" | "base" | "celo" | ...,
  authorization: {
    from: "0x...",      // Payer wallet address
    to: "0x...",        // Vendor payment address
    value: "1000000",   // Amount in smallest token unit
    nonce: "0x...",     // Unique nonce
    validAfter: "0",    // Timestamp validity start
    validBefore: "0x...", // Timestamp validity end
  },
  signature: "0x..."    // EIP-712 signature
}
```

### Verification Request Format

```typescript
{
  x402Version: "2.0",
  paymentRequirements: {
    network: "avalanche",
    payTo: "0x...",              // Vendor payment address
    maxAmountRequired: "$0.10",  // Price in USD
  },
  paymentPayload: {
    network: "avalanche",
    payload: { /* payment envelope */ }
  }
}
```

### HTTP Headers

**Request Header:**
```
X-Payment: <JSON-encoded payment envelope>
```

**Response Headers (from facilitator):**
```
X-402-Request-Id: <request-id>
X-402-Network: <network>
X-402-Scheme: <scheme>
X-402-Is-Valid: <true|false>
X-402-Payer: <payer-address>
```

## Current Implementation Status

### ✅ Implemented

1. **Vendor Side:**
   - ✅ x402 middleware (`lib/middleware/x402.ts`)
   - ✅ Payment verification with facilitator
   - ✅ Payment settlement with facilitator
   - ✅ 402 Payment Required responses
   - ✅ API endpoints with x402 protection (`/api/tokens/create`, `/api/tokens/distribute`)

2. **Configuration:**
   - ✅ x402 config (`lib/config/x402.ts`)
   - ✅ Payment routes configuration
   - ✅ Facilitator URL: `https://stack.perkos.xyz`

### ⏳ Needs Implementation

1. **Client Side (elizaOS Agent):**
   - ⏳ x402 client library integration
   - ⏳ Payment signature creation in MCP plugin
   - ⏳ Automatic payment handling in elizaOS actions

2. **Discovery:**
   - ⏳ `.well-known/x402-payment.json` endpoint
   - ⏳ Service discovery for payment requirements

## Next Steps

1. **Create x402 Client Helper** for elizaOS actions
2. **Update elizaOS Actions** to use x402 client when calling vendor endpoints
3. **Add Payment Discovery** endpoint for clients
4. **Test End-to-End** workflow with real wallet

## References

- [x402 v2 Specification](https://github.com/coinbase/x402)
- [PerkOS-Stack Facilitator](https://stack.perkos.xyz)
- [elizaOS MCP Integration](https://docs.elizaos.ai/plugins/development)

