import { NextRequest, NextResponse } from "next/server";
import { getAIService } from "@/lib/services/AIService";
import { verifyX402Payment } from "@/lib/middleware/x402";
import { z } from "zod";

const schema = z.object({
    content: z.string().min(1),
    keywords: z.array(z.string()),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const paymentResult = await verifyX402Payment(request, "POST /api/ai/seo/optimize");
        if (!paymentResult.isValid) return paymentResult.response!;

        const body = await request.json();
        const data = schema.parse(body);
        const result = await getAIService().optimizeSEO(data.content, data.keywords);

        const headers: Record<string, string> = {};
        if (paymentResult.paymentResponseHeader) headers["PAYMENT-RESPONSE"] = paymentResult.paymentResponseHeader;

        return NextResponse.json({ success: true, data: result }, { headers });
    } catch (error) {
        console.error("SEO optimization error:", error);
        return NextResponse.json({ error: "SEO optimization failed", message: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
    }
}
