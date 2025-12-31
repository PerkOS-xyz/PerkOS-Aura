# Sponsor Wallet Setup for Gasless Transactions

## Overview

The PerkOS-Stack facilitator requires **sponsor wallets** to pay for gas fees when settling x402 payments. This enables gasless transactions for end users.

## The Issue

When you see this error:
```
Payment settlement failed: No sponsor wallet configured for this payer
```

This means the facilitator cannot find a sponsor wallet for the payer's address (`0x499D377eF114cC1BF7798cECBB38412701400daF` in your case).

## Solution: Configure Sponsor Wallet

### Option 1: Create Sponsor Wallet via Facilitator Dashboard

1. Navigate to the facilitator dashboard: `http://localhost:3005/dashboard` (or `https://stack.perkos.xyz/dashboard`)
2. Connect your wallet (the one you're using for testing: `0x499D377eF114cC1BF7798cECBB38412701400daF`)
3. Go to "Sponsor Wallets" section
4. Click "Create EVM Sponsor Wallet"
5. The facilitator will create a sponsor wallet that can pay gas for your transactions

### Option 2: Add Sponsor Wallet via API

You can also create a sponsor wallet programmatically:

```bash
# POST /api/sponsor/wallets
curl -X POST http://localhost:3005/api/sponsor/wallets \
  -H "Content-Type: application/json" \
  -d '{
    "user_wallet_address": "0x499D377eF114cC1BF7798cECBB38412701400daF",
    "network": "avalanche"
  }'
```

### Option 3: Add Sponsor Rule for Agent Address

If you want to sponsor gas for a specific agent/address:

```bash
# POST /api/sponsor/rules
curl -X POST http://localhost:3005/api/sponsor/rules \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "<sponsor-wallet-id>",
    "ruleType": "agent",
    "agentAddress": "0x499D377eF114cC1BF7798cECBB38412701400daF",
    "description": "Allow gas sponsorship for test wallet"
  }'
```

## How It Works

1. **User signs payment**: User signs EIP-712 payment authorization
2. **Vendor verifies**: Vendor verifies payment with facilitator
3. **Facilitator looks up sponsor**: Facilitator checks `perkos_sponsor_wallets` table for payer's address
4. **Sponsor pays gas**: Sponsor wallet executes `transferWithAuthorization` and pays gas
5. **USDC moves**: USDC moves from payer to vendor (gas paid by sponsor)

## Database Tables

The facilitator uses these Supabase tables:

- **`perkos_sponsor_wallets`**: Stores sponsor wallet addresses
  - `user_wallet_address`: The payer's address
  - `sponsor_address`: The wallet that pays gas
  - `network`: Network (e.g., "avalanche")

- **`perkos_sponsor_rules`**: Rules for when to sponsor
  - `rule_type`: "agent", "domain", "endpoint", or "all"
  - `agent_address`: Specific agent address to sponsor

## Testing Without Sponsor Wallet

If you want to test without setting up a sponsor wallet, you can:

1. **Use a wallet that already has a sponsor wallet** (if you've set one up before)
2. **Fund the sponsor wallet** with native tokens (AVAX for Avalanche) to pay for gas
3. **Check sponsor wallet balance** via the facilitator dashboard

## Current Status

✅ **Payment verification**: Working (signature verified successfully)
❌ **Payment settlement**: Failing (no sponsor wallet found)

Once you create a sponsor wallet for your test address, settlement should succeed.

## References

- [PerkOS-Stack Sponsor Wallet Documentation](../../PerkOS-Stack/StackApp/README.md#gas-sponsorship-flow)
- [Facilitator Dashboard](../../PerkOS-Stack/StackApp/app/dashboard/page.tsx)

