# AuraApp - Technical Documentation

This directory contains the Next.js 14 application for the Aura AI Vendor Service.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev

# Build for production
npm run build && npm start
```

## Project Structure

```
AuraApp/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin dashboard (wallet-protected)
│   ├── api/                      # API routes
│   │   ├── ai/                   # 20 AI service endpoints
│   │   │   ├── analyze/          # Image analysis (GPT-4o vision)
│   │   │   ├── generate/         # Image generation (FLUX)
│   │   │   ├── transcribe/       # Audio transcription (Whisper)
│   │   │   ├── synthesize/       # Text-to-speech
│   │   │   ├── summarize/        # Text summarization
│   │   │   ├── translate/        # Translation (50+ languages)
│   │   │   ├── sentiment/        # Sentiment analysis
│   │   │   ├── moderate/         # Content moderation
│   │   │   ├── simplify/         # Text simplification
│   │   │   ├── extract/          # Entity extraction
│   │   │   ├── ocr/              # OCR text extraction
│   │   │   ├── email/generate/   # Email generation
│   │   │   ├── product/describe/ # Product descriptions
│   │   │   ├── seo/optimize/     # SEO optimization
│   │   │   ├── quiz/generate/    # Quiz generation
│   │   │   ├── code/generate/    # Code generation
│   │   │   ├── code/review/      # Code review
│   │   │   ├── sql/generate/     # SQL query generation
│   │   │   ├── regex/generate/   # Regex generation
│   │   │   └── docs/generate/    # API docs generation
│   │   ├── chat/                 # Chat API
│   │   │   ├── route.ts          # POST: send message, GET: history
│   │   │   ├── image/            # Image analysis with x402 payment
│   │   │   └── audio/            # Audio transcription with x402 payment
│   │   ├── conversations/        # Conversation CRUD
│   │   ├── projects/             # Project management
│   │   ├── payment/              # x402 payment routes
│   │   │   ├── requirements/     # Get payment requirements
│   │   │   └── store/            # Store payment records
│   │   ├── admin/                # Admin API routes
│   │   └── balance/check/        # USDC balance check
│   ├── dashboard/                # Main dashboard with chat
│   │   ├── page.tsx              # Dashboard with projects sidebar
│   │   ├── docs/                 # API documentation viewer
│   │   └── transactions/         # Transaction history
│   ├── docs/                     # Public API docs
│   ├── components/               # Shared React components
│   │   ├── Header.tsx            # Navigation with wallet connect
│   │   ├── ChatInterface.tsx     # Main chat component
│   │   ├── PaymentButton.tsx     # x402 payment signing
│   │   ├── NetworkSelector.tsx   # Multi-chain selector
│   │   └── ui/                   # shadcn/ui components
│   ├── layout.tsx                # Root layout with providers
│   └── page.tsx                  # Landing page
├── lib/                          # Shared libraries
│   ├── config/                   # Configuration
│   │   ├── x402.ts               # x402 payment routes & pricing
│   │   ├── ai-services.ts        # AI service configuration
│   │   └── networks.ts           # Supported networks
│   ├── db/                       # Database clients
│   │   └── firebase.ts           # Firebase/Firestore client
│   ├── middleware/               # Custom middleware
│   │   └── x402.ts               # x402 payment verification
│   ├── services/                 # Business logic
│   │   ├── AIService.ts          # Multi-provider AI service
│   │   ├── ElizaServiceV2.ts     # ElizaOS chat service
│   │   ├── RegistrationService.ts # Facilitator registration
│   │   └── elizaos/              # ElizaOS integration
│   │       ├── AgentRuntimeManager.ts
│   │       ├── FirebaseAdapter.ts
│   │       └── character.ts
│   └── utils/                    # Utility functions
│       ├── x402-payment.ts       # x402 payment utilities
│       └── token-detection.ts    # ERC20 token info detection
├── scripts/                      # Development scripts
│   ├── test-all-services.ts      # Test all 20 endpoints
│   └── test-*.ts                 # Individual test scripts
├── public/                       # Static assets
├── next.config.mjs               # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
└── tsconfig.json                 # TypeScript configuration
```

## Environment Variables

### Required

```bash
# AI Providers
OPENROUTER_API_KEY=sk-or-v1-...     # OpenRouter for text AI
REPLICATE_API_TOKEN=r8_...           # Replicate for media AI

