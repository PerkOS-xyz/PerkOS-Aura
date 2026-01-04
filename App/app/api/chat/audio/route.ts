import { NextRequest, NextResponse } from "next/server";
import { getAIService } from "@/lib/services/AIService";
import { getElizaServiceV2 } from "@/lib/services/ElizaServiceV2";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/audio
 * Transcribe audio and send to chat in one request
 * No x402 payment required for chat context (chat is free, only direct AI endpoints have payments)
 */
import { verifyX402Payment } from "@/lib/middleware/x402";

// ... existing imports ...

/**
 * POST /api/chat/audio
 * Transcribe audio and send to chat in one request
 * Requires x402 payment
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify Payment (x402)
    const paymentResult = await verifyX402Payment(request, "POST /api/chat/audio");
    if (!paymentResult.isValid) {
      return paymentResult.response!;
    }

    // Parse Form Data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const audioUrl = formData.get("audioUrl") as string | null;
    const walletAddress = formData.get("walletAddress") as string;
    const conversationId = formData.get("conversationId") as string;

    // Validate required fields
    if (!file && !audioUrl) {
      return NextResponse.json(
        { error: "Validation error", message: "Audio file or URL is required" },
        { status: 400 }
      );
    }

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Validation error", message: "Valid walletAddress is required" },
        { status: 400 }
      );
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: "Validation error", message: "conversationId is required" },
        { status: 400 }
      );
    }

    // Note: User isolation is handled by the FirebaseAdapter which stores all data
    // under the user's wallet address path. The wallet address is validated above
    // and the user proves ownership via their connected wallet.

    // 1. Transcribe the audio
    const aiService = getAIService();
    // Use audioUrl if available, otherwise file (fallback)
    const transcription = await aiService.transcribeAudio(audioUrl || file!);

    if (!transcription || transcription.trim() === "") {
      return NextResponse.json(
        { error: "Transcription failed", message: "Could not transcribe audio" },
        { status: 400 }
      );
    }

    // 2. Send transcription to chat and get AI response
    const elizaService = getElizaServiceV2(walletAddress);
    const chatResponse = await elizaService.processMessage({
      message: transcription,
      conversationId,
    });

    // 3. Return both transcription and AI response
    return NextResponse.json({
      success: true,
      transcription,
      response: chatResponse.response,
      conversationId: chatResponse.conversationId,
    });
  } catch (error) {
    console.error("Chat audio error:", error);
    return NextResponse.json(
      {
        error: "Audio chat failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
