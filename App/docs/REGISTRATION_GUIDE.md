# Vendor Registration Guide

This guide explains how the PerkOS Vendor API registers with the PerkOS-Stack facilitator.

## Registration Process

The registration uses **Direct Registration Mode**, which means we provide the full service definition including all endpoints, rather than relying on discovery of a `/.well-known/x402` file.

### Registration Endpoint

**POST** `https://stack.perkos.xyz/api/vendors/register`

### Required Fields

- `url` - Your service URL (from `NEXT_PUBLIC_SERVICE_URL`)
- `walletAddress` - Payment wallet address (from `NEXT_PUBLIC_PAY_TO_ADDRESS`)
- `network` - Blockchain network (e.g., "base", "avalanche", "celo")
- `endpoints` - Array of endpoint definitions (at least one required)

### Optional Fields

- `name` - Service name
- `description` - Service description
- `category` - One of: "api", "nft", "defi", "gaming", "dao", "ai", "data", "other"
- `tags` - Array of tags
- `iconUrl` - Service icon URL
- `websiteUrl` - Website URL
- `docsUrl` - Documentation URL
- `priceUsd` - Default price in USD
- `facilitatorUrl` - Facilitator URL (usually same as Stack URL)

### Endpoint Definition Format

Each endpoint in the `endpoints` array must have:

```typescript
{
  path: string;                    // e.g., "/api/tokens/create"
  method: "GET" | "POST" | "PUT" | "DELETE";
  description: string;              // Human-readable description
  priceUsd: string;                 // Price in USD (use "0" for free endpoints)
  inputSchema?: object;             // JSON Schema for request body
  outputSchema?: object;            // JSON Schema for response
}
```

### Example Registration Payload

```json
{
  "url": "https://your-api.com",
  "name": "PerkOS Vendor API",
  "description": "ERC20 Token Creation and Distribution Service",
  "category": "api",
  "tags": ["erc20", "tokens", "x402"],
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
  "network": "avalanche",
  "facilitatorUrl": "https://stack.perkos.xyz",
  "endpoints": [
    {
      "path": "/api/tokens/create",
      "method": "POST",
      "description": "Create a new ERC20 token",
      "priceUsd": "0.10",
      "inputSchema": {
        "type": "object",
        "required": ["name", "symbol", "totalSupply"],
        "properties": {
          "name": { "type": "string" },
          "symbol": { "type": "string" },
          "totalSupply": { "type": "string" }
        }
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "success": { "type": "boolean" },
          "token": { "type": "object" }
        }
      }
    }
  ]
}
```

### Response Format

**Success Response:**
```json
{
  "success": true,
  "vendor": {
    "id": "uuid-here",
    "name": "PerkOS Vendor API",
    "url": "https://your-api.com",
    "status": "active",
    ...
  },
  "mode": "direct"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Implementation Details

### Registration Service

The `RegistrationService` class (`lib/services/RegistrationService.ts`) handles:

1. **Building Endpoints** - Automatically builds endpoint definitions from `x402.ts` config
2. **Registration** - Sends registration request to facilitator
3. **Status Checking** - Checks if service is already registered
4. **Health Checking** - Verifies facilitator is available

### API Routes

All registration calls go through server-side API routes to avoid CORS issues:

- **POST** `/api/admin/register` - Register the service
- **GET** `/api/admin/register/status` - Check registration status
- **GET** `/api/admin/facilitator/health` - Check facilitator health

### Client-Side Usage

The admin pages (`/admin` and `/admin/register`) use these API routes:

```typescript
// Register service
const response = await fetch("/api/admin/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
});
const result = await response.json();

// Check status
const statusResponse = await fetch("/api/admin/register/status");
const status = await statusResponse.json();
```

## Registration Flow

1. **Admin clicks "Register Service"** in `/admin/register`
2. **Client calls** `/api/admin/register` (POST)
3. **Server-side route** calls `RegistrationService.register()`
4. **RegistrationService** builds endpoint definitions from config
5. **POST request** sent to `https://stack.perkos.xyz/api/vendors/register`
6. **PerkOS-Stack** validates and stores vendor in database
7. **Response** returned to client with vendor ID

## Checking Registration Status

The facilitator provides a list of all registered vendors at:

**GET** `https://stack.perkos.xyz/api/vendors`

Response format:
```json
{
  "success": true,
  "vendors": [
    {
      "id": "uuid",
      "name": "Service Name",
      "url": "https://service.com",
      "status": "active",
      ...
    }
  ],
  "pagination": { ... }
}
```

The `checkStatus()` method searches this list for a vendor matching our `NEXT_PUBLIC_SERVICE_URL`.

## Troubleshooting

### CORS Errors

All facilitator API calls must go through server-side routes. Never call `stack.perkos.xyz` directly from client-side code.

### Already Registered Error

If you see "Vendor with this URL is already registered", the service is already in the facilitator's database. You can:
- Check status to see the existing registration
- Update the service URL if you want a new registration
- Contact facilitator admin to remove the old registration

### Health Check Fails

The health endpoint is at `/api/v2/x402/health` (not `/api/health`). Make sure you're using the correct endpoint.

## Environment Variables

Required for registration:

- `NEXT_PUBLIC_SERVICE_URL` - Your service URL (must be publicly accessible)
- `NEXT_PUBLIC_PAY_TO_ADDRESS` - Payment wallet address
- `NEXT_PUBLIC_NETWORK` - Blockchain network (default: "avalanche")
- `FACILITATOR_URL` or `NEXT_PUBLIC_FACILITATOR_URL` - Stack URL (default: "https://stack.perkos.xyz")

