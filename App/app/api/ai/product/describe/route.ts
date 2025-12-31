import { NextRequest, NextResponse } from "next/server";
import { getAIService } from "@/lib/services/AIService";
import { verifyX402Payment } from "@/lib/middleware/x402";
import { z } from "zod";

const schema = z.object({
    productName: z.string().min(1),
    features: z.array(z.string()),
    targetAudience: z.string().optional(),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const paymentResult = await verifyX402Payment(request, "POST /api/ai/product/describe");
        if (!paymentResult.isValid) return paymentResult.response!;

        const body = await request.json();
        const data = schema.parse(body);
        const result = await getAIService().generateProductDescription(data.productName, data.features, data.targetAudience);

        const headers: Record<string, string> = {};
        if (paymentResult.paymentResponseHeader) headers["PAYMENT-RESPONSE"] = paymentResult.paymentResponseHeader;

        return NextResponse.json({ success: true, data: { description: result } }, { headers });
    } catch (error) {
        console.error("Product description error:", error);
        return NextResponse.json({ error: "Product description failed", message: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
    }
}
