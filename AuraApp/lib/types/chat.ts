/**
 * Chat and ElizaOS type definitions
 */

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

export interface ChatRequest {
    message: string;
    conversationId?: string;
    walletAddress?: string;
    paymentId?: string;
}

export interface ChatResponse {
    response: string;
    conversationId: string;
    success?: boolean;
}

export interface ConversationHistory {
    conversationId: string;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
}
