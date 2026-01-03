-- Migration: 005_aura_projects.sql
-- Purpose: Add projects table for organizing chats and RPC wrappers
--
-- This migration creates:
-- 1. projects table in aura schema
-- 2. Adds project_id to conversation_history
-- 3. RPC wrapper functions for project operations
--
-- IDEMPOTENT: Safe to run multiple times

-- ============================================================
-- 0. DROP EXISTING FUNCTIONS (for clean re-run)
-- ============================================================

DROP FUNCTION IF EXISTS public.aura_create_project(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.aura_get_projects(TEXT);
DROP FUNCTION IF EXISTS public.aura_get_project_by_id(TEXT, UUID);
DROP FUNCTION IF EXISTS public.aura_update_project(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.aura_delete_project(UUID, TEXT);
DROP FUNCTION IF EXISTS public.aura_get_project_conversations(TEXT, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.aura_get_user_conversations(TEXT, INTEGER);

-- ============================================================
-- 1. CREATE PROJECTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS aura.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_wallet_address TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast retrieval by user
CREATE INDEX IF NOT EXISTS idx_aura_projects_user ON aura.projects(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_aura_projects_updated ON aura.projects(updated_at DESC);

-- Enable RLS
ALTER TABLE aura.projects ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON aura.projects TO postgres, anon, authenticated, service_role;

-- ============================================================
-- 2. ADD project_id TO conversation_history (if not exists)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'aura'
    AND table_name = 'conversation_history'
    AND column_name = 'project_id'
  ) THEN
    ALTER TABLE aura.conversation_history ADD COLUMN project_id UUID REFERENCES aura.projects(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_aura_conv_project ON aura.conversation_history(project_id);
  END IF;
END $$;

-- ============================================================
-- 3. PROJECT RPC FUNCTIONS
-- ============================================================

-- Create a new project
CREATE OR REPLACE FUNCTION public.aura_create_project(
  p_user_wallet TEXT,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Use provided ID or generate new one
  IF p_project_id IS NOT NULL THEN
    v_id := p_project_id;
    INSERT INTO aura.projects (
      id,
      user_wallet_address,
      name,
      description,
      created_at,
      updated_at
    ) VALUES (
      v_id,
      LOWER(p_user_wallet),
      p_name,
      p_description,
      NOW(),
      NOW()
    );
  ELSE
    INSERT INTO aura.projects (
      user_wallet_address,
      name,
      description,
      created_at,
      updated_at
    ) VALUES (
      LOWER(p_user_wallet),
      p_name,
      p_description,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- Get all projects for a user
CREATE OR REPLACE FUNCTION public.aura_get_projects(
  p_user_wallet TEXT
)
RETURNS TABLE (
  id UUID,
  user_wallet_address TEXT,
  name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  chat_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_wallet_address,
    p.name,
    p.description,
    p.created_at,
    p.updated_at,
    (
      SELECT COUNT(DISTINCT ch.conversation_id)
      FROM aura.conversation_history ch
      WHERE ch.project_id = p.id
    ) AS chat_count
  FROM aura.projects p
  WHERE p.user_wallet_address = LOWER(p_user_wallet)
  ORDER BY p.updated_at DESC;
END;
$$;

-- Get a single project by ID
CREATE OR REPLACE FUNCTION public.aura_get_project_by_id(
  p_user_wallet TEXT,
  p_project_id UUID
)
RETURNS TABLE (
  id UUID,
  user_wallet_address TEXT,
  name TEXT,
  description TEXT,
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
    p.id,
    p.user_wallet_address,
    p.name,
    p.description,
    p.created_at,
    p.updated_at
  FROM aura.projects p
  WHERE p.id = p_project_id
    AND p.user_wallet_address = LOWER(p_user_wallet)
  LIMIT 1;
END;
$$;

-- Update a project
CREATE OR REPLACE FUNCTION public.aura_update_project(
  p_project_id UUID,
  p_user_wallet TEXT,
  p_name TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE aura.projects
  SET
    name = p_name,
    description = p_description,
    updated_at = NOW()
  WHERE id = p_project_id
    AND user_wallet_address = LOWER(p_user_wallet);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN v_updated > 0;
END;
$$;

-- Delete a project
CREATE OR REPLACE FUNCTION public.aura_delete_project(
  p_project_id UUID,
  p_user_wallet TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- First, unlink all conversations from this project
  UPDATE aura.conversation_history
  SET project_id = NULL
  WHERE project_id = p_project_id
    AND user_wallet_address = LOWER(p_user_wallet);

  -- Delete the project
  DELETE FROM aura.projects
  WHERE id = p_project_id
    AND user_wallet_address = LOWER(p_user_wallet);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN v_deleted > 0;
END;
$$;

-- ============================================================
-- 4. CONVERSATION LIST FUNCTIONS
-- ============================================================

-- Get conversations for a project (grouped by conversation_id)
CREATE OR REPLACE FUNCTION public.aura_get_project_conversations(
  p_user_wallet TEXT,
  p_project_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  conversation_id TEXT,
  project_id UUID,
  first_message TEXT,
  last_message_at TIMESTAMPTZ,
  message_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ch.conversation_id,
    ch.project_id,
    (
      SELECT ch2.message_content
      FROM aura.conversation_history ch2
      WHERE ch2.conversation_id = ch.conversation_id
        AND ch2.user_wallet_address = LOWER(p_user_wallet)
        AND ch2.message_role = 'user'
      ORDER BY ch2.created_at ASC
      LIMIT 1
    ) AS first_message,
    MAX(ch.created_at) AS last_message_at,
    COUNT(*) AS message_count
  FROM aura.conversation_history ch
  WHERE ch.user_wallet_address = LOWER(p_user_wallet)
    AND ch.project_id = p_project_id
  GROUP BY ch.conversation_id, ch.project_id
  ORDER BY last_message_at DESC
  LIMIT p_limit;
END;
$$;

-- Get all conversations for a user (with optional project filter)
CREATE OR REPLACE FUNCTION public.aura_get_user_conversations(
  p_user_wallet TEXT,
  p_limit INTEGER DEFAULT 50,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conversation_id TEXT,
  project_id UUID,
  project_name TEXT,
  first_message TEXT,
  last_message_at TIMESTAMPTZ,
  message_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ch.conversation_id,
    ch.project_id,
    p.name AS project_name,
    (
      SELECT ch2.message_content
      FROM aura.conversation_history ch2
      WHERE ch2.conversation_id = ch.conversation_id
        AND ch2.user_wallet_address = LOWER(p_user_wallet)
        AND ch2.message_role = 'user'
      ORDER BY ch2.created_at ASC
      LIMIT 1
    ) AS first_message,
    MAX(ch.created_at) AS last_message_at,
    COUNT(*) AS message_count
  FROM aura.conversation_history ch
  LEFT JOIN aura.projects p ON p.id = ch.project_id
  WHERE ch.user_wallet_address = LOWER(p_user_wallet)
    AND (p_project_id IS NULL OR ch.project_id = p_project_id)
  GROUP BY ch.conversation_id, ch.project_id, p.name
  ORDER BY last_message_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================
-- 5. UPDATE INSERT CONVERSATION TO SUPPORT PROJECT
-- ============================================================

-- Drop the old function first
DROP FUNCTION IF EXISTS public.aura_insert_conversation(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ);

-- Recreate with project_id support
CREATE OR REPLACE FUNCTION public.aura_insert_conversation(
  p_user_wallet TEXT,
  p_conversation_id TEXT,
  p_message_role TEXT,
  p_message_content TEXT,
  p_created_at TIMESTAMPTZ DEFAULT NOW(),
  p_project_id UUID DEFAULT NULL
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
    created_at,
    project_id
  ) VALUES (
    LOWER(p_user_wallet),
    p_conversation_id,
    p_message_role,
    p_message_content,
    p_created_at,
    p_project_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ============================================================
-- 6. GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.aura_create_project TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_get_projects TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_get_project_by_id TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_update_project TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_delete_project TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_get_project_conversations TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_get_user_conversations TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.aura_insert_conversation TO service_role, authenticated;
