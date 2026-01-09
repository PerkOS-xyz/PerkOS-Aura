# Aura - Intelligent Vendor Service

**Aura** is a professional AI vendor service for PerkOS, powered by GPT-4o, DALL-E 3, and Whisper with x402 v2 micropayments. It provides 20 AI endpoints for vision, NLP, business tools, and developer utilities with a high-performance "Neon Horizon" identity.

## 🚀 Features

### 20 AI Service Endpoints

**Vision & Audio (4)**

- 🖼️ Image Analysis - GPT-4o vision analysis ($0.05)
- 🎨 Image Generation - DALL-E 3 creation ($0.15)
- 🎤 Audio Transcription - Whisper transcription ($0.04)
- 🔊 Text-to-Speech - Natural voice synthesis ($0.04)

**NLP Services (6)**

- 📝 Text Summarization ($0.03)
- 🌐 Translation - 50+ languages ($0.03)
- 😊 Sentiment Analysis ($0.02)
- 🛡️ Content Moderation ($0.01)
- ✨ Text Simplification ($0.02)
- 🏷️ Entity Extraction ($0.03)

**Business Tools (3)**

- ✉️ Email Generation ($0.02)
- 📦 Product Descriptions ($0.03)
- 🔍 SEO Optimization ($0.05)

**Developer Tools (5)**

- 💻 Code Generation ($0.08)
- 🔎 Code Review ($0.05)
- 🗄️ SQL Query Generation ($0.03)
- 🔤 Regex Generator ($0.02)
- 📚 API Documentation ($0.05)

**Advanced (2)**

- 📄 OCR Text Extraction ($0.04)
- 📝 Quiz Generator ($0.05)

### Core Features

- ✅ **x402 v2 Payment Integration** - Gasless crypto micropayments with transaction tracking
- ✅ **AI Chat Interface** - Conversational AI with ElizaOS runtime and persistent memory
- ✅ **Image Analysis with Payment** - Upload images, pay via x402, get AI analysis with "Paid" badge
- ✅ **Admin Dashboard** - Service management and registration
- ✅ **API Documentation** - Interactive endpoint explorer
- ✅ **Project System** - Organize conversations into projects with wallet isolation
- ✅ **Firebase Persistence** - Firestore-backed conversation history with transaction data
- ✅ **Marketplace Integration** - PerkOS-Stack facilitator registration
- ✅ **Multi-Chain Support** - Avalanche, Base, Celo
- ✅ **Type-Safe** - Full TypeScript implementation

## 🏗️ Architecture

### System Overview

```mermaid
graph TB
    subgraph Client["Client Layer"]
        UI[React Dashboard]
        Wallet[Thirdweb Wallet]
    end

    subgraph Aura["Aura Service"]
        Next[Next.js 15 App]
        Chat[Chat API]
        AI[AI Endpoints x20]
        X402[x402 Middleware]
        Eliza[ElizaOS Runtime]
    end

    subgraph External["External Services"]
        OpenRouter[OpenRouter API]
        Replicate[Replicate API]
        Firebase[Firebase/Firestore]
        Facilitator[PerkOS-Stack Facilitator]
    end

    UI --> Next
    Wallet --> X402
    Next --> Chat
    Next --> AI
    Chat --> Eliza
    Eliza --> Firebase
    AI --> OpenRouter
    AI --> Replicate
    X402 --> Facilitator
```

### x402 Payment Flow

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant Aura
    participant Facilitator
    participant Blockchain

    User->>Client: Request AI Service
    Client->>Aura: POST /api/chat/image (no payment)
    Aura->>Client: 402 + PAYMENT-REQUIRED header
    Note over Client: Decode header, extract tokenName
    Client->>User: Show PaymentButton
    User->>Client: Sign EIP-712 payment
    Client->>Aura: POST + PAYMENT-SIGNATURE header
    Aura->>Facilitator: Verify payment
    Facilitator->>Aura: Valid
    Aura->>Aura: Execute AI operation
    Aura->>Facilitator: Settle payment
    Facilitator->>Blockchain: Submit transaction
    Blockchain->>Facilitator: Transaction hash
    Facilitator->>Aura: Settlement confirmed
    Aura->>Client: Response + PAYMENT-RESPONSE header
    Note over Client: Display "Paid" badge with tx link
```

### ElizaOS Chat Architecture

```mermaid
graph LR
    subgraph Dashboard
        ChatUI[ChatInterface.tsx]
        Projects[Project Sidebar]
    end

    subgraph API["API Layer"]
        ChatAPI[/api/chat]
        ImageAPI[/api/chat/image]
        ConvAPI[/api/conversations]
    end

    subgraph ElizaOS["ElizaOS Layer"]
        Runtime[AgentRuntime]
        Character[Character Config]
        Actions[AI Actions]
    end

    subgraph Storage["Storage Layer"]
        Adapter[FirebaseAdapter]
        Firestore[(Firestore)]
    end

    ChatUI --> ChatAPI
    ChatUI --> ImageAPI
    Projects --> ConvAPI
    ChatAPI --> Runtime
    ImageAPI --> Adapter
    Runtime --> Character
    Runtime --> Actions
    Runtime --> Adapter
    Adapter --> Firestore
