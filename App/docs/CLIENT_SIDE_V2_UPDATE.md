# Client-Side x402 V2 Header Updates

## Summary

Updated all client-side code in PerkOS-Token-Api-Service to use x402 v2 headers (`PAYMENT-SIGNATURE` instead of deprecated `X-Payment`).

## Files Updated

### 1. ✅ `lib/utils/x402-payment.ts`
**Added**: `formatPaymentSignature()` helper function
- Formats payment payload according to x402 v2 spec
- Supports base64 encoding (recommended) or plain JSON
- Converts network to CAIP-2 format automatically

```typescript
export function formatPaymentSignature(
  envelope: PaymentEnvelope,
  network: string,
  encodeBase64: boolean = true
): string
```

### 2. ✅ `lib/services/elizaos/actions.ts`
**Updated**: Two locations using payment headers
- `createTokenAction`: Now uses `PAYMENT-SIGNATURE` header
- `checkBalanceAction`: Now uses `PAYMENT-SIGNATURE` header

**Before**:
```typescript
headers: {
  "X-Payment": JSON.stringify(envelope)
}
```

**After**:
```typescript
const { formatPaymentSignature } = await import("@/lib/utils/x402-payment");
const paymentSignature = formatPaymentSignature(envelope, x402Config.network, true);

headers: {
  "PAYMENT-SIGNATURE": paymentSignature // x402 v2 header
}
```

### 3. ✅ `scripts/test-balance-payment.ts`
**Updated**: Test script now uses `PAYMENT-SIGNATURE` header
- Imports `formatPaymentSignature` helper
- Uses base64-encoded payment signature
- Logs that it's using x402 v2 header

### 4. ✅ `scripts/README.md`
**Updated**: Documentation to reflect `PAYMENT-SIGNATURE` header usage

## Implementation Details

### Payment Payload Structure (x402 v2)

The `formatPaymentSignature()` function creates the correct x402 v2 payload structure:

```typescript
{
  x402Version: 2,
  scheme: "exact",
  network: "eip155:84532", // CAIP-2 format
  payload: {
    network: "avalanche", // Legacy format (for envelope)
    authorization: { ... },
    signature: "0x..."
  }
}
```

### Base64 Encoding

By default, the payment signature is base64-encoded (per x402 v2 spec):
```typescript
const encoded = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
```

This can be disabled for backward compatibility:
```typescript
formatPaymentSignature(envelope, network, false) // Plain JSON
```

### Server-Side Compatibility

The server-side middleware (`lib/middleware/x402.ts`) supports both:
1. `PAYMENT-SIGNATURE` header (V2, preferred)
2. `X-Payment` header (V1, backward compatibility)

It also handles both base64-encoded and plain JSON formats.

## Testing

To test the updated implementation:

```bash
# Test balance check with x402 v2 headers
npm run test:balance

# The script will now use PAYMENT-SIGNATURE header
```

## Benefits

1. ✅ **Standards Compliant**: Follows official x402 v2 specification
2. ✅ **Future-Proof**: Uses modern HTTP header conventions
3. ✅ **Backward Compatible**: Server still accepts V1 headers
4. ✅ **Consistent**: All client code uses the same helper function
5. ✅ **Type-Safe**: TypeScript types ensure correct payload structure

## References

- [x402 V2 Launch Announcement](https://www.x402.org/writing/x402-v2-launch)
- [x402 V2 Development Branch](https://github.com/coinbase/x402/tree/v2-development)
- [x402 V2 Headers Documentation](./X402_V2_HEADERS.md)

