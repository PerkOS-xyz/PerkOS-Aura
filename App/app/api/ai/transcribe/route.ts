import { NextRequest, NextResponse } from "next/server";
import { getAIService } from "@/lib/services/AIService";
import { verifyX402Payment } from "@/lib/middleware/x402";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        // 1. Verify Payment (x402)
        const paymentResult = await verifyX402Payment(request, "POST /api/ai/transcribe");
        if (!paymentResult.isValid) {
            return paymentResult.response!;
        }

        // 2. Parse Form Data
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "Validation error", message: "File is required" },
                { status: 400 }
            );
        }

        // 3. Call AI Service
        const aiService = getAIService();
        const transcription = await aiService.transcribeAudio(file);

        // 4. Return Response
        const responseConfig: any = {
            success: true,
            data: { transcription },
        };

        const headers: Record<string, string> = {};
        if (paymentResult.paymentResponseHeader) {
            headers["PAYMENT-RESPONSE"] = paymentResult.paymentResponseHeader;
        }

        return NextResponse.json(responseConfig, { headers });
    } catch (error) {
        console.error("AI Transcription error:", error);
        return NextResponse.json(
            { error: "Transcription failed", message: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
