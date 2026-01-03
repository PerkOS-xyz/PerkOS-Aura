/**
 * Supabase Database Adapter for elizaOS
 * Implements IDatabaseAdapter interface for user-isolated memory storage
 *
 * Features:
 * - User-isolated storage via wallet address
 * - Conversation history with optional vector embeddings
 * - Knowledge storage (entities, facts, relationships)
 * - Semantic search via pgvector (when embeddings available)
 *
 * Schema: aura (see migrations/001_aura_schema.sql)
 * Security: RLS policies enforce user isolation (see migrations/002_aura_security_fixes.sql)
 * Vector Search: pgvector with 1536-dim embeddings (see migrations/003_aura_vector_search.sql)
 *
 * Note: The aura schema must be exposed in Supabase API settings for direct access.
 *
 * Reference: https://docs.elizaos.ai/runtime/core
 */

import { supabaseAdmin } from "@/lib/db/supabase";
import type { Memory, Entity, Relationship } from "@elizaos/core";

// Fact interface for knowledge storage
export interface Fact {
  id?: string;
  content: string;
  source?: string;
  confidence?: number;
  createdAt?: Date;
}

export class SupabaseAdapter {
  private userWalletAddress: string;
  private roomId: string;
  private projectId: string | null;

  constructor(userWalletAddress: string, projectId?: string) {
    this.userWalletAddress = userWalletAddress.toLowerCase();
    // Use wallet address as roomId for user isolation
    this.roomId = `room_${this.userWalletAddress}`;
    this.projectId = projectId || null;
  }

  /**
   * Set the current project ID for conversation context
   */
  setProjectId(projectId: string | null): void {
    this.projectId = projectId;
  }

  /**
   * Get the current project ID
   */
  getProjectId(): string | null {
    return this.projectId;
  }

  /**
   * Create a memory (conversation message, fact, etc.)
   * Uses RPC wrapper function to bypass schema restrictions
   */
  async createMemory(memory: Memory, projectId?: string): Promise<void> {
    const messageContent =
      typeof memory.content === "string"
        ? memory.content
        : memory.content?.text || JSON.stringify(memory.content);

    const rpcParams = {
      p_user_wallet: this.userWalletAddress,
      p_conversation_id: memory.roomId || this.roomId,
      p_message_role: (memory as any).userId ? "user" : "assistant",
      p_message_content: messageContent,
      p_created_at: memory.createdAt
        ? new Date(memory.createdAt).toISOString()
        : new Date().toISOString(),
      p_project_id: projectId || this.projectId || null,
    };

    console.log("[SupabaseAdapter] createMemory - calling RPC", rpcParams);

    const { data, error } = await supabaseAdmin.rpc("aura_insert_conversation", rpcParams);

    if (error) {
      console.error("[SupabaseAdapter] createMemory - RPC error:", error);
      throw new Error(`Failed to create memory: ${error.message}`);
    }

    console.log("[SupabaseAdapter] createMemory - success", { data });
  }

  /**
   * Get memories by roomId (conversation)
   * Uses RPC wrapper function to bypass schema restrictions
   */
  async getMemories(params?: { roomId?: string; limit?: number }): Promise<Memory[]> {
    const roomId = params?.roomId || this.roomId;
    const limit = params?.limit || 10;

    console.log("[SupabaseAdapter] getMemories - calling RPC", {
      p_user_wallet: this.userWalletAddress,
      p_conversation_id: roomId,
      p_limit: limit,
    });

    const { data, error } = await supabaseAdmin.rpc("aura_get_conversations", {
      p_user_wallet: this.userWalletAddress,
      p_conversation_id: roomId,
      p_limit: limit,
    });

    if (error) {
      console.error("[SupabaseAdapter] getMemories - RPC error:", error);
      return [];
    }

    console.log("[SupabaseAdapter] getMemories - RPC returned", {
      rowCount: data?.length || 0,
      firstRow: data?.[0],
    });

    return (data || []).map((msg: any) => ({
      id: msg.id,
      type: "message" as const,
      roomId: msg.conversation_id || this.roomId,
      userId: msg.message_role === "user" ? this.userWalletAddress : undefined,
      agentId: msg.message_role === "assistant" ? "eliza-agent" : undefined,
      content: {
        text: msg.message_content,
      },
      createdAt: new Date(msg.created_at).getTime(),
    })) as unknown as Memory[];
  }

  /**
   * Search memories by query
   * Uses RPC wrapper function to bypass schema restrictions
   */
  async searchMemories(query: string, limit: number = 10): Promise<Memory[]> {
    const { data, error } = await supabaseAdmin.rpc("aura_search_conversations", {
      p_user_wallet: this.userWalletAddress,
      p_query: query,
      p_limit: limit,
    });

    if (error) {
      console.error("Failed to search memories:", error);
      return [];
    }

    return (data || []).map((msg: any) => ({
      id: msg.id,
      type: "message" as const,
      roomId: msg.conversation_id || this.roomId,
      userId: msg.message_role === "user" ? this.userWalletAddress : undefined,
      agentId: msg.message_role === "assistant" ? "eliza-agent" : undefined,
      content: {
        text: msg.message_content,
      },
      createdAt: new Date(msg.created_at).getTime(),
    })) as unknown as Memory[];
  }

