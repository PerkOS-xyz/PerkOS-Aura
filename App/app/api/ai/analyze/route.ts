import { NextRequest, NextResponse } from "next/server";
import { getAIService } from "@/lib/services/AIService";
import { z } from "zod";
import { verifyX402Payment } from "@/lib/middleware/x402";

export const dynamic = "force-dynamic";

// Request validation schema
const analyzeRequestSchema = z.object({
    image: z.string().min(1, "Image base64 is required"),
    question: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        // 1. Verify Payment (x402)
        const paymentResult = await verifyX402Payment(request, "POST /api/ai/analyze");
        if (!paymentResult.isValid) {
            return paymentResult.response!;
        }

        // 2. Parse Body
        const body = await request.json();
        const validatedData = analyzeRequestSchema.parse(body);

        // 3. Call AI Service
        const aiService = getAIService();
        const analysis = await aiService.analyzeImage(
            validatedData.image,
            validatedData.question
        );

        // 4. Return Response
        const responseConfig: any = {
            success: true,
            data: { analysis },
        };

        // Include payment response headers if available (v2)
        const headers: Record<string, string> = {};
        if (paymentResult.paymentResponseHeader) {
            headers["PAYMENT-RESPONSE"] = paymentResult.paymentResponseHeader;
        }

        return NextResponse.json(responseConfig, { headers });
    } catch (error) {
        console.error("AI Analysis error:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation error", details: error.errors },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Analysis failed", message: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
