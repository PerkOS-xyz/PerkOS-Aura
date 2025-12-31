-- Migration: Create views in public schema for Supabase PostgREST access
-- Description: Supabase PostgREST only exposes 'public' and 'graphql_public' schemas by default
-- This creates views in the public schema that point to vendor_api tables
-- 
-- RUN THIS SQL IN SUPABASE SQL EDITOR AFTER 001_initial_schema.sql:
-- =====================================

-- Grant usage on vendor_api schema to anon and authenticated roles
GRANT USAGE ON SCHEMA vendor_api TO anon, authenticated, service_role;

-- Grant select, insert, update, delete on all tables in vendor_api schema
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA vendor_api TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA vendor_api TO anon, authenticated, service_role;

-- Create views in public schema that point to vendor_api tables
-- This allows Supabase PostgREST to access the tables

CREATE OR REPLACE VIEW public.user_tokens AS
SELECT * FROM vendor_api.user_tokens;

CREATE OR REPLACE VIEW public.token_distributions AS
SELECT * FROM vendor_api.token_distributions;

CREATE OR REPLACE VIEW public.user_sessions AS
SELECT * FROM vendor_api.user_sessions;

CREATE OR REPLACE VIEW public.user_knowledge AS
SELECT * FROM vendor_api.user_knowledge;

CREATE OR REPLACE VIEW public.user_memories AS
SELECT * FROM vendor_api.user_memories;

CREATE OR REPLACE VIEW public.conversation_history AS
SELECT * FROM vendor_api.conversation_history;

CREATE OR REPLACE VIEW public.campaigns AS
SELECT * FROM vendor_api.campaigns;

CREATE OR REPLACE VIEW public.x402_transactions AS
SELECT * FROM vendor_api.x402_transactions;

-- Grant permissions on views
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tokens TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.token_distributions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_knowledge TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_memories TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_history TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.x402_transactions TO anon, authenticated, service_role;

-- Create triggers to handle inserts/updates through views
-- These will forward operations to the underlying vendor_api tables

CREATE OR REPLACE FUNCTION public.insert_user_tokens()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO vendor_api.user_tokens VALUES (NEW.*);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_tokens_insert_trigger
INSTEAD OF INSERT ON public.user_tokens
FOR EACH ROW EXECUTE FUNCTION public.insert_user_tokens();

-- Similar triggers for other views if needed
-- For now, we'll use direct table access via service role

COMMENT ON VIEW public.user_tokens IS 'View pointing to vendor_api.user_tokens for Supabase PostgREST access';
COMMENT ON VIEW public.token_distributions IS 'View pointing to vendor_api.token_distributions for Supabase PostgREST access';
COMMENT ON VIEW public.user_sessions IS 'View pointing to vendor_api.user_sessions for Supabase PostgREST access';
COMMENT ON VIEW public.user_knowledge IS 'View pointing to vendor_api.user_knowledge for Supabase PostgREST access';
COMMENT ON VIEW public.user_memories IS 'View pointing to vendor_api.user_memories for Supabase PostgREST access';
COMMENT ON VIEW public.conversation_history IS 'View pointing to vendor_api.conversation_history for Supabase PostgREST access';
COMMENT ON VIEW public.campaigns IS 'View pointing to vendor_api.campaigns for Supabase PostgREST access';
COMMENT ON VIEW public.x402_transactions IS 'View pointing to vendor_api.x402_transactions for Supabase PostgREST access';

