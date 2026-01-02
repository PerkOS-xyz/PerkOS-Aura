# PerkOS AI Vendor Service

Professional AI services powered by GPT-4o, DALL-E 3, and Whisper with x402 v2 micropayments. Provides 20 AI endpoints for vision, NLP, business tools, and developer utilities.

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
- ✅ **x402 v2 Payment Integration** - Gasless crypto micropayments
- ✅ **Admin Dashboard** - Service management and registration
- ✅ **API Documentation** - Interactive endpoint explorer
- ✅ **Marketplace Integration** - PerkOS-Stack facilitator registration
- ✅ **Multi-Chain Support** - Avalanche, Base, Celo
- ✅ **Type-Safe** - Full TypeScript implementation

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **OpenAI API Key** - For AI services
- **Thirdweb Account** - For wallet integration
- **PerkOS-Stack Facilitator** - Running on port 3005 (optional for local dev)

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/PerkOS-xyz/PerkOS-Vendor-Service-AI.git
cd PerkOS-Vendor-Service-AI/App

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

Create `.env.local` in the `App` directory:

```bash
# OpenAI (Required)
OPENAI_API_KEY=sk-proj-...

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
cd App
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
x-authorization: {"from":"0x...","to":"0x...","amount":"1000",...}
x-signature: 0x...

{
  "param1": "value1",
  "param2": "value2"
}
```

### Example: Image Analysis

```bash
curl -X POST http://localhost:3000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -H "x-authorization: {...}" \
  -H "x-signature: 0x..." \
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
PerkOS-Vendor-Service-AI/
├── App/
│   ├── app/
│   │   ├── admin/              # Admin dashboard
│   │   ├── api/
│   │   │   ├── ai/             # 20 AI service endpoints
│   │   │   ├── admin/          # Admin API routes
│   │   │   └── payment/        # x402 payment routes
│   │   ├── docs/               # API documentation
│   │   ├── dashboard/          # Service dashboard
│   │   └── components/         # Shared components
│   ├── lib/
│   │   ├── config/             # Configuration
│   │   ├── services/           # AI service implementations
│   │   ├── middleware/         # x402 middleware
│   │   └── utils/              # Utilities
│   └── package.json
└── README.md
```

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

## 🔐 Security

- ✅ Environment variables for secrets
- ✅ x402 payment verification on all endpoints
- ✅ Input validation with Zod
- ✅ Admin wallet authentication
- ✅ CORS configuration
- ✅ Rate limiting (recommended for production)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🔗 Links

- **GitHub**: https://github.com/PerkOS-xyz/PerkOS-Vendor-Service-AI
- **PerkOS Stack**: https://github.com/PerkOS-xyz/PerkOS-Stack
- **x402 Protocol**: https://github.com/coinbase/x402
- **Documentation**: http://localhost:3000/docs

## 💡 Support

- Issues: [GitHub Issues](https://github.com/PerkOS-xyz/PerkOS-Vendor-Service-AI/issues)
- Discussions: [GitHub Discussions](https://github.com/PerkOS-xyz/PerkOS-Vendor-Service-AI/discussions)

## 🙏 Acknowledgments

- **OpenAI** - GPT-4o, DALL-E 3, Whisper
- **Coinbase** - x402 payment protocol
- **Thirdweb** - Wallet infrastructure
- **PerkOS** - Facilitator infrastructure

---

**Made with ❤️ by PerkOS Team**
