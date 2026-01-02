# Environment Variables Setup Guide

Quick guide to set up your `.env.local` file for PerkOS Vendor API.

## Step 1: Create .env.local File

In the `App` folder, create a file named `.env.local`:

```bash
cd App
touch .env.local
```

Or copy from the example:
```bash
cp .env.example .env.local
```

## Step 2: Get Supabase Credentials

Since you're reusing the same Supabase database:

1. Go to your **Supabase Dashboard** (the same project you used for PerkOS-Stack)
2. Navigate to **Settings** > **API**
3. Copy these values:

```
Project URL: https://xxxxx.supabase.co
anon public key: eyJhbGc...
service_role key: eyJhbGc... (Keep this secret!)
```

4. Add them to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key...
```

## Step 3: Get Thirdweb Credentials

1. Go to [Thirdweb Dashboard](https://thirdweb.com/dashboard)
2. Create a new project or use an existing one
3. Copy the **Client ID**
4. Add to `.env.local`:

```env
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id_here
```

## Step 4: Get OpenAI API Key (for elizaOS Agent)

The chat agent uses OpenAI's API. You can skip this if you don't need the chat feature.

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to `.env.local`:

```env
OPENROUTER_API_KEY=sk-or-...your-api-key...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1  # Optional: override base URL
OPENROUTER_REFERER=http://localhost:3000         # Optional: your app URL
OPENROUTER_TITLE=PerkOS AI Vendor Service         # Optional: app name

# Optional fallback (if you still want to support OpenAI directly)
# OPENAI_API_KEY=sk-...your-openai-key...
```

**Optional:** Configure the model and temperature:
```env
ELIZA_MODEL=openrouter/auto  # Default model (OpenRouter)
ELIZA_TEMPERATURE=0.7        # Default: 0.7
```

**Note:** If neither `OPENROUTER_API_KEY` nor `OPENAI_API_KEY` is set, the chat agent will display a message that it's being set up.

## Step 4: Get OpenRouter API Key (for elizaOS Agent)

The chat agent uses an OpenAI-compatible API via OpenRouter. You can skip this if you don't need the chat feature.

1. Go to [OpenRouter](https://openrouter.ai/)
2. Create a new API key
3. Add to `.env.local`:

```env
OPENROUTER_API_KEY=sk-or-...your-api-key...
```

## Step 5: Configure Payment Settings

Set your merchant wallet address (where x402 payments will be received):

```env
NEXT_PUBLIC_PAY_TO_ADDRESS=0xYourWalletAddressHere
PAYMENT_WALLET_ADDRESS=0xYourWalletAddressHere
```

## Step 6: Set Service URL (Optional)

Set your service URL for registration with the facilitator:

```env
NEXT_PUBLIC_SERVICE_URL=https://your-api.com
```

If not set, defaults to `http://localhost:3000` (development mode).

## Step 7: Set Admin Wallet(s) (Optional)

If you want admin access, set one or more admin wallet addresses (comma-separated for multiple):

```env
ADMIN_WALLETS=0xYourAdminWalletAddressHere,0xAnotherAdminWallet
```

**Note:** If no admin wallets are configured, all authenticated users can access the admin area (dev mode).

## Step 8: Verify Your .env.local File

Your `.env.local` should have at minimum:

✅ `NEXT_PUBLIC_SUPABASE_URL`
✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
✅ `SUPABASE_SERVICE_ROLE_KEY`
✅ `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`
✅ `NEXT_PUBLIC_PAY_TO_ADDRESS`
✅ `NEXT_PUBLIC_FACILITATOR_URL` (defaults to https://stack.perkos.xyz)
⭕ `OPENAI_API_KEY` (optional, required for chat agent)

## Step 9: Test the Setup

1. Start the development server:
```bash
npm run dev
```

2. Check for errors in the console
3. If you see Supabase connection errors, verify your credentials

## Important Notes

⚠️ **Never commit `.env.local` to git!** It's already in `.gitignore`

⚠️ **Keep `SUPABASE_SERVICE_ROLE_KEY` secret!** It has admin access to your database

⚠️ **Use the same Supabase project** as PerkOS-Stack since we're using the `vendor_api` schema

## Troubleshooting

### "Missing env.NEXT_PUBLIC_SUPABASE_URL"
- Make sure `.env.local` is in the `App` folder
- Restart your dev server after creating/updating `.env.local`
- Check for typos in variable names

### Supabase connection errors
- Verify your Supabase URL and keys are correct
- Check that you ran the migration script in Supabase SQL Editor
- Ensure the `vendor_api` schema exists

### Thirdweb errors
- Verify your Client ID is correct
- Check that Thirdweb project is active

## Next Steps

After setting up `.env.local`:
1. ✅ Environment variables configured
2. ⏭️ Test Supabase connection
3. ⏭️ Test Thirdweb authentication
4. ⏭️ Continue with implementation

