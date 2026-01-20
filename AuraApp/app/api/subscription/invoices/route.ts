/**
 * User Subscription Invoices API
 * Returns user's subscription payment history (invoices)
 */

import { NextRequest, NextResponse } from "next/server";
import { creditsService, SUBSCRIPTION_TIERS } from "@/lib/services/CreditsService";

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

    console.log(`[Subscription Invoices API] Getting invoices for ${walletAddress}`);

    // Get subscription history (all past and current subscriptions)
    const subscriptions = await creditsService.getUserSubscriptionHistory(walletAddress);

    // Get active subscription
    const activeSubscription = await creditsService.getActiveSubscription(walletAddress);

    // Format invoices with additional details
    const invoices = subscriptions.map((sub) => {
      const tierInfo = SUBSCRIPTION_TIERS[sub.tier as keyof typeof SUBSCRIPTION_TIERS];
      const now = new Date();
      const isActive = sub.expiresAt > now;
      const isExpired = sub.expiresAt <= now;

      return {
        id: sub.id,
        tier: sub.tier,
        tierName: tierInfo?.name || sub.tier,
        priceUsd: sub.priceUsd,
        creditsIncluded: tierInfo?.creditsPerMonth || 0,
        discountPercent: tierInfo?.discountPercent || 0,
        transactionHash: sub.transactionHash,
        paymentNetwork: sub.paymentNetwork,
        startsAt: sub.startsAt.toISOString(),
        expiresAt: sub.expiresAt.toISOString(),
        createdAt: sub.createdAt.toISOString(),
        status: isActive ? "active" : isExpired ? "expired" : "pending",
        // Calculate period
        periodStart: sub.startsAt.toISOString(),
        periodEnd: sub.expiresAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      invoices,
      activeSubscription: activeSubscription
        ? {
            id: activeSubscription.id,
            tier: activeSubscription.tier,
            tierName:
              SUBSCRIPTION_TIERS[activeSubscription.tier as keyof typeof SUBSCRIPTION_TIERS]
                ?.name || activeSubscription.tier,
            expiresAt: activeSubscription.expiresAt.toISOString(),
          }
        : null,
      count: invoices.length,
    });
  } catch (error) {
    console.error("[Subscription Invoices API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get invoices",
      },
      { status: 500 }
    );
  }
}
