-- Migration: 002_aura_security_fixes.sql
-- Purpose: Fix security issues in aura schema
-- - Add proper RLS policies
-- - Restrict grants (remove anon)
-- - Add content size limits
-- - Add retention policy support
--
-- IDEMPOTENT: Safe to run multiple times

-- ============================================================
-- 0. DROP EXISTING OBJECTS (for clean re-run)
-- ============================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS aura.cleanup_old_conversations(INTEGER);
DROP FUNCTION IF EXISTS aura.cleanup_old_knowledge(INTEGER);

-- Drop existing indexes (will be recreated)
DROP INDEX IF EXISTS aura.idx_aura_conversation_retention;
DROP INDEX IF EXISTS aura.idx_aura_knowledge_retention;
DROP INDEX IF EXISTS aura.idx_aura_conversation_role;
DROP INDEX IF EXISTS aura.idx_aura_knowledge_updated;

-- Drop existing constraints (will be recreated)
ALTER TABLE IF EXISTS aura.conversation_history DROP CONSTRAINT IF EXISTS chk_message_content_size;
ALTER TABLE IF EXISTS aura.user_knowledge DROP CONSTRAINT IF EXISTS chk_knowledge_content_size;
ALTER TABLE IF EXISTS aura.user_knowledge DROP CONSTRAINT IF EXISTS chk_knowledge_title_size;

-- ============================================================
-- 1. REVOKE OVERLY PERMISSIVE GRANTS
-- ============================================================

-- Revoke anon access (security risk)
REVOKE ALL ON SCHEMA aura FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA aura FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA aura FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA aura FROM anon;

-- Keep only necessary roles
-- postgres: superuser (needed for migrations)
-- authenticated: logged-in users (if using Supabase Auth)
-- service_role: server-side operations (primary access method)
GRANT USAGE ON SCHEMA aura TO postgres, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA aura TO postgres, service_role;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA aura TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA aura TO postgres, authenticated, service_role;

-- ============================================================
-- 2. RLS POLICIES FOR conversation_history
-- ============================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own conversations" ON aura.conversation_history;
DROP POLICY IF EXISTS "Users can insert own conversations" ON aura.conversation_history;
DROP POLICY IF EXISTS "Service role full access conversations" ON aura.conversation_history;

-- Policy: Service role has full access (for server-side operations)
-- This is the primary access method - API routes use service_role key
CREATE POLICY "Service role full access conversations"
  ON aura.conversation_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can only view their own conversations
-- Uses custom claim 'wallet_address' if set in JWT, otherwise blocks
CREATE POLICY "Users can view own conversations"
  ON aura.conversation_history
  FOR SELECT
  TO authenticated
  USING (
    user_wallet_address = LOWER(COALESCE(
      current_setting('request.jwt.claims', true)::json->>'wallet_address',
      ''
    ))
  );

-- Policy: Authenticated users can insert their own conversations
CREATE POLICY "Users can insert own conversations"
  ON aura.conversation_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_wallet_address = LOWER(COALESCE(
      current_setting('request.jwt.claims', true)::json->>'wallet_address',
      ''
    ))
  );

-- ============================================================
-- 3. RLS POLICIES FOR user_knowledge
-- ============================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own knowledge" ON aura.user_knowledge;
DROP POLICY IF EXISTS "Users can insert own knowledge" ON aura.user_knowledge;
DROP POLICY IF EXISTS "Users can update own knowledge" ON aura.user_knowledge;
DROP POLICY IF EXISTS "Service role full access knowledge" ON aura.user_knowledge;

-- Policy: Service role has full access
CREATE POLICY "Service role full access knowledge"
  ON aura.user_knowledge
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can only view their own knowledge
CREATE POLICY "Users can view own knowledge"
  ON aura.user_knowledge
  FOR SELECT
  TO authenticated
  USING (
    user_wallet_address = LOWER(COALESCE(
      current_setting('request.jwt.claims', true)::json->>'wallet_address',
      ''
    ))
  );

