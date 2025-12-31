-- Migration: Initial schema for PerkOS Vendor API
-- Description: Create tables for tokens, user sessions, elizaOS data, and campaigns
-- 
-- This migration creates a separate schema (vendor_api) so it can coexist
-- with PerkOS-Stack tables in the same Supabase database.
-- 
-- RUN THIS SQL IN SUPABASE SQL EDITOR:
-- =====================================

-- Create vendor_api schema (namespace for vendor API tables)
CREATE SCHEMA IF NOT EXISTS vendor_api;

-- Helper function for updated_at timestamps (in vendor_api schema)
CREATE OR REPLACE FUNCTION vendor_api.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USER SESSIONS & AUTHENTICATION
-- ============================================================================

-- User sessions table (Thirdweb authentication)
CREATE TABLE IF NOT EXISTS vendor_api.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User identification (wallet address from Thirdweb)
    wallet_address TEXT NOT NULL,
    
    -- Session details
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- User metadata
    display_name TEXT,
    email TEXT,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for user sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_wallet ON vendor_api.user_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON vendor_api.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON vendor_api.user_sessions(is_active, expires_at);

-- ============================================================================
-- ERC20 TOKENS
-- ============================================================================

-- User tokens table (tokens created by users)
CREATE TABLE IF NOT EXISTS vendor_api.user_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Token contract details
    token_address TEXT NOT NULL UNIQUE,
    network TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    
    -- Token metadata
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    decimals INTEGER NOT NULL DEFAULT 18,
    total_supply TEXT NOT NULL, -- Stored as string to handle large numbers
    
    -- Ownership
    owner_address TEXT NOT NULL, -- Wallet address that owns the token
    
    -- Deployment details
    deployment_tx_hash TEXT,
    deployment_block_number BIGINT,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for tokens
CREATE INDEX IF NOT EXISTS idx_user_tokens_owner ON vendor_api.user_tokens(owner_address);
CREATE INDEX IF NOT EXISTS idx_user_tokens_network ON vendor_api.user_tokens(network);
CREATE INDEX IF NOT EXISTS idx_user_tokens_address ON vendor_api.user_tokens(token_address);
CREATE INDEX IF NOT EXISTS idx_user_tokens_created ON vendor_api.user_tokens(created_at DESC);

-- Token distributions table (track distribution history)
CREATE TABLE IF NOT EXISTS vendor_api.token_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Token reference
    token_id UUID NOT NULL REFERENCES vendor_api.user_tokens(id) ON DELETE CASCADE,
    token_address TEXT NOT NULL,
    
    -- Distribution details
    owner_address TEXT NOT NULL, -- Token owner who initiated distribution
    distribution_tx_hash TEXT,
    distribution_block_number BIGINT,
    
    -- Recipients (stored as JSONB for flexibility)
    recipients JSONB NOT NULL, -- Array of {address, amount, success}
    total_recipients INTEGER NOT NULL,
    total_amount TEXT NOT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'partial'
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for distributions
CREATE INDEX IF NOT EXISTS idx_token_distributions_token ON vendor_api.token_distributions(token_id);
CREATE INDEX IF NOT EXISTS idx_token_distributions_owner ON vendor_api.token_distributions(owner_address);
CREATE INDEX IF NOT EXISTS idx_token_distributions_created ON vendor_api.token_distributions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_distributions_status ON vendor_api.token_distributions(status);

-- ============================================================================
-- ELIZAOS USER DATA (User-Isolated)
-- ============================================================================

