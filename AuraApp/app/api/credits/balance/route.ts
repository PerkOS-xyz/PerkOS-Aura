/**
 * Credits Balance API
 * Returns user's current credit balance, tier info, and subscription status
 */

import { NextRequest, NextResponse } from "next/server";
import { creditsService, SUBSCRIPTION_TIERS, CREDIT_COST_PER_INTERACTION } from "@/lib/services/CreditsService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "walletAddress query parameter is required" },
        { status: 400 }
      );
    }

    console.log(`[Credits Balance API] Getting balance for ${walletAddress}`);

    const balanceInfo = await creditsService.getBalance(walletAddress);

    return NextResponse.json({
      success: true,
      balance: balanceInfo.balance,
      tier: balanceInfo.tier,
      tierInfo: balanceInfo.tierInfo,
      subscriptionActive: balanceInfo.subscriptionActive,
      canClaimMonthly: balanceInfo.canClaimMonthly,
      creditCostPerInteraction: CREDIT_COST_PER_INTERACTION,
      // Include all available tiers for reference
      availableTiers: Object.entries(SUBSCRIPTION_TIERS).map(([id, info]) => ({
        id,
        ...info,
      })),
    });
  } catch (error) {
    console.error("[Credits Balance API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get balance",
      },
      { status: 500 }
    );
  }
}

// POST to check if user has enough credits for an interaction
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

    console.log(`[Credits Balance API] Checking credits for ${walletAddress}`);

    const result = await creditsService.hasCredits(walletAddress);

    return NextResponse.json({
      success: true,
      hasCredits: result.hasCredits,
      cost: result.cost,
      balance: result.balance,
      isUnlimited: result.isUnlimited,
      // If not enough credits, suggest options
      ...(!result.hasCredits && !result.isUnlimited && {
        suggestions: {
          needMore: result.cost - result.balance,
          options: [
            "Claim monthly credits if available",
            "Upgrade subscription tier",
          ],
        },
      }),
    });
  } catch (error) {
    console.error("[Credits Balance API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check credits",
      },
      { status: 500 }
    );
  }
}
