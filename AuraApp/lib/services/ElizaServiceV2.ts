/**
 * ElizaServiceV2
 * Full elizaOS framework integration with AgentRuntime
 * Replaces the simplified implementation with proper elizaOS integration
 *
 * Uses:
 * - elizaOS AgentRuntime for memory management and user isolation
 * - OpenRouter (via OpenAI SDK) for chat completions (bypasses elizaOS model handlers)
 *
 * Reference: https://docs.elizaos.ai/runtime/core
 */

import { MemoryType } from "@elizaos/core";
import { getAgentRuntime } from "./elizaos/AgentRuntimeManager";
import OpenAI from "openai";
import { aiServiceConfig } from "@/lib/config/x402";
import { getStorageService } from "./StorageService";

// Type definitions
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  attachmentPreview?: string;
  attachmentType?: "audio" | "image";
  transactionHash?: string;
  paymentNetwork?: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  projectId?: string;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
  projectId?: string;
}

// OpenRouter client singleton
let openrouterClient: OpenAI | null = null;

function getOpenRouterClient(): OpenAI {
  if (!openrouterClient) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is required for chat completions");
    }
    openrouterClient = new OpenAI({
      apiKey,
      baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_REFERER || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_TITLE || "PerkOS AI Service",
      },
    });
  }
  return openrouterClient;
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
    const conversationId = request.conversationId || `conv_${this.userWalletAddress}_${Date.now()}`;
    const projectId = request.projectId;

    console.log("[ElizaServiceV2] processMessage called", {
      conversationId,
      projectId,
      userWallet: this.userWalletAddress,
      messageLength: request.message?.length,
    });

    try {
      // Get user's AgentRuntime instance
      const runtime = await getAgentRuntime(this.userWalletAddress);

      // Get the adapter directly to use its createMemory with projectId support
      const adapter = (runtime as any).adapter;
      if (!adapter) {
        throw new Error("Runtime adapter not available");
      }

      // Set project context if provided
      if (projectId && adapter.setProjectId) {
        adapter.setProjectId(projectId);
      }

      // Create memory for user message
      const userMemory = {
        type: MemoryType.MESSAGE,
        content: { text: request.message },
        roomId: conversationId,
        userId: this.userWalletAddress,
        createdAt: new Date(),
      };

      // Store the memory directly via adapter (with project context support)
      console.log("[ElizaServiceV2] Storing user message memory via adapter", {
        conversationId,
        roomId: userMemory.roomId,
        userId: userMemory.userId,
        projectId,
      });
      await adapter.createMemory(userMemory, projectId);
      console.log("[ElizaServiceV2] User message memory stored successfully");

      // Generate response using OpenRouter directly (bypasses elizaOS model handlers)
      const responseText = await this.generateResponse(runtime, userMemory, conversationId, projectId);

      // Create memory for assistant response via adapter (with project context)
      console.log("[ElizaServiceV2] Storing assistant response memory via adapter", {
        conversationId,
        responseLength: responseText?.length,
        projectId,
      });
      await adapter.createMemory({
        type: MemoryType.MESSAGE,
        content: { text: responseText },
        roomId: conversationId,
        agentId: runtime.agentId,
      }, projectId);
      console.log("[ElizaServiceV2] Assistant response memory stored successfully");

      return {
        response: responseText,
        conversationId,
        projectId,
      };
    } catch (error) {
      console.error("[ElizaServiceV2] processMessage error:", error);

      // Re-throw error so chat route can fallback to V1
      throw error;
    }
  }

  /**
   * Generate response using OpenRouter directly
   * Bypasses elizaOS useModel which requires model handler registration
   */
  private async generateResponse(
    runtime: any,
    userMemory: any,
    conversationId: string,
    projectId?: string
  ): Promise<string> {
    try {
      // Validate userMemory
      if (!userMemory) {
        throw new Error("userMemory is undefined");
      }

      // Extract user message safely
      const userMessage =
        typeof userMemory.content === "string"
          ? userMemory.content
          : userMemory.content?.text || "";

      if (!userMessage) {
        throw new Error("User message is empty");
      }

      // Get conversation history for context
      const conversationMemories = await runtime.getMemories({
        roomId: conversationId,
        limit: 10,
      });

      // Build system prompt with project context
      const payTo = process.env.NEXT_PUBLIC_PAY_TO_ADDRESS || "";
      const facilitator = process.env.NEXT_PUBLIC_FACILITATOR_URL || "https://stack.perkos.xyz";
      const network = process.env.NEXT_PUBLIC_NETWORK || "avalanche";

      // Get actual prices from config
      const prices = {
        generate: aiServiceConfig.generatePriceUsd,
        analyze: aiServiceConfig.analyzePriceUsd,
        transcribe: aiServiceConfig.transcribePriceUsd,
        synthesize: aiServiceConfig.synthesizePriceUsd,
        summarize: aiServiceConfig.summarizePriceUsd,
        translate: aiServiceConfig.translatePriceUsd,
        codeGenerate: aiServiceConfig.codeGeneratePriceUsd,
      };

      // Generate a unique timestamp for paymentId generation
      const currentTimestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const uniquePaymentId = `pay_${currentTimestamp}_${randomSuffix}`;

      let systemPrompt = `You are Aura, a helpful AI assistant for an AI service platform called PerkOS.
User wallet: ${this.userWalletAddress}
Current timestamp: ${currentTimestamp}

## Your capabilities:
You can help users with these AI services (all require x402 micropayments):
- Image Generation ($${prices.generate}): Generate images from text prompts using FLUX
- Image Analysis ($${prices.analyze}): Analyze uploaded images using GPT-4o vision
- Audio Transcription ($${prices.transcribe}): Transcribe audio files using Whisper
- Text-to-Speech ($${prices.synthesize}): Convert text to speech audio
- Text Summarization ($${prices.summarize}): Summarize long text
- Translation ($${prices.translate}): Translate text between languages
- Code Generation ($${prices.codeGenerate}): Generate code from descriptions
- And many more AI services

## CRITICAL - Payment Request Format:
When a user requests an AI service that requires payment, you MUST respond with a payment request JSON block.
The JSON MUST be wrapped in triple backticks with "json" language identifier.

**IMPORTANT: Use this exact paymentId for this request: "${uniquePaymentId}"**
Do NOT make up your own paymentId - use the one provided above.

For IMAGE GENERATION requests (when user asks to "generate", "create", "make", or "draw" an image):
Extract the image description/prompt from their message and respond with a brief message followed by the JSON:

\`\`\`json
{
  "paymentRequest": {
    "paymentId": "${uniquePaymentId}",
    "endpoint": "/api/ai/generate",
    "method": "POST",
    "price": "$${prices.generate}",
    "network": "${network}",
    "payTo": "${payTo}",
    "facilitator": "${facilitator}",
    "description": "Generate AI image with FLUX",
    "requestData": {
      "prompt": "the user's image description goes here"
    }
  }
}
\`\`\`

For TEXT-TO-SPEECH requests:
\`\`\`json
{
  "paymentRequest": {
    "paymentId": "${uniquePaymentId}",
    "endpoint": "/api/ai/synthesize",
    "method": "POST",
    "price": "$${prices.synthesize}",
    "network": "${network}",
    "payTo": "${payTo}",
    "facilitator": "${facilitator}",
    "description": "Text-to-speech synthesis",
    "requestData": {
      "text": "the text to speak",
      "voice": "alloy"
    }
  }
}
\`\`\`

For CODE GENERATION requests:
\`\`\`json
{
  "paymentRequest": {
    "paymentId": "${uniquePaymentId}",
    "endpoint": "/api/ai/code/generate",
    "method": "POST",
    "price": "$${prices.codeGenerate}",
    "network": "${network}",
    "payTo": "${payTo}",
    "facilitator": "${facilitator}",
    "description": "AI code generation",
    "requestData": {
      "description": "what code to generate",
      "language": "programming language"
    }
  }
}
\`\`\`

## Rules:
1. Use the EXACT paymentId provided above: "${uniquePaymentId}" - this is generated uniquely for each request
2. ALWAYS include the JSON code block with paymentRequest when user requests a paid service
3. Keep your message brief - just explain what will be created and the cost, then show the JSON
4. The JSON block triggers a payment button in the UI - users click it to pay
5. For general questions or conversation, respond normally without payment requests`;

      // Add project context if available
      if (projectId) {
        systemPrompt += `\n\nYou are currently working within a specific project context. Remember details from this conversation and previous conversations in this project to provide continuity and relevant assistance. Reference previous discussions when helpful.`;
      }

      // Build messages array with history
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        {
          role: "system",
          content: systemPrompt,
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
            const content =
              typeof mem.content === "string" ? mem.content : mem.content?.text || "";
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

      // Use OpenRouter directly instead of elizaOS useModel
      const client = getOpenRouterClient();
      const response = await client.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 1000, // Increased to accommodate payment request JSON responses
      });

      // Extract response text
      const responseText = response.choices[0]?.message?.content;

      if (typeof responseText === "string" && responseText.trim()) {
        return responseText;
      }

      return "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("Failed to generate response:", error);
      throw error;
    }
  }

  /**
   * Get conversation history using elizaOS memory system
   */
  async getConversationHistory(conversationId: string): Promise<ChatMessage[]> {
    try {
      console.log("[ElizaServiceV2] getConversationHistory called", {
        conversationId,
        userWallet: this.userWalletAddress,
      });

      const runtime = await getAgentRuntime(this.userWalletAddress);

      // Get the adapter directly to use its getMemories method
      const adapter = (runtime as any).adapter;
      if (!adapter) {
        console.warn("[ElizaServiceV2] Runtime adapter not available");
        return [];
      }

      // Use adapter's getMemories with roomId filter
      const memories = await adapter.getMemories({
        roomId: conversationId,
        limit: 100,
      });

      console.log("[ElizaServiceV2] Retrieved memories from adapter", {
        conversationId,
        memoryCount: memories?.length || 0,
        firstMemory: memories?.[0], // Log first for debugging
      });

      if (!memories || !Array.isArray(memories)) {
        console.warn("[ElizaServiceV2] No memories returned or invalid format");
        return [];
      }

      const chatMessages = memories
        .map((m: any) => {
          const contentObj = typeof m.content === "object" ? m.content : { text: m.content };
          const message: ChatMessage = {
            role: (m.userId ? "user" : "assistant") as "user" | "assistant",
            content: contentObj?.text || "",
            timestamp: m.createdAt
              ? typeof m.createdAt === "number"
                ? new Date(m.createdAt).toISOString()
                : new Date(m.createdAt).toISOString()
              : new Date().toISOString(),
          };

          // Include attachment data if present
          if (contentObj?.attachmentUrl) {
            message.attachmentPreview = contentObj.attachmentUrl;
            message.attachmentType = contentObj.attachmentType || "image";
          }

          // Include transaction data if present (for paid services)
          if (contentObj?.transactionHash) {
            message.transactionHash = contentObj.transactionHash;
          }
          if (contentObj?.paymentNetwork) {
            message.paymentNetwork = contentObj.paymentNetwork;
          }

          return message;
        })
        .filter((m) => m.content) // Filter out empty messages
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      console.log("[ElizaServiceV2] Returning chat messages", {
        conversationId,
        messageCount: chatMessages.length,
      });

      return chatMessages;
    } catch (error) {
      console.error("[ElizaServiceV2] Failed to get conversation history:", error);
      return [];
    }
  }

  /**
   * Store an assistant message directly (for generated content after payment)
   * This allows storing images/audio results without triggering a new AI response
   *
   * If attachment data is a temporary URL (e.g., from Replicate) or base64,
   * it will be uploaded to Firebase Storage and the permanent URL will be stored.
   */
  async storeAssistantMessage(request: {
    message: string;
    conversationId?: string;
    projectId?: string;
    attachment?: {
      type: "image" | "audio";
      data: string; // base64 data URL or external URL
    };
    transactionHash?: string;
    paymentNetwork?: string;
  }): Promise<void> {
    const conversationId = request.conversationId || `conv_${this.userWalletAddress}_${Date.now()}`;
    const projectId = request.projectId;

    console.log("[ElizaServiceV2] storeAssistantMessage called", {
      conversationId,
      projectId,
      userWallet: this.userWalletAddress,
      hasAttachment: !!request.attachment,
      attachmentType: request.attachment?.type,
      transactionHash: request.transactionHash,
      paymentNetwork: request.paymentNetwork,
    });

    try {
      const runtime = await getAgentRuntime(this.userWalletAddress);
      const adapter = (runtime as any).adapter;

      if (!adapter) {
        throw new Error("Runtime adapter not available");
      }

      // Build content object with optional attachment
      const content: any = {
        text: request.message,
      };

      // Process attachment: upload to Firebase Storage if needed
      if (request.attachment) {
        const storageService = getStorageService();
        let permanentUrl = request.attachment.data;

        // Check if we need to upload to Firebase Storage
        // Skip if it's already a Firebase Storage URL
        if (!storageService.isFirebaseStorageUrl(request.attachment.data)) {
          console.log("[ElizaServiceV2] Uploading attachment to Firebase Storage", {
            type: request.attachment.type,
            isBase64: request.attachment.data.startsWith("data:"),
            isUrl: request.attachment.data.startsWith("http"),
          });

          try {
            const uploadResult = await storageService.upload(request.attachment.data, {
              walletAddress: this.userWalletAddress,
              conversationId,
              type: request.attachment.type,
            });

            permanentUrl = uploadResult.url;
            console.log("[ElizaServiceV2] Attachment uploaded to Firebase Storage", {
              permanentUrl: permanentUrl.substring(0, 80) + "...",
              path: uploadResult.path,
            });
          } catch (uploadError) {
            console.error("[ElizaServiceV2] Failed to upload attachment to Firebase Storage:", uploadError);
            // Fall back to storing the original URL/data
            // This means temporary URLs may expire, but at least we don't lose the message
            console.warn("[ElizaServiceV2] Falling back to original attachment data");
          }
        }

        content.attachmentUrl = permanentUrl;
        content.attachmentType = request.attachment.type;
      }

      // Add transaction data if present (for paid services)
      if (request.transactionHash) {
        content.transactionHash = request.transactionHash;
      }
      if (request.paymentNetwork) {
        content.paymentNetwork = request.paymentNetwork;
      }

      // Create assistant memory
      const assistantMemory = {
        id: `${conversationId}_assistant_${Date.now()}`,
        userId: undefined, // No userId = assistant message
        agentId: `agent_${this.userWalletAddress}`,
        roomId: conversationId,
        content,
        type: MemoryType.MESSAGE,
        createdAt: Date.now(),
      };

      console.log("[ElizaServiceV2] Storing assistant message via adapter", {
        conversationId,
        hasAttachment: !!request.attachment,
        attachmentType: request.attachment?.type,
      });

      // Store via adapter
      await adapter.createMemory(assistantMemory, projectId);

      console.log("[ElizaServiceV2] Assistant message stored successfully");
    } catch (error) {
      console.error("[ElizaServiceV2] Failed to store assistant message:", error);
      throw error;
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