-- User knowledge base (elizaOS knowledge per user)
CREATE TABLE IF NOT EXISTS vendor_api.user_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User isolation
    user_wallet_address TEXT NOT NULL,
    
    -- Knowledge content
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT, -- 'token', 'campaign', 'api', 'general'
    
    -- Metadata
    source TEXT, -- Where this knowledge came from
    tags TEXT[], -- Array of tags
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for knowledge
CREATE INDEX IF NOT EXISTS idx_user_knowledge_user ON vendor_api.user_knowledge(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_knowledge_category ON vendor_api.user_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_user_knowledge_created ON vendor_api.user_knowledge(created_at DESC);

-- User memories (elizaOS memories per user)
CREATE TABLE IF NOT EXISTS vendor_api.user_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User isolation
    user_wallet_address TEXT NOT NULL,
    
    -- Memory content
    memory_type TEXT NOT NULL, -- 'short_term', 'long_term', 'episodic'
    content TEXT NOT NULL,
    context JSONB, -- Additional context/metadata
    
    -- Importance/weight
    importance_score DECIMAL(3, 2) DEFAULT 0.5, -- 0.0 to 1.0
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for memories
CREATE INDEX IF NOT EXISTS idx_user_memories_user ON vendor_api.user_memories(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_memories_type ON vendor_api.user_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_user_memories_importance ON vendor_api.user_memories(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_memories_accessed ON vendor_api.user_memories(last_accessed_at DESC);

-- Conversation history (elizaOS chat per user)
CREATE TABLE IF NOT EXISTS vendor_api.conversation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User isolation
    user_wallet_address TEXT NOT NULL,
    
    -- Conversation details
    conversation_id TEXT NOT NULL, -- Group messages by conversation
    message_role TEXT NOT NULL, -- 'user' or 'assistant'
    message_content TEXT NOT NULL,
    
    -- Metadata
    tokens_used INTEGER, -- Token count for this message
    model_used TEXT, -- Model used (e.g., 'gpt-4o-mini')
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for conversation history
CREATE INDEX IF NOT EXISTS idx_conversation_history_user ON vendor_api.conversation_history(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_conversation_history_conversation ON vendor_api.conversation_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_created ON vendor_api.conversation_history(created_at DESC);

-- ============================================================================
-- CAMPAIGNS (Agent-Generated)
-- ============================================================================

-- Campaigns table (agent-generated campaigns for API testing)
CREATE TABLE IF NOT EXISTS vendor_api.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User isolation
    user_wallet_address TEXT NOT NULL,
    
    -- Campaign details
    name TEXT NOT NULL,
    description TEXT,
    campaign_type TEXT NOT NULL, -- 'api_test', 'token_operation', 'custom'
    
    -- Campaign configuration
    config JSONB NOT NULL, -- Campaign parameters and settings
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    
    -- Results
    results JSONB, -- Campaign execution results
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON vendor_api.campaigns(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON vendor_api.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON vendor_api.campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON vendor_api.campaigns(created_at DESC);

-- ============================================================================
-- X402 TRANSACTIONS (Cache/Optional)
-- ============================================================================

-- Cached x402 transactions (optional - can query facilitator API instead)
CREATE TABLE IF NOT EXISTS vendor_api.x402_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Transaction details
    transaction_hash TEXT NOT NULL UNIQUE,
    payer_address TEXT NOT NULL,
    recipient_address TEXT NOT NULL,
    
    -- Payment details
    amount_wei TEXT NOT NULL,
    amount_usd DECIMAL(20, 6),
    asset_symbol TEXT DEFAULT 'USDC',
    network TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    
    -- Endpoint details
    endpoint_path TEXT, -- API endpoint called
    endpoint_method TEXT, -- HTTP method
    
    -- Status
    status TEXT NOT NULL DEFAULT 'success',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_x402_tx_payer ON vendor_api.x402_transactions(payer_address);
CREATE INDEX IF NOT EXISTS idx_x402_tx_recipient ON vendor_api.x402_transactions(recipient_address);
CREATE INDEX IF NOT EXISTS idx_x402_tx_created ON vendor_api.x402_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_x402_tx_network ON vendor_api.x402_transactions(network);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON vendor_api.user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION vendor_api.update_updated_at_column();

CREATE TRIGGER update_user_tokens_updated_at
    BEFORE UPDATE ON vendor_api.user_tokens
    FOR EACH ROW
    EXECUTE FUNCTION vendor_api.update_updated_at_column();

CREATE TRIGGER update_user_memories_updated_at
    BEFORE UPDATE ON vendor_api.user_memories
    FOR EACH ROW
    EXECUTE FUNCTION vendor_api.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON vendor_api.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION vendor_api.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all user-isolated tables
ALTER TABLE vendor_api.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_api.user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_api.token_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_api.user_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_api.user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_api.conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_api.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_api.x402_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
-- Note: These policies use wallet_address from JWT claims or session context

-- User sessions: Users can manage their own sessions
CREATE POLICY user_sessions_owner_policy ON vendor_api.user_sessions
    FOR ALL
    USING (wallet_address = current_setting('app.user_wallet_address', true)::TEXT);

-- User tokens: Users can view/manage their own tokens
CREATE POLICY user_tokens_owner_policy ON vendor_api.user_tokens
    FOR ALL
    USING (owner_address = current_setting('app.user_wallet_address', true)::TEXT);

-- Token distributions: Users can view distributions of their tokens
CREATE POLICY token_distributions_owner_policy ON vendor_api.token_distributions
    FOR ALL
    USING (owner_address = current_setting('app.user_wallet_address', true)::TEXT);

-- User knowledge: Users can only access their own knowledge
CREATE POLICY user_knowledge_owner_policy ON vendor_api.user_knowledge
    FOR ALL
    USING (user_wallet_address = current_setting('app.user_wallet_address', true)::TEXT);

-- User memories: Users can only access their own memories
CREATE POLICY user_memories_owner_policy ON vendor_api.user_memories
    FOR ALL
    USING (user_wallet_address = current_setting('app.user_wallet_address', true)::TEXT);

-- Conversation history: Users can only access their own conversations
CREATE POLICY conversation_history_owner_policy ON vendor_api.conversation_history
    FOR ALL
    USING (user_wallet_address = current_setting('app.user_wallet_address', true)::TEXT);

-- Campaigns: Users can only access their own campaigns
CREATE POLICY campaigns_owner_policy ON vendor_api.campaigns
    FOR ALL
    USING (user_wallet_address = current_setting('app.user_wallet_address', true)::TEXT);

-- Transactions: Users can view their own transactions
CREATE POLICY x402_transactions_owner_policy ON vendor_api.x402_transactions
    FOR SELECT
    USING (
        payer_address = current_setting('app.user_wallet_address', true)::TEXT OR
        recipient_address = current_setting('app.user_wallet_address', true)::TEXT
    );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON SCHEMA vendor_api IS 'Schema for PerkOS Vendor API tables - can coexist with PerkOS-Stack tables';
COMMENT ON TABLE vendor_api.user_tokens IS 'ERC20 tokens created by users via the vendor API';
COMMENT ON TABLE vendor_api.token_distributions IS 'Token distribution history - tracks batch transfers';
COMMENT ON TABLE vendor_api.user_knowledge IS 'elizaOS knowledge base - user-isolated knowledge storage';
COMMENT ON TABLE vendor_api.user_memories IS 'elizaOS memories - user-isolated memory storage';
COMMENT ON TABLE vendor_api.conversation_history IS 'elizaOS conversation history - user-isolated chat logs';
COMMENT ON TABLE vendor_api.campaigns IS 'Agent-generated campaigns for API testing and automation';
COMMENT ON TABLE vendor_api.x402_transactions IS 'Cached x402 payment transactions (optional - can query facilitator API)';
