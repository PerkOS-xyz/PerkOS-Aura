# x402 V2 Specification Compliance

This document outlines our implementation's compliance with the [official x402 v2 specification](https://github.com/coinbase/x402/tree/v2-development).

## Specification Reference

Based on the [x402 v2-development branch](https://github.com/coinbase/x402/tree/v2-development), the protocol defines:

### Payment Required Response (402 Status)

```typescript
{
  x402Version: int,
  accepts: [paymentRequirements],
  error?: string
}
```

### paymentRequirements

```typescript
{
  scheme: string;                    // "exact" | "deferred"
  network: string;                    // CAIP-2 format (eip155:84532)
  maxAmountRequired: string;          // uint256 as string (atomic units)
  resource: string;                   // URL of resource to pay for
  description: string;                // Description of the resource
  mimeType: string;                   // MIME type of the resource response
  outputSchema?: object | null;       // Optional output schema
  payTo: string;                      // Address to pay value to
  maxTimeoutSeconds: number;          // Maximum time for server to respond
  asset: string;                      // EIP-3009 compliant ERC20 contract address
  extra?: object | null;              // For exact scheme on EVM: { name: string, version: string }
}
```

**Important**: For `exact` scheme on EVM networks, the `extra` field should contain:
```typescript
{
  name: string,    // Token name (e.g., "USD Coin")
  version: string  // Token version (e.g., "2")
}
```

### Payment Payload (X-PAYMENT Header)

The `X-PAYMENT` header should contain **base64-encoded JSON**:

```typescript
{
  x402Version: number,
  scheme: string,
  network: string,
  payload: <scheme dependent>  // For exact: { authorization, signature }
}
```

### Facilitator Endpoints

**POST /verify**
```typescript
Request: {
  x402Version: number,
  paymentHeader: string,        // Base64-encoded JSON string
  paymentRequirements: paymentRequirements
}

Response: {
  isValid: boolean,
  invalidReason: string | null
}
```

**POST /settle**
```typescript
Request: {
  x402Version: number,
  paymentHeader: string,        // Base64-encoded JSON string
  paymentRequirements: paymentRequirements
}

Response: {
  success: boolean,
  error: string | null,
  txHash: string | null,
  networkId: string | null
}
```

## Current Implementation Status

### ✅ Compliant

1. **x402Version**: Using `x402Version: 2` correctly
2. **Network Format**: Using CAIP-2 format (`eip155:84532`) for networks
3. **Scheme**: Using `"exact"` scheme correctly
4. **Asset Address**: Including `asset` field with USDC contract address
5. **maxAmountRequired**: Sending as string in atomic units
6. **Payment Payload Structure**: Correct structure with `x402Version`, `scheme`, `network`, `payload`

### ⚠️ Partially Compliant

1. **Payment Header Encoding**: 
   - **Spec**: `X-PAYMENT` should be base64-encoded JSON string
   - **Current**: Sending as plain JSON object in request body to facilitator
   - **Note**: Our facilitator accepts both formats, but we should align with spec

2. **Extra Field for Exact Scheme**:
   - **Spec**: `extra: { name: string, version: string }` for exact scheme on EVM
   - **Current**: Not including `extra` field
   - **Impact**: Token name/version should be in `extra` for proper EIP-712 domain construction

3. **Payment Required Response**:
   - **Spec**: Should return `accepts: [paymentRequirements]` array
   - **Current**: Returning single `payment` object
   - **Impact**: Should support multiple payment options

### ❌ Non-Compliant

1. **Resource Field**: 
   - **Spec**: `resource: string` (URL of resource)
   - **Current**: Not included in `paymentRequirements`
   - **Fix**: Should include endpoint URL (e.g., `/api/balance/check`)

2. **MIME Type**:
   - **Spec**: `mimeType: string`
   - **Current**: Not included
   - **Fix**: Should include (e.g., `"application/json"`)

3. **Max Timeout Seconds**:
   - **Spec**: `maxTimeoutSeconds: number`
   - **Current**: Not included
   - **Fix**: Should include reasonable timeout (e.g., `30`)

## Recommended Updates

### 1. Add `extra` Field for Token Info

```typescript
// In lib/middleware/x402.ts - verifyPayment()
paymentRequirements: {
  scheme: "exact",
  network: toCAIP2Network(routeConfig.network),
  payTo: x402Config.payTo,
  maxAmountRequired: priceAmount.toString(),
  asset: usdcAddress,
  extra: {
    name: "USD Coin",  // Token name for EIP-712 domain
    version: "2"        // Token version for EIP-712 domain
  }
}
```

### 2. Update Payment Required Response

```typescript
// In lib/middleware/x402.ts - create402Response()
return NextResponse.json(
  {
    x402Version: 2,
    accepts: [
      {
        scheme: "exact",
        network: toCAIP2Network(network),
        maxAmountRequired: parsePriceToUSDC(price).toString(),
        resource: route,  // e.g., "/api/balance/check"
        description: routeConfig.description,
        mimeType: "application/json",
        payTo: x402Config.payTo,
        maxTimeoutSeconds: 30,
        asset: getUSDCAddress(network),
        extra: {
          name: "USD Coin",
          version: "2"
        }
      }
    ]
  },
  { status: 402 }
);
```

### 3. Support Token Detection in `extra`

When using token detection, populate `extra` dynamically:

```typescript
import { detectTokenInfo } from "@/lib/utils/token-detection";

const tokenInfo = await detectTokenInfo(usdcAddress, network);
const extra = tokenInfo ? {
  name: tokenInfo.name,
  version: "2"  // Could also be detected from contract if available
} : {
  name: "USD Coin",
  version: "2"
};
```

## Testing Compliance

To verify compliance with the spec:

1. **Check Payment Requirements**: Ensure all required fields are present
2. **Verify Base64 Encoding**: If implementing base64 encoding for `X-PAYMENT` header
3. **Test Multiple Payment Options**: Support `accepts` array with multiple schemes/networks
4. **Validate Extra Field**: Ensure `extra.name` matches token's actual name for EIP-712

## References

- [x402 v2 Development Branch](https://github.com/coinbase/x402/tree/v2-development)
- [x402 Protocol Documentation](https://x402.org)