```

### Token Detection for EIP-712 Signatures

```mermaid
flowchart TD
    A[Client receives 402] --> B[Decode PAYMENT-REQUIRED header]
    B --> C[Extract tokenName from accepts.extra.name]
    C --> D[Create EIP-712 domain with tokenName]
    D --> E[User signs payment]
    E --> F[Server receives signature]
    F --> G[detectTokenInfo from contract RPC]
    G --> H{Token names match?}
    H -->|Yes| I[Verify & Settle Payment]
    H -->|No| J[Signature Invalid Error]
    I --> K[Return PAYMENT-RESPONSE]
```

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **OpenRouter API Key** - For AI text services (GPT-4o-mini)
- **Replicate API Token** - For media generation (FLUX images, Whisper, TTS)
- **Firebase Project** - For Firestore database (conversation persistence)
- **Thirdweb Account** - For wallet integration
- **PerkOS-Stack Facilitator** - Running on port 3005 (optional for local dev)

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/PerkOS-xyz/PerkOS-Aura.git
cd PerkOS-Aura/AuraApp

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Start development server
npm run dev
```

Visit `http://localhost:3000`

## ⚙️ Configuration

### Required Environment Variables

Create `.env.local` in the `AuraApp` directory:

```bash
# AI Providers (Required)
OPENROUTER_API_KEY=sk-or-v1-...          # OpenRouter for text AI (GPT-4o-mini)
REPLICATE_API_TOKEN=r8_...                # Replicate for media (FLUX, Whisper, TTS)

# Firebase (Required for chat persistence)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Thirdweb (Required)
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
THIRDWEB_SECRET_KEY=your_secret_key

# x402 Payment (Required)
NEXT_PUBLIC_PAY_TO_ADDRESS=0x...
NEXT_PUBLIC_NETWORK=avalanche
NEXT_PUBLIC_PAYMENT_PRICE_USD=0.01

# Service URLs
NEXT_PUBLIC_SERVICE_URL=http://localhost:3000
NEXT_PUBLIC_FACILITATOR_URL=http://localhost:3005

# Admin (Optional)
ADMIN_WALLETS=0x...
```

### Network Options

- `avalanche` - Avalanche C-Chain (43114)
- `base` - Base (8453)
- `celo` - Celo (42220)

## 🎯 Quick Start

### 1. Local Development

```bash
cd AuraApp
npm run dev
```

### 2. Register with Facilitator

Visit `http://localhost:3000/admin` and click **"Re-register"** to register all 20 endpoints with the PerkOS-Stack facilitator.

### 3. Test Endpoints

Visit `http://localhost:3000/docs` to explore all 20 API endpoints.

## 📖 API Documentation

### Endpoint Format

All endpoints require x402 v2 payment headers:

```http
POST /api/ai/{service}
Content-Type: application/json
PAYMENT-SIGNATURE: base64-encoded-envelope

{
  "param1": "value1",
  "param2": "value2"
}
```

### Example: Image Analysis

```bash
curl -X POST http://localhost:3000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -H "PAYMENT-SIGNATURE: ..." \
  -d '{
    "image": "data:image/jpeg;base64,...",
    "prompt": "Describe this image"
  }'
```

### Response Format

```json
{
  "success": true,
  "data": {
    "result": "...",
    "metadata": {
      "cost": "$0.05",
      "protocol": "x402 v2",
      "network": "avalanche"
    }
  }
}
```

## 🎛️ Admin Dashboard

Access at `http://localhost:3000/admin`

**Features:**

- View registration status
- Re-register services
- Monitor facilitator health
- Service breakdown by category

**Access Control:**

- Set `ADMIN_WALLETS` in `.env.local`
- Connect with authorized wallet
- Admin menu appears automatically

## 🌐 Marketplace Integration

Your service automatically appears in the PerkOS-Stack marketplace at `http://localhost:3005/marketplace` after registration.

**Marketplace Features:**

- Service discovery
- Endpoint explorer
- Pricing display
- Direct integration links

## 📦 Production Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Setup

1. Update `.env.local` with production values
2. Set `NEXT_PUBLIC_SERVICE_URL` to your domain
3. Set `NEXT_PUBLIC_FACILITATOR_URL` to production facilitator
4. Configure payment wallet address
5. Add admin wallet addresses

### Deployment Platforms

- **Vercel**: `vercel deploy`
- **Docker**: Use included Dockerfile
- **Custom**: Build standalone with `output: 'standalone'`

## 🏗️ Project Structure

