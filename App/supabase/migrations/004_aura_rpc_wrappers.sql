-- Migration: 004_aura_rpc_wrappers.sql
-- Purpose: Create RPC wrapper functions for aura schema access
--
-- This migration creates wrapper functions in the PUBLIC schema that allow
-- accessing the aura schema via Supabase's RPC mechanism.
--
-- IDEMPOTENT: Safe to run multiple times

-- ============================================================
-- 0. DROP EXISTING FUNCTIONS (for clean re-run)
-- ============================================================

DROP FUNCTION IF EXISTS public.aura_insert_conversation(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.aura_get_conversations(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.aura_search_conversations(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.aura_get_conversation_by_id(TEXT, UUID);
DROP FUNCTION IF EXISTS public.aura_insert_knowledge(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.aura_get_knowledge(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.aura_search_knowledge(TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.aura_update_knowledge(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.aura_update_conversation_embedding(UUID, TEXT, vector);
DROP FUNCTION IF EXISTS public.aura_update_knowledge_embedding(UUID, TEXT, vector);

-- ============================================================
-- 1. CONVERSATION HISTORY FUNCTIONS
-- ============================================================

-- Insert a conversation message
CREATE OR REPLACE FUNCTION public.aura_insert_conversation(
  p_user_wallet TEXT,
  p_conversation_id TEXT,
  p_message_role TEXT,
  p_message_content TEXT,
  p_created_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO aura.conversation_history (
    user_wallet_address,
    conversation_id,
    message_role,
    message_content,
    created_at
  ) VALUES (
    LOWER(p_user_wallet),
    p_conversation_id,
    p_message_role,
    p_message_content,
    p_created_at
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Get conversations for a user and conversation_id
CREATE OR REPLACE FUNCTION public.aura_get_conversations(
  p_user_wallet TEXT,
  p_conversation_id TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  user_wallet_address TEXT,
  conversation_id TEXT,
  message_role TEXT,
  message_content TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ch.id,
    ch.user_wallet_address,
    ch.conversation_id,
    ch.message_role,
    ch.message_content,
    ch.created_at
  FROM aura.conversation_history ch
  WHERE ch.user_wallet_address = LOWER(p_user_wallet)
    AND ch.conversation_id = p_conversation_id
  ORDER BY ch.created_at ASC
  LIMIT p_limit;
END;
$$;

-- Search conversations by content
CREATE OR REPLACE FUNCTION public.aura_search_conversations(
  p_user_wallet TEXT,
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  user_wallet_address TEXT,
  conversation_id TEXT,
  message_role TEXT,
  message_content TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ch.id,
    ch.user_wallet_address,
    ch.conversation_id,
    ch.message_role,
    ch.message_content,
    ch.created_at
  FROM aura.conversation_history ch
  WHERE ch.user_wallet_address = LOWER(p_user_wallet)
    AND ch.message_content ILIKE '%' || p_query || '%'
  ORDER BY ch.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Get conversation by ID
CREATE OR REPLACE FUNCTION public.aura_get_conversation_by_id(
  p_user_wallet TEXT,
  p_id UUID
)
RETURNS TABLE (
  id UUID,
  user_wallet_address TEXT,
  conversation_id TEXT,
  message_role TEXT,
  message_content TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ch.id,
    ch.user_wallet_address,
    ch.conversation_id,
    ch.message_role,
    ch.message_content,
    ch.created_at
  FROM aura.conversation_history ch
  WHERE ch.id = p_id
    AND ch.user_wallet_address = LOWER(p_user_wallet)
  LIMIT 1;
END;
$$;

-- ============================================================
-- 2. USER KNOWLEDGE FUNCTIONS
-- ============================================================

-- Insert knowledge entry
CREATE OR REPLACE FUNCTION public.aura_insert_knowledge(
  p_user_wallet TEXT,
  p_category TEXT,
  p_title TEXT,
  p_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO aura.user_knowledge (
    user_wallet_address,
    category,
    title,
    content,
    created_at,
    updated_at
  ) VALUES (
    LOWER(p_user_wallet),
    p_category,
    p_title,
    p_content,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Get knowledge by category
CREATE OR REPLACE FUNCTION public.aura_get_knowledge(
  p_user_wallet TEXT,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  user_wallet_address TEXT,
  category TEXT,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uk.id,
    uk.user_wallet_address,
    uk.category,
    uk.title,
    uk.content,
    uk.created_at,
    uk.updated_at
  FROM aura.user_knowledge uk
  WHERE uk.user_wallet_address = LOWER(p_user_wallet)
    AND (p_category IS NULL OR uk.category = p_category)
  ORDER BY uk.updated_at DESC
  LIMIT p_limit;
END;
$$;

-- Search knowledge by content
CREATE OR REPLACE FUNCTION public.aura_search_knowledge(
  p_user_wallet TEXT,
  p_query TEXT,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  user_wallet_address TEXT,
  category TEXT,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uk.id,
    uk.user_wallet_address,
    uk.category,
    uk.title,
    uk.content,
    uk.created_at,
    uk.updated_at
  FROM aura.user_knowledge uk
  WHERE uk.user_wallet_address = LOWER(p_user_wallet)
    AND (p_category IS NULL OR uk.category = p_category)
    AND uk.content ILIKE '%' || p_query || '%'
  ORDER BY uk.updated_at DESC
  LIMIT p_limit;
END;
$$;

-- Update knowledge entry
CREATE OR REPLACE FUNCTION public.aura_update_knowledge(
  p_id UUID,
  p_user_wallet TEXT,
  p_title TEXT,
  p_content TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE aura.user_knowledge
  SET
    title = p_title,
    content = p_content,
    updated_at = NOW()
  WHERE id = p_id
    AND user_wallet_address = LOWER(p_user_wallet);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN v_updated > 0;
END;
$$;

-- ============================================================
-- 3. EMBEDDING UPDATE FUNCTIONS
-- ============================================================

-- Update conversation embedding
CREATE OR REPLACE FUNCTION public.aura_update_conversation_embedding(
  p_id UUID,
  p_user_wallet TEXT,
  p_embedding vector(1536)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public, extensions
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE aura.conversation_history
  SET embedding = p_embedding
  WHERE id = p_id
    AND user_wallet_address = LOWER(p_user_wallet);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN v_updated > 0;
END;
$$;

-- Update knowledge embedding
CREATE OR REPLACE FUNCTION public.aura_update_knowledge_embedding(
  p_id UUID,
  p_user_wallet TEXT,
  p_embedding vector(1536)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public, extensions
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE aura.user_knowledge
  SET
    embedding = p_embedding,
    updated_at = NOW()
  WHERE id = p_id
    AND user_wallet_address = LOWER(p_user_wallet);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN v_updated > 0;
END;
$$;

-- ============================================================
-- 4. SEMANTIC SEARCH WRAPPERS
-- ============================================================

-- Wrapper for conversation semantic search
CREATE OR REPLACE FUNCTION public.aura_search_conversations_semantic(
  p_user_wallet TEXT,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 10,
  p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  conversation_id TEXT,
  message_role TEXT,
  message_content TEXT,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ch.id,
    ch.conversation_id,
    ch.message_role,
    ch.message_content,
    ch.created_at,
    (1 - (ch.embedding <=> p_query_embedding))::FLOAT AS similarity
  FROM aura.conversation_history ch
  WHERE ch.user_wallet_address = LOWER(p_user_wallet)
    AND ch.embedding IS NOT NULL
    AND 1 - (ch.embedding <=> p_query_embedding) >= p_similarity_threshold
  ORDER BY ch.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

-- Wrapper for knowledge semantic search
CREATE OR REPLACE FUNCTION public.aura_search_knowledge_semantic(
  p_user_wallet TEXT,
  p_query_embedding vector(1536),
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uk.id,
    uk.category,
    uk.title,
    uk.content,
    uk.created_at,
    uk.updated_at,
    (1 - (uk.embedding <=> p_query_embedding))::FLOAT AS similarity
  FROM aura.user_knowledge uk
  WHERE uk.user_wallet_address = LOWER(p_user_wallet)
    AND uk.embedding IS NOT NULL
    AND (p_category IS NULL OR uk.category = p_category)
    AND 1 - (uk.embedding <=> p_query_embedding) >= p_similarity_threshold
  ORDER BY uk.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

-- ============================================================
-- 5. GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.aura_insert_conversation TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_get_conversations TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_search_conversations TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_get_conversation_by_id TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_insert_knowledge TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_get_knowledge TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_search_knowledge TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_update_knowledge TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_update_conversation_embedding TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_update_knowledge_embedding TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_search_conversations_semantic TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_search_knowledge_semantic TO service_role, authenticated;
