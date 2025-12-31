# elizaOS Integration Guide

This document outlines how to properly integrate elizaOS framework into the Token Service API.

## Overview

Based on the [elizaOS documentation](https://docs.elizaos.ai/runtime/core), we need to:

1. **Use AgentRuntime** - Central orchestrator for agent lifecycle
2. **Implement Database Adapter** - For user-isolated memory storage
3. **Use Memory System** - For conversations and knowledge
4. **Use Model Management** - Instead of direct OpenAI calls
5. **Integrate MCP Plugin** - For token operations

## Architecture

```
ElizaService (per user)
  └── AgentRuntime
      ├── SupabaseAdapter (user-isolated)
      ├── Character (agent personality)
      ├── Plugins (MCP plugin for tokens)
      └── Model Provider (OpenAI)
```

## Implementation Steps

### 1. Install Required Packages

```bash
npm install @elizaos/core@1.7.0
```

### 2. Create Supabase Database Adapter

The `SupabaseAdapter` implements `IDatabaseAdapter` interface:
- `createMemory()` - Store conversation messages
- `searchMemories()` - Search conversation history
- `createEntity()` - Store entities (tokens, users, etc.)
- `createFact()` - Store extracted facts
- `createRelationship()` - Store entity relationships

**Key:** All operations are filtered by `user_wallet_address` for isolation.

### 3. Initialize AgentRuntime Per User

```typescript
import { AgentRuntime } from "@elizaos/core";
import { SupabaseAdapter } from "./SupabaseAdapter";

const adapter = new SupabaseAdapter(userWalletAddress);
const runtime = new AgentRuntime({
  databaseAdapter: adapter,
  character: {
    name: "Token Assistant",
    // ... character config
  },
  // ... other config
});
```

### 4. Process Messages

```typescript
// Create memory for user message
const memory = await runtime.createMemory({
  type: MemoryType.MESSAGE,
  content: { text: userMessage },
  roomId: conversationId,
  userId: userWalletAddress,
});

// Process with agent
const state = await runtime.composeState(memory);
await runtime.processActions(memory, [], state);

// Get response
const response = await runtime.generateResponse(memory, state);
```

### 5. Integrate MCP Plugin

The MCP plugin should be registered as an elizaOS Action:

```typescript
runtime.registerAction({
  name: "create_token",
  description: "Create ERC20 token",
  handler: async (runtime, message, state) => {
    // Call MCP plugin
    // Make x402 payment
    // Deploy token
  },
});
```

## User Isolation

**Critical:** Each user must have:
- Separate `AgentRuntime` instance
- Separate `SupabaseAdapter` with `user_wallet_address` filter
- Isolated memory/knowledge/facts
- No data mixing between users

## References

- [elizaOS Core Documentation](https://docs.elizaos.ai/runtime/core)
- [Memory & State](https://docs.elizaos.ai/runtime/memory)
- [Model Management](https://docs.elizaos.ai/runtime/models)
- [Plugin Architecture](https://docs.elizaos.ai/plugins/architecture)

