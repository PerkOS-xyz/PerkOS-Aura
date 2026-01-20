import { NextRequest, NextResponse } from "next/server";
import { aiActions } from "@/lib/services/elizaos/actions";
import { getElizaServiceV2 } from "@/lib/services/ElizaServiceV2";
import { chatRequestSchema } from "@/lib/validators";
import { ValidationError } from "@/lib/errors";
import { creditsService } from "@/lib/services/CreditsService";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = chatRequestSchema.parse(body);

    // Use elizaOS V2 (full framework)
    const elizaServiceV2 = getElizaServiceV2(validatedData.walletAddress);

    // Handle storeOnly mode - just store the message without generating a response
    // storeOnly doesn't consume credits as it's just saving a message
    if (validatedData.storeOnly && validatedData.role === "assistant") {
      console.log("[Chat API] storeOnly mode - storing assistant message", {
        conversationId: validatedData.conversationId,
        hasAttachment: !!validatedData.attachment,
        attachmentType: validatedData.attachment?.type,
        transactionHash: validatedData.transactionHash,
        paymentNetwork: validatedData.paymentNetwork,
      });

      await elizaServiceV2.storeAssistantMessage({
        message: validatedData.message,
        conversationId: validatedData.conversationId || undefined,
        projectId: validatedData.projectId || undefined,
        attachment: validatedData.attachment || undefined,
        transactionHash: validatedData.transactionHash,
        paymentNetwork: validatedData.paymentNetwork,
      });

      return NextResponse.json({
        success: true,
        stored: true,
        conversationId: validatedData.conversationId,
      });
    }

    // Normal mode - process message and generate response
    // Check if user has credits before processing
    console.log(`[Chat API] Checking credits for ${validatedData.walletAddress}`);
    const creditCheck = await creditsService.hasCredits(validatedData.walletAddress);

    if (!creditCheck.hasCredits) {
      console.log(`[Chat API] Insufficient credits: balance=${creditCheck.balance}, cost=${creditCheck.cost}`);
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient credits",
          message: `You need ${creditCheck.cost} credit(s) to send a message. Current balance: ${creditCheck.balance}`,
          code: "INSUFFICIENT_CREDITS",
          balance: creditCheck.balance,
          cost: creditCheck.cost,
        },
        { status: 402 }
      );
    }

    // Process the message
    const response = await elizaServiceV2.processMessage({
      message: validatedData.message,
      conversationId: validatedData.conversationId || undefined,
      projectId: validatedData.projectId || undefined,
    });

    // Deduct credit after successful processing
    const deductResult = await creditsService.deductCredit(
      validatedData.walletAddress,
      `Chat: ${validatedData.message.substring(0, 50)}${validatedData.message.length > 50 ? "..." : ""}`
    );

    if (!deductResult.success) {
      console.warn(`[Chat API] Failed to deduct credit: ${deductResult.error}`);
      // Don't fail the request if deduction fails after processing
      // The message was already sent
    } else {
      console.log(`[Chat API] Credit deducted. New balance: ${deductResult.newBalance}`);
    }

    return NextResponse.json({
      success: true,
      ...response,
      creditsRemaining: deductResult.newBalance,
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

