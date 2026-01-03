-- Migration: 006_aura_delete_conversation.sql
-- Purpose: Add RPC function to delete conversations
-- IDEMPOTENT: Safe to run multiple times

-- Drop function if exists
DROP FUNCTION IF EXISTS public.aura_delete_conversation(TEXT, TEXT);

-- Create function to delete a conversation and all its messages
CREATE OR REPLACE FUNCTION public.aura_delete_conversation(
  p_user_wallet TEXT,
  p_conversation_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = aura, public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete all messages for this conversation
  DELETE FROM aura.conversation_history
  WHERE user_wallet_address = LOWER(p_user_wallet)
    AND conversation_id = p_conversation_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.aura_delete_conversation TO service_role, authenticated;

