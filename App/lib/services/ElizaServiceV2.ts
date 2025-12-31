/**
 * ElizaServiceV2
 * Full elizaOS framework integration with AgentRuntime
 * Replaces the simplified implementation with proper elizaOS integration
 * 
 * Reference: https://docs.elizaos.ai/runtime/core
 */

import { MemoryType } from "@elizaos/core";
import { getAgentRuntime } from "./elizaos/AgentRuntimeManager";

// Type definitions
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
}


/**
 * ElizaServiceV2 - Uses elizaOS AgentRuntime for proper agent functionality
 */
export class ElizaServiceV2 {
  private userWalletAddress: string;

  constructor(userWalletAddress: string) {
    this.userWalletAddress = userWalletAddress.toLowerCase();
  }

  /**
   * Process chat message using elizaOS AgentRuntime
   */
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const conversationId = request.conversationId || `conv_${Date.now()}`;

    try {
      // Get user's AgentRuntime instance
      const runtime = await getAgentRuntime(this.userWalletAddress);

      // Create memory for user message
      // Note: createMemory returns void, so we create the memory object manually
      const userMemory = {
        type: MemoryType.MESSAGE,
        content: { text: request.message },
        roomId: conversationId,
        userId: this.userWalletAddress,
        createdAt: new Date(),
      };

      // Store the memory
      await (runtime as any).createMemory(userMemory);

      // For now, skip full state composition & action processing to avoid
      // framework assumptions about adapter internals. We still:
      // - Store memories via AgentRuntime
      // - Use elizaOS model management (useModel) for responses.
      const responseText = await this.generateResponse(runtime, userMemory, conversationId);

      // Create memory for assistant response
      await (runtime as any).createMemory({
        type: MemoryType.MESSAGE,
        content: { text: responseText },
        roomId: conversationId,
        agentId: runtime.agentId,
      });

      return {
        response: responseText,
        conversationId,
      };
    } catch (error) {
      console.error("ElizaServiceV2 processMessage error:", error);

      // Re-throw error so chat route can fallback to V1
      throw error;
    }
  }

  /**
   * Generate response using elizaOS model management
   */
  private async generateResponse(
    runtime: any,
    userMemory: any,
    conversationId: string
  ): Promise<string> {
    try {
      // Validate userMemory
      if (!userMemory) {
        throw new Error("userMemory is undefined");
      }

      // Extract user message safely
      const userMessage = typeof userMemory.content === "string"
        ? userMemory.content
        : userMemory.content?.text || "";

      if (!userMessage) {
        throw new Error("User message is empty");
      }

      // (Balance check logic removed as it relies on legacy actions)

      // Get conversation history for context
      const conversationMemories = await runtime.getMemories({
        roomId: conversationId,
        limit: 10,
      });

      // Build messages array with history
      const messages: Array<{ role: string; content: string }> = [
        {
          role: "system",
          content: `You are a helpful AI assistant for an AI service platform.
          User wallet: ${this.userWalletAddress}
          You can help users with AI operations: analyze images, generate images, transcribe audio, and synthesize speech.
          When users request AI operations, use the available actions to generate payment requests.
          All services require x402 micropayments processed by stack.perkos.xyz.
          Be helpful, clear, and guide users through AI operations step by step.`,
        },
      ];

      // Add conversation history (last 10 messages)
      if (Array.isArray(conversationMemories)) {
        conversationMemories
          .filter((mem: any) => mem && mem.content) // Filter out undefined/null memories
          .sort((a: any, b: any) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return aTime - bTime;
          })
          .forEach((mem: any) => {
            const content = typeof mem.content === "string"
              ? mem.content
              : mem.content?.text || "";
            if (content) {
              messages.push({
                role: mem.userId ? "user" : "assistant",
                content,
              });
            }
          });
      }

      messages.push({
        role: "user",
        content: userMessage,
      });

      // Use elizaOS useModel with TEXT_LARGE model
      const response = await runtime.useModel(
        "TEXT_LARGE",
        {
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: 0.7,
          max_tokens: 500,
        }
      );

      // Extract response text
      const responseText = response?.text || response?.content || response?.message?.content || response;

      if (typeof responseText === "string") {
        return responseText;
      }

      // If response is an object, try to extract text
      if (response && typeof response === "object") {
        return JSON.stringify(response);
      }

      return "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("Failed to generate response with elizaOS:", error);
      throw error;
    }
  }

  /**
   * Get conversation history using elizaOS memory system
   */
  async getConversationHistory(conversationId: string): Promise<ChatMessage[]> {
    try {
      const runtime = await getAgentRuntime(this.userWalletAddress);

      // Search memories for this conversation
      const memories = await (runtime as any).searchMemories(conversationId, 100);

      return memories
        .filter((m: any) => m.roomId === conversationId)
        .map((m: any) => ({
          role: m.userId ? "user" : "assistant",
          content: typeof m.content === "string"
            ? m.content
            : m.content?.text || "",
          timestamp: m.createdAt?.toISOString() || new Date().toISOString(),
        }));
    } catch (error) {
      console.error("Failed to get conversation history:", error);
      return [];
    }
  }
}

/**
 * Get or create ElizaServiceV2 instance for a user
 */
const elizaServiceV2Instances = new Map<string, ElizaServiceV2>();

export function getElizaServiceV2(userWalletAddress: string): ElizaServiceV2 {
  const key = userWalletAddress.toLowerCase();
  if (!elizaServiceV2Instances.has(key)) {
    elizaServiceV2Instances.set(key, new ElizaServiceV2(key));
  }
  return elizaServiceV2Instances.get(key)!;
}

