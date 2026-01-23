import { NextRequest, NextResponse } from "next/server";
import { getAIService } from "@/lib/services/AIService";
import { z } from "zod";
import { verifyX402Payment } from "@/lib/middleware/x402";

export const dynamic = "force-dynamic";

// Request validation schema
const synthesizeRequestSchema = z.object({
    text: z.string().min(1, "Text is required"),
    voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).optional().default("alloy"),
});

export async function POST(request: NextRequest) {
    try {
        // 1. Verify Payment (x402)
        const paymentResult = await verifyX402Payment(request, "POST /api/ai/synthesize");
        if (!paymentResult.isValid) {
            return paymentResult.response!;
        }

        // 2. Parse Body
        const body = await request.json();
        const validatedData = synthesizeRequestSchema.parse(body);

        // 3. Call AI Service
        const aiService = getAIService();
        const audioBuffer = await aiService.synthesizeSpeech(
            validatedData.text,
            validatedData.voice
        );

        // 4. Convert buffer to base64 data URL
        const base64Audio = Buffer.from(audioBuffer).toString("base64");
        const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

        // 5. Return JSON response (matching pattern of other AI endpoints)
        const headers: Record<string, string> = {};
        if (paymentResult.paymentResponseHeader) {
            headers["PAYMENT-RESPONSE"] = paymentResult.paymentResponseHeader;
        }

        return NextResponse.json({
            success: true,
            data: {
                audio: audioDataUrl,
                format: "mp3",
                text: validatedData.text,
                voice: validatedData.voice,
            },
        }, { headers });
    } catch (error) {
        console.error("AI Synthesis error:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation error", details: error.errors },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Synthesis failed", message: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
