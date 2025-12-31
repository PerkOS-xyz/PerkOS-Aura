# PerkOS-Vendor-Service-AI

A production-ready AI vendor service providing image analysis, image generation, audio transcription, and text-to-speech capabilities, monetized via the x402 v2 micropayment protocol.

## Features

- 🎨 **Image Generation** - DALL-E 3 powered image creation
- 🔍 **Image Analysis** - GPT-4o vision for image understanding
- 🎙️ **Audio Transcription** - Whisper for accurate speech-to-text
- 🔊 **Text-to-Speech** - High-quality voice synthesis
- 💳 **x402 v2 Payments** - Gasless micropayments via stack.perkos.xyz
- 🤖 **ElizaOS Integration** - Conversational AI agent interface
- 🔌 **MCP Server** - Model Context Protocol for AI agent integration

## Architecture

```
Frontend (Next.js 14)
├── ChatInterface - ElizaOS conversational UI
├── PaymentButton - Web3 payment signing
└── Dashboard - User workspace

Backend
├── AIService - OpenAI SDK integration
├── ElizaOS AgentRuntime - Per-user AI agents
├── x402 Middleware - Payment verification
└── RegistrationService - Service discovery
```

## Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API key
- Wallet with USDC (for testing payments)
- x402 Facilitator access (stack.perkos.xyz)

### Installation

```bash
cd PerkOS-Vendor-Service-AI/App
npm install
```

### Environment Setup

Create `.env` file:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# x402 Payment Configuration
NEXT_PUBLIC_PAY_TO_ADDRESS=0x...
NEXT_PUBLIC_FACILITATOR_URL=https://stack.perkos.xyz
NEXT_PUBLIC_NETWORK=avalanche
NEXT_PUBLIC_SERVICE_URL=http://localhost:3000

# AI Service Pricing (USD)
NEXT_PUBLIC_AI_ANALYZE_PRICE_USD=0.05
NEXT_PUBLIC_AI_GENERATE_PRICE_USD=0.10
NEXT_PUBLIC_AI_TRANSCRIBE_PRICE_USD=0.05
NEXT_PUBLIC_AI_SYNTHESIZE_PRICE_USD=0.05

# Supabase (for ElizaOS memory)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Optional: Alternative AI provider
OPENROUTER_API_KEY=sk-or-...
```

### Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Usage

### Direct API Access

```bash
# Generate an image
curl -X POST http://localhost:3000/api/ai/generate \
  -H "Content-Type: application/json" \
  -H "PAYMENT-SIGNATURE: <signed-envelope>" \
  -d '{"prompt": "A futuristic city at sunset"}'

# Analyze an image
curl -X POST http://localhost:3000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -H "PAYMENT-SIGNATURE: <signed-envelope>" \
  -d '{"image": "<base64-image>", "question": "What is in this image?"}'
```

### Conversational Interface

1. Connect wallet at `/dashboard`
2. Chat with AI agent
3. Request AI operation (e.g., "Generate an image of a sunset")
4. Sign payment when prompted
5. Receive results in chat

### Testing Payment Flow

```bash
# Test image generation endpoint
npm run test:ai
```

## API Endpoints

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/ai/analyze` | POST | $0.05 | Analyze image with GPT-4o |
| `/api/ai/generate` | POST | $0.10 | Generate image with DALL-E 3 |
| `/api/ai/transcribe` | POST | $0.05 | Transcribe audio with Whisper |
| `/api/ai/synthesize` | POST | $0.05 | Synthesize speech with TTS-1 |
| `/api/mcp` | POST | - | MCP server for AI agents |
| `/api/health` | GET | - | Service health check |

## x402 Payment Flow

1. **Request** → Service returns 402 with `PAYMENT-REQUIRED` header
2. **Sign** → User signs payment envelope with wallet
3. **Verify** → Service verifies payment with facilitator
4. **Settle** → Payment settled on-chain (gasless)
5. **Execute** → AI operation performed
6. **Response** → Result returned with `PAYMENT-RESPONSE` header

## ElizaOS Actions

The conversational agent supports:

- `generate_image` - Creates DALL-E 3 images
- `analyze_image` - Analyzes images with GPT-4o
- `synthesize_speech` - Converts text to speech
- `process_payment` - Handles payment confirmations

## Project Structure

```
App/
├── app/                      # Next.js pages & API routes
│   ├── api/                 # API endpoints
│   │   ├── ai/             # AI service endpoints
│   │   ├── chat/           # ElizaOS chat
│   │   ├── mcp/            # MCP server
│   │   └── payment/        # Payment utilities
│   ├── components/         # React components
│   └── dashboard/          # User dashboard
├── lib/                     # Core logic
│   ├── config/             # Configuration
│   ├── middleware/         # x402 middleware
│   ├── services/           # Business logic
│   │   ├── AIService.ts   # OpenAI integration
│   │   ├── ElizaServiceV2.ts
│   │   ├── RegistrationService.ts
│   │   └── elizaos/       # ElizaOS components
│   └── utils/              # Utilities
└── scripts/                # Test scripts
```

## Testing

```bash
# TypeScript validation
npm run typecheck

# Test AI endpoints
npm run test:ai

# Test balance check (legacy)
npm run test:balance
```

## Deployment

1. Set production environment variables
2. Build: `npm run build`
3. Deploy to Vercel, Railway, or similar
4. Register with facilitator via `RegistrationService`
5. Configure sponsor wallet for gas payments

## Security

- 🔐 OpenAI API key stored server-side only
- ✅ All AI endpoints protected by x402 payment
- 🔒 User isolation via wallet address
- ✨ Private key management (Foundry/Keychain/encrypted)
- 🛡️ Input validation with Zod schemas

## License

MIT License - see [LICENSE](LICENSE)

## Reference

This project follows the x402 v2 specification and uses PerkOS-Vendor-Service-Token as a reference implementation.

**x402 v2 Documentation**: https://www.x402.org/  
**PerkOS Stack**: https://stack.perkos.xyz  
**ElizaOS**: https://docs.elizaos.ai

## Support

For issues or questions, please open an issue on GitHub or contact the maintainers.
