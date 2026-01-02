/**
 * Supabase Database Adapter for elizaOS
 * Implements IDatabaseAdapter interface for user-isolated memory storage
 * 
 * Reference: https://docs.elizaos.ai/runtime/core
 */

import { supabaseAdmin } from "@/lib/db/supabase";
import type { IDatabaseAdapter, Memory, Entity, Relationship } from "@elizaos/core";

export class SupabaseAdapter {
  private userWalletAddress: string;
  private roomId: string;

  constructor(userWalletAddress: string) {
    this.userWalletAddress = userWalletAddress.toLowerCase();
    // Use wallet address as roomId for user isolation
    this.roomId = `room_${this.userWalletAddress}`;
  }

  /**
   * Create a memory (conversation message, fact, etc.)
   */
  async createMemory(memory: Memory): Promise<void> {
    const { error } = await supabaseAdmin.schema("aura").from("conversation_history").insert({
      user_wallet_address: this.userWalletAddress,
      conversation_id: memory.roomId || this.roomId,
      message_role: (memory as any).userId ? "user" : "assistant",
      message_content: typeof memory.content === "string"
        ? memory.content
        : memory.content?.text || JSON.stringify(memory.content),
      created_at: memory.createdAt
        ? new Date(memory.createdAt).toISOString()
        : new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to create memory:", error);
      throw new Error(`Failed to create memory: ${error.message}`);
    }
  }

  /**
   * Get memories by roomId (conversation)
   * This is called by AgentRuntime.getMemories()
   */
  async getMemories(params?: { roomId?: string; limit?: number }): Promise<Memory[]> {
    const roomId = params?.roomId || this.roomId;
    const limit = params?.limit || 10;

    const { data, error } = await supabaseAdmin
      .schema("aura")
      .from("conversation_history")
      .select("*")
      .eq("user_wallet_address", this.userWalletAddress)
      .eq("conversation_id", roomId)
      .order("created_at", { ascending: true }) // Ascending to get chronological order
      .limit(limit);

    if (error) {
      console.error("Failed to get memories:", error);
      return [];
    }

    return (data || []).map((msg) => ({
      id: msg.id,
      type: "message" as const,
      roomId: msg.conversation_id || this.roomId,
      userId: msg.message_role === "user" ? this.userWalletAddress : undefined,
      agentId: msg.message_role === "assistant" ? "eliza-agent" : undefined,
      content: {
        text: msg.message_content,
      },
      createdAt: new Date(msg.created_at).getTime(), // Ensure number
    } as unknown as Memory));
  }

  /**
   * Search memories by query
   */
  async searchMemories(query: string, limit: number = 10): Promise<Memory[]> {
    const { data, error } = await supabaseAdmin
      .schema("aura")
      .from("conversation_history")
      .select("*")
      .eq("user_wallet_address", this.userWalletAddress)
      .ilike("message_content", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to search memories:", error);
      return [];
    }

    return (data || []).map((msg) => ({
      id: msg.id,
      type: "message" as const,
      roomId: msg.conversation_id || this.roomId,
      userId: msg.message_role === "user" ? this.userWalletAddress : undefined,
      agentId: msg.message_role === "assistant" ? "eliza-agent" : undefined,
      content: {
        text: msg.message_content,
      },
      createdAt: new Date(msg.created_at).getTime(),
    } as unknown as Memory));
  }

  /**
   * Get memory by ID
   */
  async getMemoryById(id: string): Promise<Memory | null> {
    const { data, error } = await supabaseAdmin
      .schema("aura")
      .from("conversation_history")
      .select("*")
      .eq("id", id)
      .eq("user_wallet_address", this.userWalletAddress)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      type: "message" as const,
      roomId: data.conversation_id || this.roomId,
      userId: data.message_role === "user" ? this.userWalletAddress : undefined,
      agentId: data.message_role === "assistant" ? "eliza-agent" : undefined,
      content: {
        text: data.message_content,
      },
      createdAt: new Date(data.created_at).getTime(),
    } as unknown as Memory;
  }

  /**
   * Create an entity
   */
  async createEntity(entity: Entity): Promise<void> {
    // Store as knowledge in user_knowledge table
    const { error } = await supabaseAdmin.schema("aura").from("user_knowledge").insert({
      user_wallet_address: this.userWalletAddress,
      title: entity.names[0] || "Entity",
      content: JSON.stringify(entity),
      category: "entity",
    });

    if (error) {
      console.error("Failed to create entity:", error);
      throw new Error(`Failed to create entity: ${error.message}`);
    }
  }

  /**
   * Update an entity
   */
  async updateEntity(entity: Entity): Promise<void> {
    // Update knowledge entry
    const { error } = await supabaseAdmin
      .schema("aura")
      .from("user_knowledge")
      .update({
        title: entity.names[0] || "Entity",
        content: JSON.stringify(entity),
        updated_at: new Date().toISOString(),
      })
      .eq("user_wallet_address", this.userWalletAddress)
      .eq("category", "entity");

    if (error) {
      console.error("Failed to update entity:", error);
      throw new Error(`Failed to update entity: ${error.message}`);
    }
  }

  /**
   * Get entity by ID
   */
  async getEntity(id: string): Promise<Entity | null> {
    const { data, error } = await supabaseAdmin
      .schema("aura")
      .from("user_knowledge")
      .select("*")
      .eq("id", id)
      .eq("user_wallet_address", this.userWalletAddress)
      .eq("category", "entity")
      .single();

    if (error || !data) {
      return null;
    }

    try {
      return JSON.parse(data.content);
    } catch {
      return null;
    }
  }

  /**
   * Create a relationship between entities
   */
  async createRelationship(rel: Relationship): Promise<void> {
    // Store relationships in user_knowledge with special category
    const { error } = await supabaseAdmin.schema("aura").from("user_knowledge").insert({
      user_wallet_address: this.userWalletAddress,
      title: `Relationship: ${(rel as any).sourceEntityId || (rel as any).entityA} -> ${(rel as any).targetEntityId || (rel as any).entityB}`,
      content: JSON.stringify(rel),
      category: "relationship",
    });

    if (error) {
      console.error("Failed to create relationship:", error);
      throw new Error(`Failed to create relationship: ${error.message}`);
    }
  }

  /**
   * Get relationships for an entity
   */
  async getRelationships(entityId: string): Promise<Relationship[]> {
    const { data, error } = await supabaseAdmin
      .schema("aura")
      .from("user_knowledge")
      .select("*")
      .eq("user_wallet_address", this.userWalletAddress)
      .eq("category", "relationship")
      .or(`content->>'entityA'.eq.${entityId},content->>'entityB'.eq.${entityId}`);

    if (error || !data) {
      return [];
    }

    return data
      .map((item) => {
        try {
          return JSON.parse(item.content);
        } catch {
          return null;
        }
      })
      .filter((rel): rel is Relationship => rel !== null);
  }

  /**
   * Create a fact
   */


  /**
   * Search facts
   */


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

