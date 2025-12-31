# x402 V2 Header Standards

Based on the [x402 v2 launch announcement](https://www.x402.org/writing/x402-v2-launch), V2 modernizes HTTP headers by:

> **Modernized HTTP headers:**
> - Removes deprecated X-* headers for improved compatibility
> - Uses more modern PAYMENT-SIGNATURE, PAYMENT-REQUIRED, PAYMENT-RESPONSE
> - _\[coming very soon\]_ New SIGN-IN-WITH-X header

## Header Changes

### V1 (Deprecated) → V2 (Current)

| V1 Header | V2 Header | Purpose |
|-----------|-----------|---------|
| `X-Payment` | `PAYMENT-SIGNATURE` | Client sends signed payment envelope |
| `X-Payment-Required` | `PAYMENT-REQUIRED` | Server indicates payment needed (402 response) |
| `X-Payment-Response` | `PAYMENT-RESPONSE` | Server returns transaction details (200 response) |

## Implementation Details

### 1. PAYMENT-SIGNATURE Header

**Client → Server**: Contains the signed payment envelope

```typescript
// V2: Base64-encoded JSON (recommended)
const paymentPayload = {
  x402Version: 2,
  scheme: "exact",
  network: "eip155:84532",
  payload: { authorization, signature }
};
const header = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
headers: { "PAYMENT-SIGNATURE": header }

// Backward compatibility: Also accepts plain JSON
headers: { "PAYMENT-SIGNATURE": JSON.stringify(paymentPayload) }
```

**Server Extraction**:
```typescript
const header = request.headers.get("payment-signature");
// Try base64 decode first, fallback to JSON parse
```

### 2. PAYMENT-REQUIRED Header

**Server → Client**: Sent with 402 status code

```typescript
const paymentRequired = {
  x402Version: 2,
  accepts: [paymentRequirements]
};
const header = Buffer.from(JSON.stringify(paymentRequired)).toString("base64");

return NextResponse.json(
  { error: "Payment Required" },
  {
    status: 402,
    headers: { "PAYMENT-REQUIRED": header }
  }
);
```

**Benefits**:
- Response body is now free for other purposes
- Payment data is in headers (more HTTP-standard)
- Easier to parse and cache

### 3. PAYMENT-RESPONSE Header

**Server → Client**: Sent with 200 status after successful payment

```typescript
const paymentResponse = {
  success: true,
  transactionHash: "0x...",
  network: "eip155:84532"
};
const header = Buffer.from(JSON.stringify(paymentResponse)).toString("base64");

return NextResponse.json(
  { data: "..." },
  {
    status: 200,
    headers: { "PAYMENT-RESPONSE": header }
  }
);
```

## Migration Guide

### For Clients

**Before (V1)**:
```typescript
headers: {
  "X-Payment": JSON.stringify(envelope)
}
```

**After (V2)**:
```typescript
// Recommended: Base64-encoded
const encoded = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
headers: {
  "PAYMENT-SIGNATURE": encoded
}

// Or plain JSON (backward compatible)
headers: {
  "PAYMENT-SIGNATURE": JSON.stringify(paymentPayload)
}
```

### For Servers

**Before (V1)**:
```typescript
// Extract from X-Payment
const envelope = JSON.parse(request.headers.get("x-payment"));

// Return 402 with JSON body
return NextResponse.json({ payment: {...} }, { status: 402 });
```

**After (V2)**:
```typescript
// Extract from PAYMENT-SIGNATURE (supports both base64 and JSON)
const header = request.headers.get("payment-signature");
const envelope = parsePaymentSignature(header);

// Return 402 with PAYMENT-REQUIRED header
const paymentRequired = Buffer.from(JSON.stringify({...})).toString("base64");
return NextResponse.json(
  { error: "Payment Required" },
  {
    status: 402,
    headers: { "PAYMENT-REQUIRED": paymentRequired }
  }
);
```

## Backward Compatibility

Our implementation supports both V1 and V2 headers:

1. **PAYMENT-SIGNATURE**: Tries base64 decode first, falls back to JSON parse
2. **X-Payment**: Still supported for backward compatibility
3. **PAYMENT-REQUIRED**: New V2 header, but 402 JSON body still works

## References

- [x402 V2 Launch Announcement](https://www.x402.org/writing/x402-v2-launch)
- [x402 V2 Development Branch](https://github.com/coinbase/x402/tree/v2-development)

