/**
 * Credits Transaction History API
 * Returns user's credit transaction history
 */

import { NextRequest, NextResponse } from "next/server";
import { creditsService } from "@/lib/services/CreditsService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "walletAddress query parameter is required" },
        { status: 400 }
      );
    }

    // Validate limit
    const safeLimit = Math.min(Math.max(1, limit), 100); // Between 1 and 100

    console.log(`[Credits History API] Getting history for ${walletAddress}, limit: ${safeLimit}`);

    const transactions = await creditsService.getTransactionHistory(walletAddress, safeLimit);

    return NextResponse.json({
      success: true,
      transactions: transactions.map((tx) => ({
        id: tx.id,
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        type: tx.type,
        serviceId: tx.serviceId,
        description: tx.description,
        createdAt: tx.createdAt.toISOString(),
        metadata: tx.metadata,
      })),
      count: transactions.length,
    });
  } catch (error) {
    console.error("[Credits History API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get history",
      },
      { status: 500 }
    );
  }
}
