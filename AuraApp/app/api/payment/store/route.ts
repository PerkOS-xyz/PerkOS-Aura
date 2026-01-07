/**
 * POST /api/payment/store
 * Store a signed payment envelope temporarily (for elizaOS to use)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// In-memory storage for payment envelopes (expires after 5 minutes)
const paymentStore = new Map<
  string,
  { envelope: any; timestamp: number; endpoint: string }
>();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of paymentStore.entries()) {
    if (now - value.timestamp > 5 * 60 * 1000) {
      // 5 minutes
      paymentStore.delete(key);
    }
  }
}, 60 * 1000);

const storePaymentSchema = z.object({
  paymentId: z.string(),
  envelope: z.object({
    network: z.string(),
    authorization: z.object({
      from: z.string(),
      to: z.string(),
      value: z.string(),
      nonce: z.string(),
      validAfter: z.string(),
      validBefore: z.string(),
    }),
    signature: z.string(),
  }),
  endpoint: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = storePaymentSchema.parse(body);

    // Store payment envelope
    paymentStore.set(validated.paymentId, {
      envelope: validated.envelope,
      timestamp: Date.now(),
      endpoint: validated.endpoint,
    });

    return NextResponse.json({
      success: true,
      paymentId: validated.paymentId,
      message: "Payment envelope stored",
    });
  } catch (error) {
    console.error("Store payment error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to store payment envelope",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payment/store?paymentId=...
 * Retrieve a stored payment envelope
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");

    if (!paymentId) {
      return NextResponse.json(
        { error: "paymentId parameter is required" },
        { status: 400 }
      );
    }

    const stored = paymentStore.get(paymentId);

    if (!stored) {
      return NextResponse.json(
        { error: "Payment envelope not found or expired" },
        { status: 404 }
      );
    }

    // Check if expired
    if (Date.now() - stored.timestamp > 5 * 60 * 1000) {
      paymentStore.delete(paymentId);
      return NextResponse.json(
        { error: "Payment envelope expired" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      envelope: stored.envelope,
      endpoint: stored.endpoint,
    });
  } catch (error) {
    console.error("Get payment error:", error);
    return NextResponse.json(
      {
        error: "Failed to get payment envelope",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

