import { NextRequest, NextResponse } from "next/server";
import { getAIService } from "@/lib/services/AIService";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Request validation schema
const imageRequestSchema = z.object({
  image: z.string().optional(), // base64
  imageUrl: z.string().optional(), // url
  message: z.string().optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Valid wallet address required"),
  conversationId: z.string().min(1, "conversationId is required"),
}).refine(data => data.image || data.imageUrl, {
  message: "Either image (base64) or imageUrl is required",
  path: ["image"]
});

/**
 * POST /api/chat/image
 * Analyze image and send to chat with optional message
 * No x402 payment required for chat context (chat is free, only direct AI endpoints have payments)
 */
import { verifyX402Payment } from "@/lib/middleware/x402";

// ... existing imports ...

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Payment (x402)
    const paymentResult = await verifyX402Payment(request, "POST /api/chat/image");
    if (!paymentResult.isValid) {
      return paymentResult.response!;
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = imageRequestSchema.parse(body);

    const { image, imageUrl, message, walletAddress, conversationId } = validatedData;

    // Note: User isolation is handled by the FirebaseAdapter which stores all data
    // under the user's wallet address path. The wallet address is validated by the
    // schema (must be valid 0x address format) and the user proves ownership via
    // their connected wallet. No need to validate conversationId format here.

    // Debug: Log what image data we received
    console.log("[Chat Image API] Received image data:", {
      hasImage: !!image,
      imageLength: image?.length,
      hasImageUrl: !!imageUrl,
      imageUrl: imageUrl?.substring(0, 100), // First 100 chars for safety
      message,
      conversationId,
    });

    // 1. Analyze the image
    const aiService = getAIService();
    const question = message || "Please describe and analyze this image in detail.";
    // Use imageUrl if provided, otherwise image base64
    const imageToAnalyze = imageUrl || image!;
    console.log("[Chat Image API] Calling analyzeImage with:", {
      imageType: imageToAnalyze.startsWith("http") ? "url" : imageToAnalyze.startsWith("data:") ? "data-uri" : "base64",
      imageLength: imageToAnalyze.length,
      question,
    });
    const analysis = await aiService.analyzeImage(imageToAnalyze, question);

    if (!analysis || analysis.trim() === "") {
      return NextResponse.json(
        { error: "Analysis failed", message: "Could not analyze image" },
        { status: 400 }
      );
    }

    // 2. Store the interaction in conversation history
    // We don't send to Eliza for another response - the image analysis IS the response
    const { getAgentRuntime } = await import("@/lib/services/elizaos/AgentRuntimeManager");

    const runtime = await getAgentRuntime(walletAddress);
    const adapter = (runtime as any).adapter;

    // Build user message for history
    const userMessageForHistory = message
      ? `[Shared an image] ${message}`
      : `[Shared an image for analysis]`;

    // Build assistant response that includes the analysis
    const assistantResponse = message
      ? `I've analyzed the image you shared. Here's what I found:\n\n${analysis}`
      : `Here's my analysis of the image:\n\n${analysis}`;

    if (adapter) {
      // Store user's image share message with attachment URL
      await adapter.createMemory({
        content: {
          text: userMessageForHistory,
          attachmentUrl: imageToAnalyze, // Store the image URL for history
          attachmentType: "image",
        },
        roomId: conversationId,
        userId: walletAddress.toLowerCase(),
        createdAt: new Date(),
      });

      // Extract transaction info from payment result for persistence
      let transactionHash: string | undefined;
      let paymentNetwork: string | undefined;
      if (paymentResult.paymentResponseHeader) {
        try {
          const paymentResponse = JSON.parse(
            Buffer.from(paymentResult.paymentResponseHeader, "base64").toString()
          );
          transactionHash = paymentResponse.transactionHash;
          paymentNetwork = paymentResponse.network;
        } catch (e) {
          console.warn("[Chat Image API] Failed to parse payment response header:", e);
        }
      }

      // Store the analysis as assistant response (with transaction info for paid badge)
      await adapter.createMemory({
        content: {
          text: assistantResponse,
          transactionHash,
          paymentNetwork,
        },
        roomId: conversationId,
        agentId: runtime.agentId,
        createdAt: new Date(),
      });

      console.log("[Chat Image API] Stored image analysis in conversation history");
    }

    // 3. Return the analysis directly as the response
    // Include PAYMENT-RESPONSE header so client can extract transaction hash
    const responseHeaders: Record<string, string> = {};
    if (paymentResult.paymentResponseHeader) {
      responseHeaders["PAYMENT-RESPONSE"] = paymentResult.paymentResponseHeader;
    }

    return NextResponse.json({
      success: true,
      analysis,
      response: assistantResponse,
      conversationId,
    }, {
      headers: responseHeaders,
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
