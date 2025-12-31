# Supabase Setup Guide

Complete guide to set up Supabase database for PerkOS Vendor API.

## Prerequisites

- Supabase account (free tier is sufficient to start)
- Node.js 18+ installed

## Step 1: Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details:
   - **Name**: `perkos-vendor-api` (or your preferred name)
   - **Database Password**: Generate a strong password (save it securely!)
   - **Region**: Choose closest to your users
   - **Plan**: Start with Free tier
4. Click "Create new project"
5. Wait for project to be ready (~2 minutes)

## Step 2: Set Up Database Schema

### Option A: Using Supabase SQL Editor (Recommended)

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New query"
3. **First**, copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click "Run" (or press Cmd/Ctrl + Enter)
5. **Then**, copy and paste the contents of `supabase/migrations/002_create_public_views.sql`
6. Click "Run" again
7. Verify tables were created:
   - Go to **Table Editor**
   - You should see all tables with `vendor_` prefix:
     - `vendor_user_sessions`
     - `vendor_user_tokens`
     - `vendor_token_distributions`
     - `vendor_user_knowledge`
     - `vendor_user_memories`
     - `vendor_conversation_history`
     - `vendor_campaigns`
     - `vendor_x402_transactions`

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

## Step 3: Get API Credentials

1. In Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:

```
Project URL: https://xxxxx.supabase.co
anon public key: eyJhbGc...
service_role key: eyJhbGc... (Keep this secret!)
```

## Step 4: Configure Environment Variables

1. Create `.env.local` file in `/App/` directory:

```bash
cd App
cp .env.example .env.local
```

2. Add your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key...
```

⚠️ **IMPORTANT**: Never commit `.env.local` to git!

## Step 5: Verify Setup

1. Start your development server:
```bash
npm run dev
```

2. Check that Supabase connection works by visiting:
   - `http://localhost:3000/api/health` (if you have a health check endpoint)

## Database Schema Overview

### Schema Organization

This migration creates a **`vendor_api` schema** (PostgreSQL namespace) so it can coexist with PerkOS-Stack tables in the same Supabase database:

- **`public` schema**: PerkOS-Stack tables (e.g., `perkos_x402_transactions`)
- **`vendor_api` schema**: Vendor API tables (e.g., `vendor_api.user_tokens`)

### Core Tables (in vendor_api schema)

| Table | Purpose |
|-------|---------|
| `vendor_api.user_sessions` | Thirdweb authentication sessions |
| `vendor_api.user_tokens` | ERC20 tokens created by users |
| `vendor_api.token_distributions` | Token distribution history |
| `vendor_api.user_knowledge` | elizaOS knowledge base (user-isolated) |
| `vendor_api.user_memories` | elizaOS memories (user-isolated) |
| `vendor_api.conversation_history` | Chat history (user-isolated) |
| `vendor_api.campaigns` | Agent-generated campaigns (user-isolated) |
| `vendor_api.x402_transactions` | Cached x402 transactions (optional) |

### Querying Tables

When querying tables, use the schema prefix or set the default schema:

```typescript
// Option 1: Use schema prefix
const { data } = await supabase
  .from('vendor_api.user_tokens')
  .select('*');

// Option 2: Use default schema (configured in supabase client)
const { data } = await supabase
  .from('user_tokens')
  .select('*');
```

### Row Level Security (RLS)

All tables have RLS enabled to ensure user data isolation:
- Users can only access their own data
- Policies use `wallet_address` for filtering
- Server-side operations use service role key for admin access

## Troubleshooting

### RLS Policies Not Working

If RLS policies aren't working correctly:

1. **Check user context**: Ensure `wallet_address` is set correctly
2. **Use service role key**: For server-side operations, use `supabaseAdmin` client
3. **Manual filtering**: As a fallback, filter by `wallet_address` in queries

### Connection Issues

1. **Check credentials**: Verify `NEXT_PUBLIC_SUPABASE_URL` and keys are correct
2. **Check network**: Ensure your IP isn't blocked by Supabase
3. **Check project status**: Ensure Supabase project is active

### Migration Errors

1. **Check SQL syntax**: Ensure migration SQL is valid
2. **Run in order**: Run migrations in the correct order
3. **Check dependencies**: Ensure helper functions are created first

## Next Steps

After setting up Supabase:

1. ✅ Database schema created
2. ✅ Environment variables configured
3. ✅ Test connection
4. ⏭️ Implement database queries in services
5. ⏭️ Set up user authentication with Thirdweb
6. ⏭️ Test user data isolation

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

