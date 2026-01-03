-- Migration: 003_aura_vector_search.sql
-- Purpose: Add pgvector support for semantic search in aura schema
-- Requires: pgvector extension (available in Supabase by default)
--
-- IDEMPOTENT: Safe to run multiple times

-- ============================================================
-- 0. DROP EXISTING OBJECTS (for clean re-run)
-- ============================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS aura.search_conversations_semantic(TEXT, vector, INTEGER, FLOAT);
DROP FUNCTION IF EXISTS aura.search_knowledge_semantic(TEXT, vector, TEXT, INTEGER, FLOAT);
DROP FUNCTION IF EXISTS aura.find_related_memories(TEXT, UUID, INTEGER);

-- Drop existing vector indexes
DROP INDEX IF EXISTS aura.idx_aura_conversation_embedding;
DROP INDEX IF EXISTS aura.idx_aura_knowledge_embedding;

-- ============================================================
-- 1. ENABLE PGVECTOR EXTENSION
-- ============================================================

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ============================================================
-- 2. ADD EMBEDDING COLUMNS
-- ============================================================

-- Add embedding column to conversation_history for semantic search
-- Using 1536 dimensions (OpenAI ada-002 compatible)
ALTER TABLE aura.conversation_history
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add embedding column to user_knowledge for semantic search
ALTER TABLE aura.user_knowledge
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- ============================================================
-- 3. CREATE VECTOR INDEXES (IVFFlat for performance)
-- ============================================================

-- Index for conversation embeddings
-- IVFFlat is good for medium-scale (up to millions of vectors)
CREATE INDEX IF NOT EXISTS idx_aura_conversation_embedding
  ON aura.conversation_history
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for knowledge embeddings
CREATE INDEX IF NOT EXISTS idx_aura_knowledge_embedding
  ON aura.user_knowledge
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- 4. SEMANTIC SEARCH FUNCTIONS
-- ============================================================

-- Function: Search conversations by semantic similarity
CREATE OR REPLACE FUNCTION aura.search_conversations_semantic(
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
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ch.id,
    ch.conversation_id,
    ch.message_role,
    ch.message_content,
    ch.created_at,
    1 - (ch.embedding <=> p_query_embedding) AS similarity
  FROM aura.conversation_history ch
  WHERE ch.user_wallet_address = LOWER(p_user_wallet)
    AND ch.embedding IS NOT NULL
    AND 1 - (ch.embedding <=> p_query_embedding) >= p_similarity_threshold
  ORDER BY ch.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

-- Function: Search knowledge by semantic similarity
CREATE OR REPLACE FUNCTION aura.search_knowledge_semantic(
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
    1 - (uk.embedding <=> p_query_embedding) AS similarity
  FROM aura.user_knowledge uk
  WHERE uk.user_wallet_address = LOWER(p_user_wallet)
    AND uk.embedding IS NOT NULL
    AND (p_category IS NULL OR uk.category = p_category)
    AND 1 - (uk.embedding <=> p_query_embedding) >= p_similarity_threshold
  ORDER BY uk.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

-- Function: Find related memories across conversations
CREATE OR REPLACE FUNCTION aura.find_related_memories(
  p_user_wallet TEXT,
  p_memory_id UUID,
  p_limit INTEGER DEFAULT 5
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
AS $$
DECLARE
  v_embedding vector(1536);
BEGIN
  -- Get the embedding of the source memory
  SELECT embedding INTO v_embedding
  FROM aura.conversation_history
  WHERE id = p_memory_id
    AND user_wallet_address = LOWER(p_user_wallet);

  IF v_embedding IS NULL THEN
    RETURN;
  END IF;

  -- Find similar memories (excluding the source)
  RETURN QUERY
  SELECT
    ch.id,
    ch.conversation_id,
    ch.message_role,
    ch.message_content,
    ch.created_at,
    1 - (ch.embedding <=> v_embedding) AS similarity
  FROM aura.conversation_history ch
  WHERE ch.user_wallet_address = LOWER(p_user_wallet)
    AND ch.id != p_memory_id
    AND ch.embedding IS NOT NULL
  ORDER BY ch.embedding <=> v_embedding
  LIMIT p_limit;
END;
$$;

-- ============================================================
-- 5. GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION aura.search_conversations_semantic TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION aura.search_knowledge_semantic TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION aura.find_related_memories TO service_role, authenticated;

-- ============================================================
-- 6. DOCUMENTATION
-- ============================================================

COMMENT ON COLUMN aura.conversation_history.embedding IS 'Vector embedding (1536 dim) for semantic search. Generated from message_content using OpenAI ada-002 or compatible model.';

COMMENT ON COLUMN aura.user_knowledge.embedding IS 'Vector embedding (1536 dim) for semantic search. Generated from title + content using OpenAI ada-002 or compatible model.';

COMMENT ON FUNCTION aura.search_conversations_semantic IS 'Semantic search across conversation history. Returns messages similar to query embedding with similarity score.';

COMMENT ON FUNCTION aura.search_knowledge_semantic IS 'Semantic search across user knowledge. Optionally filter by category. Returns similar knowledge items.';

COMMENT ON FUNCTION aura.find_related_memories IS 'Find memories semantically related to a given memory. Useful for context expansion.';
