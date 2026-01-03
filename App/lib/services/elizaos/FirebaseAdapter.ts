/**
 * Firebase Firestore Database Adapter for elizaOS
 * Implements IDatabaseAdapter interface for user-isolated memory storage
 *
 * Features:
 * - User-isolated storage via wallet address
 * - Conversation history
 * - Knowledge storage (entities, facts, relationships)
 *
 * Reference: https://docs.elizaos.ai/runtime/core
 */

import { getFirestoreInstance, getConversationMessagesPath, getUserCollectionPath, COLLECTIONS } from "@/lib/db/firebase";
import type { Memory, Entity, Relationship } from "@elizaos/core";
import { FieldValue } from "firebase-admin/firestore";

// Fact interface for knowledge storage
export interface Fact {
  id?: string;
  content: string;
  source?: string;
  confidence?: number;
  createdAt?: Date;
}

export class FirebaseAdapter {
  private userWalletAddress: string;
  private roomId: string;
  private projectId: string | null;
  private db;

  constructor(userWalletAddress: string, projectId?: string) {
    this.userWalletAddress = userWalletAddress.toLowerCase();
    // Use wallet address as roomId for user isolation
    this.roomId = `room_${this.userWalletAddress}`;
    this.projectId = projectId || null;
    this.db = getFirestoreInstance();
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
   */
  async createMemory(memory: Memory, projectId?: string): Promise<void> {
    const messageContent =
      typeof memory.content === "string"
        ? memory.content
        : memory.content?.text || JSON.stringify(memory.content);

    const conversationId = memory.roomId || this.roomId;
    const messagesPath = getConversationMessagesPath(this.userWalletAddress, conversationId);
    const messageRef = this.db.collection(messagesPath).doc();

    const messageData = {
      id: messageRef.id,
      conversation_id: conversationId,
      user_wallet_address: this.userWalletAddress,
      message_role: (memory as any).userId ? "user" : "assistant",
      message_content: messageContent,
      project_id: projectId || this.projectId || null,
      created_at: memory.createdAt ? new Date(memory.createdAt) : FieldValue.serverTimestamp(),
    };

    console.log("[FirebaseAdapter] createMemory - creating message", {
      conversationId,
      messageRole: messageData.message_role,
      projectId: messageData.project_id,
    });

    await messageRef.set(messageData);

    // Update conversation metadata
    const conversationRef = this.db
      .collection(getUserCollectionPath(COLLECTIONS.CONVERSATIONS, this.userWalletAddress))
      .doc(conversationId);

    await conversationRef.set(
      {
        conversation_id: conversationId,
        user_wallet_address: this.userWalletAddress,
        project_id: messageData.project_id,
        last_message_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log("[FirebaseAdapter] createMemory - success", { messageId: messageRef.id });
  }

  /**
   * Get memories by roomId (conversation)
   */
  async getMemories(params?: { roomId?: string; limit?: number }): Promise<Memory[]> {
    const roomId = params?.roomId || this.roomId;
    const limit = params?.limit || 100;

    console.log("[FirebaseAdapter] getMemories - fetching", {
      userWallet: this.userWalletAddress,
      conversationId: roomId,
      limit,
    });

    const messagesPath = getConversationMessagesPath(this.userWalletAddress, roomId);
    const snapshot = await this.db
      .collection(messagesPath)
      .orderBy("created_at", "asc")
      .limit(limit)
      .get();

    const memories = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: "message" as const,
        roomId: data.conversation_id || roomId,
        userId: data.message_role === "user" ? this.userWalletAddress : undefined,
        agentId: data.message_role === "assistant" ? "eliza-agent" : undefined,
        content: {
          text: data.message_content,
        },
        createdAt: data.created_at?.toMillis?.() || new Date(data.created_at).getTime(),
      };
    }) as unknown as Memory[];

    console.log("[FirebaseAdapter] getMemories - returned", {
      conversationId: roomId,
      memoryCount: memories.length,
    });

    return memories;
  }