  /**
   * Get memory by ID
   * Uses RPC wrapper function to bypass schema restrictions
   */
  async getMemoryById(id: string): Promise<Memory | null> {
    const { data, error } = await supabaseAdmin.rpc("aura_get_conversation_by_id", {
      p_user_wallet: this.userWalletAddress,
      p_id: id,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    const msg = data[0];
    return {
      id: msg.id,
      type: "message" as const,
      roomId: msg.conversation_id || this.roomId,
      userId: msg.message_role === "user" ? this.userWalletAddress : undefined,
      agentId: msg.message_role === "assistant" ? "eliza-agent" : undefined,
      content: {
        text: msg.message_content,
      },
      createdAt: new Date(msg.created_at).getTime(),
    } as unknown as Memory;
  }

  /**
   * Create an entity
   * Uses RPC wrapper function to bypass schema restrictions
   */
  async createEntity(entity: Entity): Promise<void> {
    const { error } = await supabaseAdmin.rpc("aura_insert_knowledge", {
      p_user_wallet: this.userWalletAddress,
      p_category: "entity",
      p_title: entity.names[0] || "Entity",
      p_content: JSON.stringify(entity),
    });

    if (error) {
      console.error("Failed to create entity:", error);
      throw new Error(`Failed to create entity: ${error.message}`);
    }
  }

  /**
   * Update an entity
   * Uses RPC wrapper functions to bypass schema restrictions
   */
  async updateEntity(entity: Entity): Promise<void> {
    // First, find the entity by searching
    const { data: existingData } = await supabaseAdmin.rpc("aura_get_knowledge", {
      p_user_wallet: this.userWalletAddress,
      p_category: "entity",
      p_limit: 100,
    });

    if (!existingData || existingData.length === 0) {
      // Entity doesn't exist, create it
      await this.createEntity(entity);
      return;
    }

    // Find matching entity by name
    const existing = existingData.find((e: any) => {
      try {
        const parsed = JSON.parse(e.content);
        return parsed.names?.includes(entity.names[0]);
      } catch {
        return e.title === entity.names[0];
      }
    });

    if (!existing) {
      await this.createEntity(entity);
      return;
    }

    const { error } = await supabaseAdmin.rpc("aura_update_knowledge", {
      p_id: existing.id,
      p_user_wallet: this.userWalletAddress,
      p_title: entity.names[0] || "Entity",
      p_content: JSON.stringify(entity),
    });

    if (error) {
      console.error("Failed to update entity:", error);
      throw new Error(`Failed to update entity: ${error.message}`);
    }
  }

  /**
   * Get entity by ID
   * Note: Uses getKnowledge RPC and filters - no direct ID lookup RPC available
   */
  async getEntity(id: string): Promise<Entity | null> {
    // Get all entities and filter by ID (RPC doesn't have direct ID lookup for knowledge)
    const { data, error } = await supabaseAdmin.rpc("aura_get_knowledge", {
      p_user_wallet: this.userWalletAddress,
      p_category: "entity",
      p_limit: 100,
    });

    if (error || !data) {
      return null;
    }

    const entity = data.find((e: any) => e.id === id);
    if (!entity) {
      return null;
    }

    try {
      return JSON.parse(entity.content);
    } catch {
      return null;
    }
  }

  /**
   * Create a relationship between entities
   * Uses RPC wrapper function to bypass schema restrictions
   */
  async createRelationship(rel: Relationship): Promise<void> {
    const { error } = await supabaseAdmin.rpc("aura_insert_knowledge", {
      p_user_wallet: this.userWalletAddress,
      p_category: "relationship",
      p_title: `Relationship: ${(rel as any).sourceEntityId || (rel as any).entityA} -> ${(rel as any).targetEntityId || (rel as any).entityB}`,
      p_content: JSON.stringify(rel),
    });

    if (error) {
      console.error("Failed to create relationship:", error);
      throw new Error(`Failed to create relationship: ${error.message}`);
    }
  }

  /**
   * Get relationships for an entity
   * Uses RPC search function to find relationships containing the entity ID
   */
  async getRelationships(entityId: string): Promise<Relationship[]> {
    const { data, error } = await supabaseAdmin.rpc("aura_search_knowledge", {
      p_user_wallet: this.userWalletAddress,
      p_query: entityId,
      p_category: "relationship",
      p_limit: 100,
    });

    if (error || !data) {
      return [];
    }

    return data
      .map((item: any) => {
        try {
          return JSON.parse(item.content);
        } catch {
          return null;
        }
      })
      .filter((rel: any): rel is Relationship => rel !== null);
  }

  /**
   * Create a fact
   * Uses RPC wrapper function to bypass schema restrictions
   */
  async createFact(fact: Fact): Promise<void> {
    const { error } = await supabaseAdmin.rpc("aura_insert_knowledge", {
      p_user_wallet: this.userWalletAddress,
      p_category: "fact",
      p_title: fact.source || "Fact",
      p_content: JSON.stringify({
        text: fact.content,
        confidence: fact.confidence || 1.0,
        source: fact.source,
      }),
    });

    if (error) {
      console.error("Failed to create fact:", error);
      throw new Error(`Failed to create fact: ${error.message}`);
    }
  }

  /**
   * Search facts by query
   * Uses RPC wrapper function to bypass schema restrictions
   */
  async searchFacts(query: string, limit: number = 10): Promise<Fact[]> {
    const { data, error } = await supabaseAdmin.rpc("aura_search_knowledge", {
      p_user_wallet: this.userWalletAddress,
      p_query: query,
      p_category: "fact",
      p_limit: limit,
    });

    if (error || !data) {
      console.error("Failed to search facts:", error);
      return [];
    }

    return data.map((item: any) => {
      try {
        const parsed = JSON.parse(item.content);
        return {
          id: item.id,
          content: parsed.text || item.content,
          source: parsed.source || item.title,
          confidence: parsed.confidence || 1.0,
          createdAt: new Date(item.created_at),
        };
      } catch {
        return {
          id: item.id,
          content: item.content,
          source: item.title,
          confidence: 1.0,
          createdAt: new Date(item.created_at),
        };
      }
    });
  }

  /**
   * Semantic search for memories using vector embeddings
   * Uses RPC function: aura_search_conversations_semantic
   */
  async searchMemoriesSemantic(
    queryEmbedding: number[],
    limit: number = 10,
    similarityThreshold: number = 0.7
  ): Promise<Array<Memory & { similarity: number }>> {
    const { data, error } = await supabaseAdmin.rpc("aura_search_conversations_semantic", {
      p_user_wallet: this.userWalletAddress,
      p_query_embedding: queryEmbedding,
      p_limit: limit,
      p_similarity_threshold: similarityThreshold,
    });

    if (error) {
      console.error("Semantic search failed:", error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      type: "message" as const,
      roomId: row.conversation_id || this.roomId,
      userId: row.message_role === "user" ? this.userWalletAddress : undefined,
      agentId: row.message_role === "assistant" ? "eliza-agent" : undefined,
      content: { text: row.message_content },
      createdAt: new Date(row.created_at).getTime(),
      similarity: row.similarity,
    })) as Array<Memory & { similarity: number }>;
  }

  /**
   * Semantic search for knowledge using vector embeddings
   * Uses RPC function: aura_search_knowledge_semantic
   */
  async searchKnowledgeSemantic(
    queryEmbedding: number[],
    category?: "entity" | "fact" | "relationship",
    limit: number = 10,
    similarityThreshold: number = 0.7
  ): Promise<Array<{ id: string; category: string; title: string; content: any; similarity: number }>> {
    const { data, error } = await supabaseAdmin.rpc("aura_search_knowledge_semantic", {
      p_user_wallet: this.userWalletAddress,
      p_query_embedding: queryEmbedding,
      p_category: category || null,
      p_limit: limit,
      p_similarity_threshold: similarityThreshold,
    });

    if (error) {
      console.error("Knowledge semantic search failed:", error);
      return [];
    }

    return (data || []).map((row: any) => {
      let parsedContent;
      try {
        parsedContent = JSON.parse(row.content);
      } catch {
        parsedContent = row.content;
      }

      return {
        id: row.id,
        category: row.category,
        title: row.title,
        content: parsedContent,
        similarity: row.similarity,
      };
    });
  }

  /**
   * Update memory with embedding vector
   * Uses RPC wrapper function to bypass schema restrictions
   */
  async updateMemoryEmbedding(memoryId: string, embedding: number[]): Promise<void> {
    const { error } = await supabaseAdmin.rpc("aura_update_conversation_embedding", {
      p_id: memoryId,
      p_user_wallet: this.userWalletAddress,
      p_embedding: embedding,
    });

    if (error) {
      console.error("Failed to update memory embedding:", error);
      throw new Error(`Failed to update embedding: ${error.message}`);
    }
  }

  /**
   * Update knowledge with embedding vector
   * Uses RPC wrapper function to bypass schema restrictions
   */
  async updateKnowledgeEmbedding(knowledgeId: string, embedding: number[]): Promise<void> {
    const { error } = await supabaseAdmin.rpc("aura_update_knowledge_embedding", {
      p_id: knowledgeId,
      p_user_wallet: this.userWalletAddress,
      p_embedding: embedding,
    });

    if (error) {
      console.error("Failed to update knowledge embedding:", error);
      throw new Error(`Failed to update embedding: ${error.message}`);
    }
  }

  /**
   * Get user's room ID
   */
  getRoomId(): string {
    return this.roomId;
  }

  /**
   * Get user's wallet address
   */
  getUserWalletAddress(): string {
    return this.userWalletAddress;
  }

  /**
   * Initialize the adapter (required by elizaOS)
   */
  async init(): Promise<void> {
    // Supabase adapter doesn't need initialization
    // Connection is handled by supabaseAdmin client
    return Promise.resolve();
  }

  /**
   * Close the adapter (required by elizaOS)
   */
  async close(): Promise<void> {
    // Supabase adapter doesn't need cleanup
    return Promise.resolve();
  }
}
