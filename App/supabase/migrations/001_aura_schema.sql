-- Clean up existing aura schema objects if they exist
DROP TABLE IF EXISTS aura.conversation_history CASCADE;
DROP TABLE IF EXISTS aura.user_knowledge CASCADE;
DROP SCHEMA IF EXISTS aura CASCADE;

-- Create aura schema
CREATE SCHEMA IF NOT EXISTS aura;

-- Create conversation_history table in aura schema
CREATE TABLE IF NOT EXISTS aura.conversation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_wallet_address TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant', 'system')),
  message_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
  
  -- Index for fast retrieval by user and conversation
  -- CONSTRAINT fk_aura_conversation_user removed due to type mismatch (text vs uuid)
);

-- Index for searching memories
CREATE INDEX IF NOT EXISTS idx_aura_conversation_user_conv ON aura.conversation_history(user_wallet_address, conversation_id);
CREATE INDEX IF NOT EXISTS idx_aura_conversation_created_at ON aura.conversation_history(created_at);

-- Create user_knowledge table in aura schema
CREATE TABLE IF NOT EXISTS aura.user_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_wallet_address TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('entity', 'fact', 'relationship')),
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- JSON stringified content
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for retrieving knowledge
CREATE INDEX IF NOT EXISTS idx_aura_knowledge_user_cat ON aura.user_knowledge(user_wallet_address, category);

-- RLS Policies
ALTER TABLE aura.conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura.user_knowledge ENABLE ROW LEVEL SECURITY;

-- Grant usage on schema to authenticated users (adjust as needed for your auth model)
GRANT USAGE ON SCHEMA aura TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA aura TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA aura TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA aura TO postgres, anon, authenticated, service_role;
