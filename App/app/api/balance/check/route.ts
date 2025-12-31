/**
 * GET /api/balance/check
 * Check USDC balance for a wallet address (requires x402 payment)
 * 
 * NOTE: This is a utility endpoint inherited from Token Service.
 * Useful for checking if users have sufficient USDC for payments.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkUSDCBalance } from "@/lib/utils/balance-checker";
import { x402Config } from "@/lib/config/x402";
import { verifyX402Payment } from "@/lib/middleware/x402";
import { z } from "zod";

export const dynamic = "force-dynamic";

const checkBalanceSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  network: z.string().optional(),
});

export async function GET(request: NextRequest) {
  // Verify x402 payment
  const paymentResult = await verifyX402Payment(request, "GET /api/balance/check");
  if (!paymentResult.isValid) {
    return paymentResult.response!;
  }

  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");
    const network = searchParams.get("network") || x402Config.network;

    const validated = checkBalanceSchema.parse({
      walletAddress,
      network,
    });

    const result = await checkUSDCBalance(
      validated.walletAddress as `0x${string}`,
      validated.network || x402Config.network
    );

    // V2: Add PAYMENT-RESPONSE header if payment was successful
    const headers: HeadersInit = {};
    if (paymentResult.paymentResponseHeader) {
      headers["PAYMENT-RESPONSE"] = paymentResult.paymentResponseHeader;
    }

    // Convert BigInt to string for JSON serialization
    return NextResponse.json(
      {
        success: true,
        walletAddress: validated.walletAddress,
        network: validated.network || x402Config.network,
        balance: result.balance,
        balanceRaw: result.balanceRaw.toString(), // Convert BigInt to string
        hasEnough: result.hasEnough,
        required: result.required,
      },
      { headers }
    );
  } catch (error) {
    console.error("Balance check error:", error);

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
        error: "Failed to check balance",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

