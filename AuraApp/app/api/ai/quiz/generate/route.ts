import { NextRequest, NextResponse } from "next/server";
import { getAIService } from "@/lib/services/AIService";
import { verifyX402Payment } from "@/lib/middleware/x402";
import { z } from "zod";

const schema = z.object({
    topic: z.string().min(1),
    numQuestions: z.number().min(1).max(20).optional().default(5),
    difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const paymentResult = await verifyX402Payment(request, "POST /api/ai/quiz/generate");
        if (!paymentResult.isValid) return paymentResult.response!;

        const body = await request.json();
        const data = schema.parse(body);
        const result = await getAIService().generateQuiz(data.topic, data.numQuestions, data.difficulty);

        const headers: Record<string, string> = {};
        if (paymentResult.paymentResponseHeader) headers["PAYMENT-RESPONSE"] = paymentResult.paymentResponseHeader;

        return NextResponse.json({ success: true, data: result }, { headers });
    } catch (error) {
        console.error("Quiz generation error:", error);
        return NextResponse.json({ error: "Quiz generation failed", message: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
    }
}
