import { NextRequest, NextResponse } from "next/server";
import { aiActions } from "@/lib/services/elizaos/actions";
import { getElizaServiceV2 } from "@/lib/services/ElizaServiceV2";
import { chatRequestSchema } from "@/lib/validators";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = chatRequestSchema.parse(body);

    // Use elizaOS V2 (full framework)
    const elizaServiceV2 = getElizaServiceV2(validatedData.walletAddress);
    const response = await elizaServiceV2.processMessage({
      message: validatedData.message,
      conversationId: validatedData.conversationId || undefined,
    });

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error("Chat error:", error);

    if (error instanceof z.ZodError) {
      const validationError = ValidationError.fromZodError(error);
      return NextResponse.json(validationError.toJSON(), {
        status: validationError.statusCode
      });
    }

    // Return user-friendly error messages
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Check for specific OpenAI errors
    if (errorMessage.includes("API key")) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.",
          message: errorMessage,
        },
        { status: 500 }
      );
    }

    if (errorMessage.includes("rate limit")) {
      return NextResponse.json(
        {
          success: false,
          error: "AI service is currently busy. Please try again in a moment.",
          message: errorMessage,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Chat processing failed",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat
 * Get conversation history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");
    const conversationId = searchParams.get("conversationId");

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: "walletAddress is required and must be a valid address",
        },
        { status: 400 }
      );
    }

    if (!conversationId) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: "conversationId is required",
        },
        { status: 400 }
      );
    }

    // Use elizaOS V2
    const elizaServiceV2 = getElizaServiceV2(walletAddress);
    const history = await elizaServiceV2.getConversationHistory(conversationId);

    return NextResponse.json({
      success: true,
      conversationId,
      messages: history,
    });
  } catch (error) {
    console.error("Get conversation history error:", error);

    return NextResponse.json(
      {
        error: "Failed to get conversation history",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

