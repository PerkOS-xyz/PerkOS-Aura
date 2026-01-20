/**
 * Monthly Credits Claim API
 * Allows users to claim their free monthly credits based on subscription tier
 */

import { NextRequest, NextResponse } from "next/server";
import { creditsService } from "@/lib/services/CreditsService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "walletAddress is required" },
        { status: 400 }
      );
    }

    console.log(`[Credits Claim API] Claiming monthly credits for ${walletAddress}`);

    const result = await creditsService.claimMonthlyCredits(walletAddress);

    if (!result.success) {
      console.log(`[Credits Claim API] Claim failed:`, result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          newBalance: result.newBalance,
          nextClaimDate: result.nextClaimDate.toISOString(),
        },
        { status: 400 }
      );
    }

    console.log(`[Credits Claim API] Claim successful:`, {
      creditsAdded: result.creditsAdded,
      newBalance: result.newBalance,
      nextClaimDate: result.nextClaimDate,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully claimed ${result.creditsAdded} credits`,
      creditsAdded: result.creditsAdded,
      newBalance: result.newBalance,
      nextClaimDate: result.nextClaimDate.toISOString(),
    });
  } catch (error) {
    console.error("[Credits Claim API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to claim credits",
      },
      { status: 500 }
    );
  }
}
