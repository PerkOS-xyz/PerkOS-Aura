/**
 * Credits Deduction API
 * Deducts credits from user's balance (for x402 service interactions)
 */

import { NextRequest, NextResponse } from "next/server";
import { creditsService } from "@/lib/services/CreditsService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, description } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "walletAddress is required" },
        { status: 400 }
      );
    }

    console.log(`[Credits Deduct API] Deducting credit for ${walletAddress}: ${description || "No description"}`);

    // First check if user has credits
    const creditCheck = await creditsService.hasCredits(walletAddress);

    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient credits",
          code: "INSUFFICIENT_CREDITS",
          balance: creditCheck.balance,
        },
        { status: 402 }
      );
    }

    // Deduct the credit
    const result = await creditsService.deductCredit(walletAddress, description || "Service interaction");

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    console.log(`[Credits Deduct API] Credit deducted. New balance: ${result.newBalance}`);

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      deducted: 1,
    });
  } catch (error) {
    console.error("[Credits Deduct API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to deduct credits",
      },
      { status: 500 }
    );
  }
}
