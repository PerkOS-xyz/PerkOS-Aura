import { NextRequest, NextResponse } from "next/server";
import { getAIService } from "@/lib/services/AIService";
import { verifyX402Payment } from "@/lib/middleware/x402";
import { sentimentAnalyzeSchema } from "@/lib/validators";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        // 1. Verify Payment (x402 v2)
        const paymentResult = await verifyX402Payment(request, "POST /api/ai/sentiment");
        if (!paymentResult.isValid) {
            return paymentResult.response!;
        }

        // 2. Parse and validate request
        const body = await request.json();
        const validatedData = sentimentAnalyzeSchema.parse(body);

        // 3. Call AI Service
        const aiService = getAIService();
        const result = await aiService.analyzeSentiment(validatedData.text);

        // 4. Return Response with x402 v2 headers
        const headers: Record<string, string> = {};
        if (paymentResult.paymentResponseHeader) {
            headers["PAYMENT-RESPONSE"] = paymentResult.paymentResponseHeader;
        }

        return NextResponse.json({
            success: true,
            data: result,
        }, { headers });
    } catch (error) {
        console.error("Sentiment analysis error:", error);

        if (error instanceof z.ZodError) {
            const validationError = ValidationError.fromZodError(error);
            return NextResponse.json(validationError.toJSON(), {
                status: validationError.statusCode
            });
        }

        return NextResponse.json(
            { error: "Sentiment analysis failed", message: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
