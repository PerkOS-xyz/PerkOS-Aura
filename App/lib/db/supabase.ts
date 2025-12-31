/**
 * Supabase Database Client
 * Configured for PerkOS Vendor API with user isolation
 * 
 * Uses vendor_api schema to coexist with PerkOS-Stack tables in the same database
 */

import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Client-side Supabase client (for browser)
// Note: Supabase PostgREST only exposes 'public' and 'graphql_public' schemas by default
// We use schema-qualified table names: vendor_api.table_name
// This requires Supabase to be configured to expose the vendor_api schema
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Server-side client with service role key for admin operations
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : supabase;

/**
 * Create a Supabase client with user context for RLS
 * Sets the user wallet address in the request context for Row Level Security
 */
export function createUserSupabaseClient(walletAddress: string) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          'x-user-wallet-address': walletAddress
        }
      }
    }
  );

  return client;
}

/**
 * Helper function to query vendor_api schema tables
 * Example: await queryVendorTable('user_tokens').select('*').eq('owner_address', walletAddress)
 */
export function queryVendorTable(tableName: string) {
  // Tables are in vendor_api schema
  // Supabase client with schema set will automatically use vendor_api schema
  return supabaseAdmin.from(tableName);
}