# Firebase (Chat Persistence)
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Thirdweb (Wallet)
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=...
THIRDWEB_SECRET_KEY=...

# x402 Payment
NEXT_PUBLIC_PAY_TO_ADDRESS=0x...     # Payment recipient
NEXT_PUBLIC_NETWORK=avalanche        # Default network
NEXT_PUBLIC_PAYMENT_PRICE_USD=0.01   # Default price

# Service URLs
NEXT_PUBLIC_SERVICE_URL=http://localhost:3000
NEXT_PUBLIC_FACILITATOR_URL=http://localhost:3005
```

### Optional

```bash
ADMIN_WALLETS=0x...,0x...            # Admin wallet addresses
OPENAI_API_KEY=sk-...                # Direct OpenAI (optional)
```

## API Endpoints

### AI Services (20 endpoints)

All AI endpoints require x402 v2 payment. First request returns 402 with payment requirements.

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/ai/analyze` | POST | $0.05 | Image analysis (GPT-4o vision) |
| `/api/ai/generate` | POST | $0.03 | Image generation (FLUX) |
| `/api/ai/transcribe` | POST | $0.02 | Audio transcription (Whisper) |
| `/api/ai/synthesize` | POST | $0.02 | Text-to-speech |
| `/api/ai/summarize` | POST | $0.03 | Text summarization |
| `/api/ai/translate` | POST | $0.03 | Translation (50+ languages) |
| `/api/ai/sentiment` | POST | $0.02 | Sentiment analysis |
| `/api/ai/moderate` | POST | $0.01 | Content moderation |
| `/api/ai/simplify` | POST | $0.02 | Text simplification |
| `/api/ai/extract` | POST | $0.03 | Entity extraction |
| `/api/ai/ocr` | POST | $0.01 | OCR text extraction |
| `/api/ai/email/generate` | POST | $0.02 | Email generation |
| `/api/ai/product/describe` | POST | $0.03 | Product descriptions |
| `/api/ai/seo/optimize` | POST | $0.01 | SEO optimization |
| `/api/ai/quiz/generate` | POST | $0.02 | Quiz generation |
| `/api/ai/code/generate` | POST | $0.02 | Code generation |
| `/api/ai/code/review` | POST | $0.01 | Code review |
| `/api/ai/sql/generate` | POST | $0.02 | SQL query generation |
| `/api/ai/regex/generate` | POST | $0.01 | Regex generation |
| `/api/ai/docs/generate` | POST | $0.02 | API docs generation |

### Chat API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Send message, get AI response |
| `/api/chat` | GET | Get conversation history |
| `/api/chat/image` | POST | Image analysis with x402 payment |
| `/api/chat/audio` | POST | Audio transcription with x402 payment |

### Management API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/conversations` | GET | List conversations |
| `/api/conversations/[id]` | DELETE | Delete conversation |
| `/api/projects` | GET/POST | List/create projects |
| `/api/projects/[id]` | GET/PUT/DELETE | Project CRUD |
| `/api/payment/requirements` | GET | Get payment requirements |
| `/api/admin/register` | POST | Register with facilitator |

## x402 Payment Flow

### 1. Client Request (No Payment)

```typescript
const response = await fetch('/api/ai/analyze', {
  method: 'POST',
  body: JSON.stringify({ image: '...' })
});
// Returns 402 with PAYMENT-REQUIRED header
```

### 2. Parse Payment Requirements

