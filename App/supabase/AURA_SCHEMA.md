# Aura Schema Documentation

The Aura schema provides user-isolated memory storage for the elizaOS AI agent framework.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AURA SCHEMA                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │ conversation_history│    │       user_knowledge            │ │
│  ├─────────────────────┤    ├─────────────────────────────────┤ │
│  │ id (UUID PK)        │    │ id (UUID PK)                    │ │
│  │ user_wallet_address │    │ user_wallet_address             │ │
│  │ conversation_id     │    │ category (entity|fact|relation) │ │
│  │ message_role        │    │ title                           │ │
│  │ message_content     │    │ content (JSON)                  │ │
│  │ embedding (vector)  │    │ embedding (vector)              │ │
│  │ created_at          │    │ created_at / updated_at         │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Migrations

| Migration | Purpose |
|-----------|---------|
| `001_aura_schema.sql` | Initial schema creation |
| `002_aura_security_fixes.sql` | RLS policies, grants, size limits, retention |
| `003_aura_vector_search.sql` | pgvector extension and semantic search |
| `004_aura_rpc_wrappers.sql` | RPC wrapper functions in public schema for aura access |

**Note**: The RPC wrappers in migration 004 bypass PostgREST schema restrictions by placing functions
in the `public` schema that access `aura` tables with `SECURITY DEFINER`.

## Tables

### `aura.conversation_history`

Stores conversation messages between users and the AI agent.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_wallet_address` | TEXT | User's wallet address (lowercase) |
| `conversation_id` | TEXT | Groups messages into conversations |
| `message_role` | TEXT | `user`, `assistant`, or `system` |
| `message_content` | TEXT | Message text (max 100KB) |
| `embedding` | vector(1536) | Optional embedding for semantic search |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

**Indexes:**
- `idx_aura_conversation_user_conv` - Fast lookup by user + conversation
- `idx_aura_conversation_created_at` - Chronological queries
- `idx_aura_conversation_role` - Filter by message role
- `idx_aura_conversation_embedding` - Vector similarity search (IVFFlat)
- `idx_aura_conversation_retention` - Partial index for cleanup

### `aura.user_knowledge`

Stores extracted knowledge (entities, facts, relationships).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_wallet_address` | TEXT | User's wallet address (lowercase) |
| `category` | TEXT | `entity`, `fact`, or `relationship` |
| `title` | TEXT | Short description (max 500 chars) |
| `content` | TEXT | JSON-stringified content (max 500KB) |
| `embedding` | vector(1536) | Optional embedding for semantic search |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_aura_knowledge_user_cat` - Fast lookup by user + category
- `idx_aura_knowledge_updated` - Recent knowledge queries
- `idx_aura_knowledge_embedding` - Vector similarity search (IVFFlat)
- `idx_aura_knowledge_retention` - Partial index for cleanup

## Security

### Row Level Security (RLS)

Both tables have RLS enabled with the following policies:

| Policy | Role | Access |
|--------|------|--------|
| Service role full access | `service_role` | ALL operations |
| Users can view own | `authenticated` | SELECT where wallet matches |
| Users can insert own | `authenticated` | INSERT where wallet matches |
| Users can update own (knowledge only) | `authenticated` | UPDATE where wallet matches |

**Note:** The primary access method is via `service_role` (server-side API routes). Direct authenticated access requires JWT claims with `wallet_address`.

### Grants

```sql
-- Schema access
GRANT USAGE ON SCHEMA aura TO postgres, authenticated, service_role;

-- Table access
GRANT ALL ON ALL TABLES IN SCHEMA aura TO postgres, service_role;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA aura TO authenticated;
```

**Security Note:** `anon` role has no access to the aura schema.

## Size Limits

| Table | Column | Max Size |
|-------|--------|----------|
| conversation_history | message_content | 100KB (102,400 bytes) |
| user_knowledge | content | 500KB (512,000 bytes) |
| user_knowledge | title | 500 characters |

## Retention Policy

Cleanup functions are provided for data lifecycle management:

```sql
-- Delete conversations older than 90 days
SELECT aura.cleanup_old_conversations(90);