-- Policy: Authenticated users can insert their own knowledge
CREATE POLICY "Users can insert own knowledge"
  ON aura.user_knowledge
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_wallet_address = LOWER(COALESCE(
      current_setting('request.jwt.claims', true)::json->>'wallet_address',
      ''
    ))
  );

-- Policy: Authenticated users can update their own knowledge
CREATE POLICY "Users can update own knowledge"
  ON aura.user_knowledge
  FOR UPDATE
  TO authenticated
  USING (
    user_wallet_address = LOWER(COALESCE(
      current_setting('request.jwt.claims', true)::json->>'wallet_address',
      ''
    ))
  )
  WITH CHECK (
    user_wallet_address = LOWER(COALESCE(
      current_setting('request.jwt.claims', true)::json->>'wallet_address',
      ''
    ))
  );

-- ============================================================
-- 4. ADD CONTENT SIZE LIMITS
-- ============================================================

-- Add constraint for message content (max 100KB)
ALTER TABLE aura.conversation_history
  ADD CONSTRAINT chk_message_content_size
  CHECK (length(message_content) <= 102400);

-- Add constraint for knowledge content (max 500KB for JSON)
ALTER TABLE aura.user_knowledge
  ADD CONSTRAINT chk_knowledge_content_size
  CHECK (length(content) <= 512000);

-- Add constraint for title length
ALTER TABLE aura.user_knowledge
  ADD CONSTRAINT chk_knowledge_title_size
  CHECK (length(title) <= 500);

-- ============================================================
-- 5. RETENTION POLICY SUPPORT
-- ============================================================

-- Index for efficient cleanup queries (retention policy)
-- Note: Using regular index on created_at instead of partial index
-- because NOW() is not immutable. The cleanup functions will use this index.
CREATE INDEX IF NOT EXISTS idx_aura_conversation_retention
  ON aura.conversation_history(created_at);

CREATE INDEX IF NOT EXISTS idx_aura_knowledge_retention
  ON aura.user_knowledge(created_at);

-- Function to clean up old conversations (call via cron or manual)
CREATE OR REPLACE FUNCTION aura.cleanup_old_conversations(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM aura.conversation_history
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % old conversation records', deleted_count;
  RETURN deleted_count;
END;
$$;

-- Function to clean up old knowledge entries
CREATE OR REPLACE FUNCTION aura.cleanup_old_knowledge(retention_days INTEGER DEFAULT 180)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Only delete knowledge that hasn't been updated recently
  DELETE FROM aura.user_knowledge
  WHERE updated_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % old knowledge records', deleted_count;
  RETURN deleted_count;
END;
$$;

-- Grant execute on cleanup functions to service_role only
GRANT EXECUTE ON FUNCTION aura.cleanup_old_conversations TO service_role;
GRANT EXECUTE ON FUNCTION aura.cleanup_old_knowledge TO service_role;

-- ============================================================
-- 6. ADD USEFUL INDEXES FOR COMMON QUERIES
-- ============================================================

-- Index for message role filtering (useful for getting only user or assistant messages)
CREATE INDEX IF NOT EXISTS idx_aura_conversation_role
  ON aura.conversation_history(user_wallet_address, message_role);

-- Index for knowledge category + updated_at (for finding recent knowledge)
CREATE INDEX IF NOT EXISTS idx_aura_knowledge_updated
  ON aura.user_knowledge(user_wallet_address, category, updated_at DESC);

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON SCHEMA aura IS 'AI agent memory schema for elizaOS integration. Stores per-user conversation history and extracted knowledge.';

COMMENT ON TABLE aura.conversation_history IS 'Stores conversation messages between users and AI agent. User-isolated by wallet address.';

COMMENT ON TABLE aura.user_knowledge IS 'Stores extracted knowledge (entities, facts, relationships) from conversations. User-isolated by wallet address.';

COMMENT ON FUNCTION aura.cleanup_old_conversations IS 'Deletes conversation records older than specified days. Default 90 days. Call via cron: SELECT aura.cleanup_old_conversations();';

COMMENT ON FUNCTION aura.cleanup_old_knowledge IS 'Deletes knowledge records not updated in specified days. Default 180 days. Call via cron: SELECT aura.cleanup_old_knowledge();';
