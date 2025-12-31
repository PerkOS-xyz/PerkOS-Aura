# x402 Button-Based Payment Flow

This document describes the button-based payment approval flow for x402 payments in the elizaOS agent chat.

## Overview

Instead of automatically signing payments (which requires private keys), users click a button to sign the payment envelope with their connected wallet. The signed envelope is then used by elizaOS to make the API call.

## Workflow

```
1. User: "Create a token called MyToken"
   ↓
2. elizaOS Agent detects create_token action
   ↓
3. Agent returns payment request with button
   ↓
4. User clicks "Sign Payment" button
   ↓
5. User's wallet signs payment envelope (EIP-712)
   ↓
6. Signed envelope stored temporarily
   ↓
7. elizaOS retrieves envelope and makes API call
   ↓
8. Vendor verifies payment with facilitator
   ↓
9. Token created successfully
```

## Implementation Details

### 1. Payment Request Format

When elizaOS needs payment, it returns a special JSON format:

```json
{
  "paymentRequest": {
    "paymentId": "payment_1234567890_abc123",
    "endpoint": "/api/tokens/create",
    "method": "POST",
    "price": "$0.10",
    "network": "avalanche",
    "payTo": "0x...",
    "facilitator": "https://stack.perkos.xyz"
  }
}
```

### 2. Payment Button Component

The `PaymentButton` component (`app/components/PaymentButton.tsx`):
- Shows payment requirements
- Checks if user's wallet is connected
- Validates network matches
- Signs payment envelope using EIP-712
- Calls `onPaymentSigned` callback with envelope

### 3. Payment Storage

Signed payment envelopes are stored temporarily via `/api/payment/store`:
- Stored in-memory (expires after 5 minutes)
- Keyed by `paymentId`
- Retrieved by elizaOS when making API call

### 4. elizaOS Action Flow

The `createTokenAction` (`lib/services/elizaos/actions.ts`):

**First Call (Payment Request):**
1. Parses token parameters from user message
2. Stores parameters in state
3. Returns payment request JSON

**Second Call (After Payment Signed):**
1. Detects payment notification message
2. Retrieves stored payment envelope
3. Retrieves token parameters from state
4. Makes API call with `X-Payment` header
5. Returns success/error message

### 5. Chat Interface

The `ChatInterface` component (`app/components/ChatInterface.tsx`):
- Detects payment requests in assistant messages
- Renders `PaymentButton` component
- Handles payment signing callback
- Stores signed envelope
- Notifies elizaOS that payment is ready

## API Endpoints

### GET /api/payment/requirements
Get payment requirements for an endpoint.

**Query Parameters:**
- `endpoint`: API endpoint path (e.g., `/api/tokens/create`)
- `method`: HTTP method (default: `POST`)

**Response:**
```json
{
  "paymentRequired": true,
  "requirements": {
    "endpoint": "/api/tokens/create",
    "method": "POST",
    "price": "$0.10",
    "network": "avalanche",
    "payTo": "0x...",
    "facilitator": "https://stack.perkos.xyz"
  }
}
```

### POST /api/payment/store
Store a signed payment envelope.

**Request Body:**
```json
{
  "paymentId": "payment_1234567890_abc123",
  "envelope": {
    "network": "avalanche",
    "authorization": { ... },
    "signature": "0x..."
  },
  "endpoint": "/api/tokens/create"
}
```

### GET /api/payment/store?paymentId=...
Retrieve a stored payment envelope.

**Response:**
```json
{
  "success": true,
  "envelope": { ... },
  "endpoint": "/api/tokens/create"
}
```

## Payment Envelope Format

The payment envelope follows x402 v2 standard:

```typescript
{
  network: "avalanche",
  authorization: {
    from: "0x...",      // User's wallet address
    to: "0x...",        // Vendor payment address
    value: "100000",    // Amount in USDC smallest unit (6 decimals)
    nonce: "0x...",     // Random 32-byte nonce
    validAfter: "0",    // Timestamp validity start
    validBefore: "1234567890", // Timestamp validity end (1 hour)
  },
  signature: "0x..."    // EIP-712 signature
}
```

## EIP-712 Signature

The payment is signed using EIP-712 with:

**Domain:**
```typescript
{
  name: "USD Coin",
  version: "2",
  chainId: 43114, // Avalanche C-Chain
  verifyingContract: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E" // USDC address
}
```

**Types:**
```typescript
{
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ]
}
```

## Security Considerations

1. **Payment Envelopes Expire**: Stored envelopes expire after 5 minutes
2. **One-Time Use**: Envelopes should be used once (nonce prevents replay)
3. **Network Validation**: Button checks user is on correct network
4. **Wallet Connection**: Requires active wallet connection

## Testing

To test the flow:

1. Connect wallet in dashboard
2. Type: "Create a token called TestToken with symbol TEST"
3. Click "Sign Payment" button when it appears
4. Approve signature in wallet
5. Wait for token creation confirmation

## Future Improvements

- [ ] Support for multiple payment requests in one conversation
- [ ] Payment history tracking
- [ ] Automatic retry on payment failure
- [ ] Payment amount preview before signing
- [ ] Support for batch payments