-- Delete knowledge not updated in 180 days
SELECT aura.cleanup_old_knowledge(180);
```

**Recommended:** Schedule via Supabase cron or external job:
```sql
-- Example: Run daily at 3 AM UTC
SELECT cron.schedule(
  'cleanup-aura-conversations',
  '0 3 * * *',
  'SELECT aura.cleanup_old_conversations(90)'
);
```

## Vector Search

### Embedding Dimensions

- **Model:** OpenAI text-embedding-ada-002 (or compatible)
- **Dimensions:** 1536
- **Index Type:** IVFFlat with 100 lists

### Semantic Search Functions

#### `aura.search_conversations_semantic`

Search conversations by semantic similarity.

```sql
SELECT * FROM aura.search_conversations_semantic(
  '0x1234...',           -- user wallet
  '[0.1, 0.2, ...]'::vector,  -- query embedding
  10,                    -- limit
  0.7                    -- similarity threshold
);
```

#### `aura.search_knowledge_semantic`

Search knowledge by semantic similarity with optional category filter.

```sql
SELECT * FROM aura.search_knowledge_semantic(
  '0x1234...',           -- user wallet
  '[0.1, 0.2, ...]'::vector,  -- query embedding
  'entity',              -- category filter (optional)
  10,                    -- limit
  0.7                    -- similarity threshold
);
```

#### `aura.find_related_memories`

Find memories related to a specific memory.

```sql
SELECT * FROM aura.find_related_memories(
  '0x1234...',           -- user wallet
  'uuid-of-memory',      -- source memory ID
  5                      -- limit
);
```

## TypeScript Integration

### SupabaseAdapter

The `SupabaseAdapter` class provides TypeScript methods for all operations.

**Important**: The adapter uses RPC wrapper functions defined in `004_aura_rpc_wrappers.sql` to access
the `aura` schema. This bypasses PostgREST schema restrictions and provides a reliable access pattern.

```typescript
import { SupabaseAdapter } from "@/lib/services/elizaos/SupabaseAdapter";

const adapter = new SupabaseAdapter("0x1234...");

// Basic operations
await adapter.createMemory(memory);
const memories = await adapter.getMemories({ roomId, limit: 10 });
await adapter.createFact({ content: "User prefers dark mode" });

// Semantic search (requires embeddings)
const similar = await adapter.searchMemoriesSemantic(
  queryEmbedding,
  10,    // limit
  0.7    // threshold
);

// Update embeddings
await adapter.updateMemoryEmbedding(memoryId, embedding);
```

### RPC Function Mapping

| Adapter Method | RPC Function |
|---------------|--------------|
| `createMemory()` | `aura_insert_conversation` |
| `getMemories()` | `aura_get_conversations` |
| `searchMemories()` | `aura_search_conversations` |
| `getMemoryById()` | `aura_get_conversation_by_id` |
| `createEntity()` | `aura_insert_knowledge` |
| `updateEntity()` | `aura_get_knowledge` + `aura_update_knowledge` |
| `createFact()` | `aura_insert_knowledge` |
| `createRelationship()` | `aura_insert_knowledge` |
| `searchFacts()` | `aura_search_knowledge` |
| `getRelationships()` | `aura_search_knowledge` |
| `searchMemoriesSemantic()` | `aura_search_conversations_semantic` |
| `searchKnowledgeSemantic()` | `aura_search_knowledge_semantic` |
| `updateMemoryEmbedding()` | `aura_update_conversation_embedding` |
| `updateKnowledgeEmbedding()` | `aura_update_knowledge_embedding` |

## Design Decisions

### Why TEXT for wallet addresses?

Wallet addresses are stored as `TEXT` rather than linking to a users table because:
1. **Flexibility:** Works with any wallet format (EVM, Solana, etc.)
2. **Simplicity:** No FK constraints to manage
3. **Isolation:** Each service can operate independently

### Why JSON stringified content?

Knowledge content is stored as stringified JSON to:
1. Support flexible schemas per category
2. Allow complex nested structures
3. Enable full-text search via ILIKE

### Why IVFFlat over HNSW?

IVFFlat was chosen for vector indexing because:
1. **Scale:** Sufficient for medium-scale (millions of vectors)
2. **Memory:** Lower memory footprint than HNSW
3. **Build time:** Faster index creation
4. **Trade-off:** Slightly lower recall acceptable for conversational AI

## Troubleshooting

### "relation aura.xxx does not exist"

Run all migrations in order:
```bash
supabase db push
# or manually
psql -f supabase/migrations/001_aura_schema.sql
psql -f supabase/migrations/002_aura_security_fixes.sql
psql -f supabase/migrations/003_aura_vector_search.sql
psql -f supabase/migrations/004_aura_rpc_wrappers.sql
```

### "PGRST106: The schema must be one of the following: public, ..."

This error occurs when PostgREST doesn't recognize the `aura` schema, even if it's configured
in Supabase settings. The solution is to use RPC wrapper functions:

1. Run migration `004_aura_rpc_wrappers.sql` to create wrapper functions in `public` schema
2. The SupabaseAdapter uses these RPC functions to access `aura` tables
3. No need to expose `aura` schema in API settings - wrappers handle access

### "permission denied for schema aura"

Ensure you're using `service_role` key for server operations:
```typescript
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(url, SERVICE_ROLE_KEY);
```

### Vector search returns empty results

1. Check embeddings are populated: `SELECT COUNT(*) FROM aura.conversation_history WHERE embedding IS NOT NULL`
2. Lower similarity threshold: Try `0.5` instead of `0.7`
3. Verify embedding dimensions: Must be exactly 1536

### Slow queries

1. Ensure indexes exist: `\di aura.*`
2. For vector search, increase IVFFlat lists: Recreate index with `lists = 200`
3. Use `EXPLAIN ANALYZE` to identify bottlenecks
