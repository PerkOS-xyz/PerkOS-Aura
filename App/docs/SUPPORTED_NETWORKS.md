# Supported Networks

This service supports the following networks for x402 payments:

## Mainnets

| Network | Chain ID | USDC Address | Status |
|---------|----------|--------------|--------|
| **Avalanche C-Chain** | 43114 | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` | ✅ Active |
| **Base** | 8453 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | ✅ Active |
| **Celo** | 42220 | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` | ✅ Active |

## Testnets

| Network | Chain ID | USDC Address | Status |
|---------|----------|--------------|--------|
| **Avalanche Fuji** | 43113 | `0x5425890298aed601595a70AB815c96711a31Bc65` | ✅ Active |
| **Base Sepolia** | 84532 | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | ✅ Active |
| **Celo Sepolia** | 11142220 | `0x01C5C0122039549AD1493B8220cABEdD739BC44E` | ✅ Active |

## Configuration

The active network is configured via environment variable:

```bash
NEXT_PUBLIC_NETWORK=avalanche  # or base, base-sepolia, avalanche-fuji, celo, celo-sepolia
```

Default: `avalanche`

## USDC Token Details

All supported networks use USDC with **6 decimals**:
- 1 USDC = 1,000,000 smallest units
- $0.001 = 1,000 smallest units
- $0.10 = 100,000 smallest units

## Balance Requirements

For testing, you need at least **0.001 USDC** in your wallet.

### Checking Balance

You can check your USDC balance via:

1. **API Endpoint:**
   ```
   GET /api/balance/check?walletAddress=0x...&network=avalanche
   ```

2. **Payment Button:**
   The payment button automatically checks and displays your USDC balance before signing.

3. **elizaOS Agent:**
   Ask: "What's my USDC balance?" or "Do I have enough USDC?"

## Getting USDC

### Mainnet
- **Avalanche**: Bridge from Ethereum or buy on DEX
- **Base**: Bridge from Ethereum or buy on DEX
- **Celo**: Buy on DEX or use Celo's stablecoin ecosystem

### Testnet
- **Avalanche Fuji**: Get testnet USDC from faucets or testnet DEXs
- **Base Sepolia**: Get testnet USDC from faucets
- **Celo Sepolia**: Get testnet USDC from faucets or testnet DEXs

## RPC Endpoints

Default RPC URLs (can be overridden with environment variables):

- **Avalanche**: `https://api.avax.network/ext/bc/C/rpc`
- **Avalanche Fuji**: `https://api.avax-test.network/ext/bc/C/rpc`
- **Base**: `https://mainnet.base.org`
- **Base Sepolia**: `https://sepolia.base.org`
- **Celo**: `https://forno.celo.org`
- **Celo Sepolia**: `https://forno.celo-sepolia.celo-testnet.org`

### Custom RPC URLs

Set environment variables to use custom RPC endpoints:

```bash
AVALANCHE_RPC_URL=https://your-rpc-url.com
BASE_RPC_URL=https://your-rpc-url.com
CELO_RPC_URL=https://your-rpc-url.com
```

## Network Selection

The network is selected based on:
1. `NEXT_PUBLIC_NETWORK` environment variable
2. Payment requirements from the endpoint
3. User's connected wallet network (must match)

## Testing

To test payments:

1. **Connect wallet** to the dashboard
2. **Switch to supported network** (e.g., Avalanche)
3. **Ensure you have USDC** (at least 0.001 USDC)
4. **Check balance** using the payment button or API
5. **Make a payment** by requesting a token creation

## Troubleshooting

### "Insufficient USDC balance"
- Ensure you have at least 0.001 USDC
- Check the correct network
- Verify USDC address matches the network

### "Network mismatch"
- Switch your wallet to the configured network
- Check `NEXT_PUBLIC_NETWORK` environment variable

### "Failed to check balance"
- Verify RPC endpoint is accessible
- Check network connectivity
- Ensure wallet address is valid