  /**
   * Search memories by query
   */
  async searchMemories(query: string, limit: number = 10): Promise<Memory[]> {
    const conversationsRef = this.db
      .collectionGroup(COLLECTIONS.MESSAGES)
      .where("user_wallet_address", "==", this.userWalletAddress);

    const snapshot = await conversationsRef
      .where("message_content", ">=", query)
      .where("message_content", "<=", query + "\uf8ff")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: "message" as const,
        roomId: data.conversation_id || this.roomId,
        userId: data.message_role === "user" ? this.userWalletAddress : undefined,
        agentId: data.message_role === "assistant" ? "eliza-agent" : undefined,
        content: {
          text: data.message_content,
        },
        createdAt: data.created_at?.toMillis?.() || new Date(data.created_at).getTime(),
      };
    }) as unknown as Memory[];
  }

  /**
   * Get memory by ID
   */
  async getMemoryById(id: string): Promise<Memory | null> {
    // Search across all user conversations
    const conversationsRef = this.db
      .collectionGroup(COLLECTIONS.MESSAGES)
      .where("user_wallet_address", "==", this.userWalletAddress)
      .where("id", "==", id)
      .limit(1);

    const snapshot = await conversationsRef.get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      type: "message" as const,
      roomId: data.conversation_id || this.roomId,
      userId: data.message_role === "user" ? this.userWalletAddress : undefined,
      agentId: data.message_role === "assistant" ? "eliza-agent" : undefined,
      content: {
        text: data.message_content,
      },
      createdAt: data.created_at?.toMillis?.() || new Date(data.created_at).getTime(),
    } as unknown as Memory;
  }

  /**
   * Create an entity
   */
  async createEntity(entity: Entity): Promise<void> {
    const knowledgeRef = this.db
      .collection(getUserCollectionPath(COLLECTIONS.KNOWLEDGE, this.userWalletAddress))
      .doc();

    await knowledgeRef.set({
      id: knowledgeRef.id,
      user_wallet_address: this.userWalletAddress,
      category: "entity",
      title: entity.names[0] || "Entity",
      content: JSON.stringify(entity),
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    console.log("[FirebaseAdapter] createEntity - success", { entityId: knowledgeRef.id });
  }

  /**
   * Update an entity
   */
  async updateEntity(entity: Entity): Promise<void> {
    const knowledgeRef = this.db
      .collection(getUserCollectionPath(COLLECTIONS.KNOWLEDGE, this.userWalletAddress))
      .where("category", "==", "entity")
      .limit(100);

    const snapshot = await knowledgeRef.get();

    // Find matching entity by name
    let existingDoc = null;
    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const parsed = JSON.parse(data.content);
        if (parsed.names?.includes(entity.names[0])) {
          existingDoc = doc;
          break;
        }
      } catch {
        const data = doc.data();
        if (data.title === entity.names[0]) {
          existingDoc = doc;
          break;
        }
      }
    }

    if (!existingDoc) {
      await this.createEntity(entity);
      return;
    }

    await existingDoc.ref.update({
      title: entity.names[0] || "Entity",
      content: JSON.stringify(entity),
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  /**
   * Get entity by ID
   */
  async getEntity(id: string): Promise<Entity | null> {
    const doc = await this.db
      .collection(getUserCollectionPath(COLLECTIONS.KNOWLEDGE, this.userWalletAddress))
      .doc(id)
      .get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (data?.category !== "entity") {
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
    const knowledgeRef = this.db
      .collection(getUserCollectionPath(COLLECTIONS.KNOWLEDGE, this.userWalletAddress))
      .doc();

    await knowledgeRef.set({
      id: knowledgeRef.id,
      user_wallet_address: this.userWalletAddress,
      category: "relationship",
      title: `Relationship: ${(rel as any).sourceEntityId || (rel as any).entityA} -> ${(rel as any).targetEntityId || (rel as any).entityB}`,
      content: JSON.stringify(rel),
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  /**
   * Get relationships for an entity
   */
  async getRelationships(entityId: string): Promise<Relationship[]> {
    const snapshot = await this.db
      .collection(getUserCollectionPath(COLLECTIONS.KNOWLEDGE, this.userWalletAddress))
      .where("category", "==", "relationship")
      .limit(100)
      .get();

    const relationships: Relationship[] = [];

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const content = JSON.parse(data.content);
        // Check if relationship involves the entity
        if (
          content.sourceEntityId === entityId ||
          content.targetEntityId === entityId ||
          content.entityA === entityId ||
          content.entityB === entityId
        ) {
          relationships.push(content);
        }
      } catch {
        // Skip invalid relationships
      }
    }

    return relationships;
  }

  /**
   * Create a fact
   */
  async createFact(fact: Fact): Promise<void> {
    const knowledgeRef = this.db
      .collection(getUserCollectionPath(COLLECTIONS.KNOWLEDGE, this.userWalletAddress))
      .doc();

    await knowledgeRef.set({
      id: knowledgeRef.id,
      user_wallet_address: this.userWalletAddress,
      category: "fact",
      title: fact.source || "Fact",
      content: JSON.stringify({
        text: fact.content,
        confidence: fact.confidence || 1.0,
        source: fact.source,
      }),
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  /**
   * Search facts by query
   */
  async searchFacts(query: string, limit: number = 10): Promise<Fact[]> {
    const snapshot = await this.db
      .collection(getUserCollectionPath(COLLECTIONS.KNOWLEDGE, this.userWalletAddress))
      .where("category", "==", "fact")
      .limit(limit)
      .get();

    const facts: Fact[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const content = data.content.toLowerCase();
      if (content.includes(query.toLowerCase())) {
        try {
          const parsed = JSON.parse(data.content);
          facts.push({
            id: doc.id,
            content: parsed.text || data.content,
            source: parsed.source || data.title,
            confidence: parsed.confidence || 1.0,
            createdAt: data.created_at?.toDate?.() || new Date(data.created_at),
          });
        } catch {
          facts.push({
            id: doc.id,
            content: data.content,
            source: data.title,
            confidence: 1.0,
            createdAt: data.created_at?.toDate?.() || new Date(data.created_at),
          });
        }
      }
    }

    return facts.slice(0, limit);
  }

  /**
   * Semantic search for memories using vector embeddings
   * Note: Firestore doesn't have native vector search, so this is a placeholder
   * For production, consider using Vertex AI Vector Search or similar
   */
  async searchMemoriesSemantic(
    queryEmbedding: number[],
    limit: number = 10,
    similarityThreshold: number = 0.7
  ): Promise<Array<Memory & { similarity: number }>> {
    // Firestore doesn't support vector search natively
    // This would require integration with Vertex AI Vector Search or similar
    console.warn("[FirebaseAdapter] Semantic search not fully implemented for Firestore");
    return [];
  }

  /**
   * Semantic search for knowledge using vector embeddings
   * Note: Firestore doesn't have native vector search, so this is a placeholder
   */
  async searchKnowledgeSemantic(
    queryEmbedding: number[],
    category?: "entity" | "fact" | "relationship",
    limit: number = 10,
    similarityThreshold: number = 0.7
  ): Promise<Array<{ id: string; category: string; title: string; content: any; similarity: number }>> {
    // Firestore doesn't support vector search natively
    console.warn("[FirebaseAdapter] Semantic search not fully implemented for Firestore");
    return [];
  }

  /**
   * Update memory with embedding vector
   */
  async updateMemoryEmbedding(memoryId: string, embedding: number[]): Promise<void> {
    // Find the message and update it
    const conversationsRef = this.db
      .collectionGroup(COLLECTIONS.MESSAGES)
      .where("user_wallet_address", "==", this.userWalletAddress)
      .where("id", "==", memoryId)
      .limit(1);

    const snapshot = await conversationsRef.get();

    if (snapshot.empty) {
      throw new Error(`Memory not found: ${memoryId}`);
    }

    await snapshot.docs[0].ref.update({
      embedding,
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  /**
   * Update knowledge with embedding vector
   */
  async updateKnowledgeEmbedding(knowledgeId: string, embedding: number[]): Promise<void> {
    const docRef = this.db
      .collection(getUserCollectionPath(COLLECTIONS.KNOWLEDGE, this.userWalletAddress))
      .doc(knowledgeId);

    await docRef.update({
      embedding,
      updated_at: FieldValue.serverTimestamp(),
    });
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
    // Firebase adapter doesn't need initialization
    // Connection is handled by getFirestoreInstance()
    return Promise.resolve();
  }

  /**
   * Close the adapter (required by elizaOS)
   */
  async close(): Promise<void> {
    // Firebase adapter doesn't need cleanup
    return Promise.resolve();
  }
}

