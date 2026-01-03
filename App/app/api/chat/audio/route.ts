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
export async function POST(request: NextRequest) {
  try {
    // Parse Form Data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const walletAddress = formData.get("walletAddress") as string;
    const conversationId = formData.get("conversationId") as string;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: "Validation error", message: "Audio file is required" },
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

    // Verify conversation belongs to this user (user isolation)
    if (!conversationId.toLowerCase().includes(walletAddress.toLowerCase())) {
      return NextResponse.json(
        { error: "Authorization error", message: "Conversation does not belong to this user" },
        { status: 403 }
      );
    }

    // 1. Transcribe the audio
    const aiService = getAIService();
    const transcription = await aiService.transcribeAudio(file);

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
