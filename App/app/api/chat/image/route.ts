import { NextRequest, NextResponse } from "next/server";
import { getAIService } from "@/lib/services/AIService";
import { getElizaServiceV2 } from "@/lib/services/ElizaServiceV2";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Request validation schema
const imageRequestSchema = z.object({
  image: z.string().min(1, "Image base64 is required"),
  message: z.string().optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Valid wallet address required"),
  conversationId: z.string().min(1, "conversationId is required"),
});

/**
 * POST /api/chat/image
 * Analyze image and send to chat with optional message
 * No x402 payment required for chat context (chat is free, only direct AI endpoints have payments)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = imageRequestSchema.parse(body);

    const { image, message, walletAddress, conversationId } = validatedData;

    // Verify conversation belongs to this user (user isolation)
    if (!conversationId.toLowerCase().includes(walletAddress.toLowerCase())) {
      return NextResponse.json(
        { error: "Authorization error", message: "Conversation does not belong to this user" },
        { status: 403 }
      );
    }

    // 1. Analyze the image
    const aiService = getAIService();
    const question = message || "Please describe and analyze this image in detail.";
    const analysis = await aiService.analyzeImage(image, question);

    if (!analysis || analysis.trim() === "") {
      return NextResponse.json(
        { error: "Analysis failed", message: "Could not analyze image" },
        { status: 400 }
      );
    }

    // 2. Build the message to send to chat
    // Include user's message if provided, along with the fact that an image was analyzed
    const chatMessage = message
      ? `[User shared an image with message: "${message}"]\n\nImage analysis: ${analysis}`
      : `[User shared an image]\n\nImage analysis: ${analysis}`;

    // 3. Send to chat and get AI response
    const elizaService = getElizaServiceV2(walletAddress);
    const chatResponse = await elizaService.processMessage({
      message: chatMessage,
      conversationId,
    });

    // 4. Return both analysis and AI response
    return NextResponse.json({
      success: true,
      analysis,
      response: chatResponse.response,
      conversationId: chatResponse.conversationId,
    });
  } catch (error) {
    console.error("Chat image error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Image chat failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