```typescript
const paymentRequired = response.headers.get('PAYMENT-REQUIRED');
const requirements = JSON.parse(atob(paymentRequired));
// { accepts: [{ network, payTo, maxAmountRequired, extra: { name, version } }] }
```

### 3. Sign Payment (EIP-712)

```typescript
import { createEIP712Domain, TRANSFER_WITH_AUTHORIZATION_TYPES } from '@perkos/middleware-x402';

const domain = createEIP712Domain(network, usdcAddress, tokenName);
const signature = await wallet.signTypedData({
  domain,
  types: TRANSFER_WITH_AUTHORIZATION_TYPES,
  primaryType: 'TransferWithAuthorization',
  message: authorization
});
```

### 4. Retry with Payment

```typescript
const response = await fetch('/api/ai/analyze', {
  method: 'POST',
  headers: {
    'PAYMENT-SIGNATURE': btoa(JSON.stringify(envelope))
  },
  body: JSON.stringify({ image: '...' })
});
// Returns 200 with PAYMENT-RESPONSE header containing transactionHash
```

## Network-Specific Configuration

### Supported Networks

| Network | Chain ID | USDC Address | Token Name | Version |
|---------|----------|--------------|------------|---------|
| Avalanche | 43114 | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` | USD Coin | 2 |
| Base | 8453 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | USD Coin | 2 |
| Celo | 42220 | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` | USDC | 2 |

### EIP-712 Domain (Celo Example)

```typescript
const domain = {
  name: "USDC",           // Celo uses "USDC", others use "USD Coin"
  version: "2",           // All Circle native USDC uses version "2"
  chainId: 42220,
  verifyingContract: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C"
};
```

## Development Scripts

```bash
# Run all 20 AI endpoint tests
npm run test:all

# Test specific services
npm run test:ai           # AI endpoints
npm run test:analyze      # Image analysis
npm run test:synthesize   # Text-to-speech
npm run test:transcribe   # Audio transcription
npm run test:chat         # Chat functionality

# Check USDC balance
npm run test:balance
```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `next` | React framework (v14) |
| `@perkos/middleware-x402` | x402 payment middleware |
| `openai` | OpenRouter client (OpenAI-compatible) |
| `replicate` | Media generation API |
| `thirdweb` | Wallet integration |
| `firebase` / `firebase-admin` | Firestore database |
| `@elizaos/core` | Chat agent runtime |
| `viem` | Ethereum utilities |

## Build Notes

### TypeScript Workarounds

The project includes workarounds for third-party TypeScript issues:

**next.config.mjs**:
```javascript
typescript: {
  ignoreBuildErrors: true, // @noble/curves broken exports
}
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "allowImportingTsExtensions": true
  },
  "exclude": ["node_modules/@noble/curves"]
}
```

**ElizaOS Import**:
```typescript
// Use require() due to broken ESM exports
const { AgentRuntime } = require("@elizaos/core");
```

## Troubleshooting

### "Signer does not match 'from' address" on Celo

Ensure `@perkos/middleware-x402@1.2.2+` is installed. Celo uses different EIP-712 domain:
- Token name: `"USDC"` (not `"USD Coin"`)
- Version: `"2"`

### Build Errors with @noble/curves

Add to `tsconfig.json`:
```json
{
  "exclude": ["node_modules/@noble/curves"]
}
```

### ElizaOS Import Errors

Use `require()` pattern instead of ESM imports:
```typescript
const { AgentRuntime, Memory } = require("@elizaos/core");
```

### Payment Not Required

Check that route is configured in `lib/config/x402.ts`:
```typescript
export const paymentRoutes: Record<string, PaymentRouteConfig> = {
  "/api/ai/analyze": { priceUsd: 0.05 },
  // ...
};
```

## Related Documentation

- [Main README](../README.md) - Project overview and architecture
- [CLAUDE.md](../CLAUDE.md) - AI assistant integration guide
- [x402 Protocol](https://github.com/coinbase/x402) - Payment protocol spec