```
PerkOS-Aura/
├── AuraApp/
│   ├── app/
│   │   ├── admin/              # Admin dashboard
│   │   ├── api/
│   │   │   ├── ai/             # 20 AI service endpoints
│   │   │   ├── admin/          # Admin API routes
│   │   │   ├── chat/           # Chat API (messages, image analysis)
│   │   │   ├── conversations/  # Conversation list API
│   │   │   ├── projects/       # Project CRUD API
│   │   │   └── payment/        # x402 payment routes
│   │   ├── docs/               # API documentation
│   │   ├── dashboard/          # Chat interface and projects
│   │   └── components/         # Shared components (ChatInterface, Header)
│   ├── lib/
│   │   ├── config/             # Configuration
│   │   ├── db/                 # Firebase client configuration
│   │   ├── services/           # AI service implementations
│   │   │   └── elizaos/        # ElizaOS integration (AgentRuntime, FirebaseAdapter)
│   │   ├── middleware/         # x402 middleware
│   │   └── utils/              # Utilities
│   ├── next.config.mjs         # Next.js config with TypeScript fixes
│   └── tsconfig.json           # TypeScript config with third-party workarounds
├── CLAUDE.md                   # AI assistant integration guide
└── README.md
```

## 💬 Chat Interface

The dashboard includes an AI chat interface with:

### Features

- **Conversational AI**: ElizaOS-powered chat with GPT-4o-mini
- **Image Analysis**: Upload images and get AI analysis (x402 paid)
- **Image Generation**: Generate images from text prompts (x402 paid)
- **Project Organization**: Group conversations by project
- **Persistent History**: All messages stored in Firebase with wallet isolation
- **Payment Tracking**: "Paid" badge on paid service responses with transaction links

### Payment Flow for Image Analysis

1. User uploads image in chat
2. PaymentButton appears with price ($0.02)
3. User signs x402 payment via wallet
4. Payment verified, image analyzed
5. Response saved with transaction hash
6. "Paid" badge and "View on Explorer" link displayed

### API Endpoints

- `POST /api/chat` - Send message, get AI response
- `GET /api/chat` - Get conversation history
- `POST /api/chat/image` - Analyze image with x402 payment
- `GET /api/conversations` - List user's conversations
- `POST /api/projects` - Create/manage projects

## 🔧 Development

### Adding New AI Services

1. Create endpoint in `app/api/ai/[service]/route.ts`
2. Add configuration to `lib/config/ai-services.ts`
3. Update `RegistrationService.ts` endpoint list
4. Re-register with facilitator

### Testing

```bash
# Run all tests
npm test

# Test specific service
npm run test:ai

# Test payment flow
npm run test:payment
```

### Build Configuration

The project includes workarounds for third-party TypeScript issues:

**next.config.mjs**:
- `ignoreBuildErrors: true` - Ignores `@noble/curves` type errors (broken upstream exports)

**tsconfig.json**:
- `allowImportingTsExtensions: true` - Required for `@noble/curves` imports
- Excludes `node_modules/@noble/curves` from type checking

**ElizaOS Integration**:
- Uses `require("@elizaos/core")` pattern due to broken ESM exports
- Local type definitions for `Memory`, `Entity`, `Relationship`, `Character`
- FirebaseAdapter implements custom persistence (not SupabaseAdapter)

## 🔐 Security

- ✅ Environment variables for secrets
- ✅ x402 payment verification on all endpoints
- ✅ Input validation with Zod
- ✅ Admin wallet authentication
- ✅ CORS configuration
- ✅ Rate limiting (recommended for production)

## 🆕 Recent Improvements

### Conversation Delete Fix
- Fixed race condition where deleted conversations would reappear
- Added `recentlyDeletedRef` to track and filter deleted items
- Added `{ cache: "no-store" }` to prevent browser fetch caching

### ElizaOS Integration Fixes
- Fixed `@elizaos/core` import issues with `require()` pattern
- Added local type definitions for broken TypeScript exports
- Removed unused `MemoryType` references

### Build Configuration
- Added `ignoreBuildErrors: true` for third-party type issues
- Added `allowImportingTsExtensions: true` for `@noble/curves`
- Properly excludes problematic node_modules from type checking

### x402 v2 Payment Flow
- EIP-712 domain token name detection from on-chain contracts
- Transaction hash persistence for "Paid" badge display
- Proper PAYMENT-RESPONSE header handling

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🔗 Links

- **GitHub**: https://github.com/PerkOS-xyz/PerkOS-Aura
- **PerkOS Stack**: https://github.com/PerkOS-xyz/PerkOS-Stack
- **x402 Protocol**: https://github.com/coinbase/x402
- **Documentation**: http://localhost:3000/docs

## 💡 Support

- Issues: [GitHub Issues](https://github.com/PerkOS-xyz/PerkOS-Aura/issues)
- Discussions: [GitHub Discussions](https://github.com/PerkOS-xyz/PerkOS-Aura/discussions)

## 🙏 Acknowledgments

- **OpenRouter** - GPT-4o-mini AI services
- **Replicate** - FLUX image generation, Whisper, TTS
- **Coinbase** - x402 payment protocol
- **Thirdweb** - Wallet infrastructure
- **Firebase** - Firestore database
- **ElizaOS** - Agent runtime framework
- **PerkOS** - Facilitator infrastructure

---

**Made with ❤️ by PerkOS Team**
