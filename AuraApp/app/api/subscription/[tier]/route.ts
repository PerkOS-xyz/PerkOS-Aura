/**
 * Subscription Purchase API
 * Handles x402 payment for subscription tier upgrades
 *
 * Flow:
 * 1. User selects tier (starter, pro, unlimited)
 * 2. Request comes in without payment header -> returns 402
 * 3. User signs payment envelope with wallet
 * 4. Request retries with PAYMENT-SIGNATURE header
 * 5. Payment verified and settled via facilitator
 * 6. Subscription activated via CreditsService
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyX402Payment } from "@/lib/middleware/x402";
import { creditsService, SUBSCRIPTION_TIERS, SubscriptionTier } from "@/lib/services/CreditsService";

// Valid subscription tiers (excludes free - can't subscribe to free)
const PURCHASABLE_TIERS = ["starter", "pro", "unlimited"] as const;
type PurchasableTier = typeof PURCHASABLE_TIERS[number];

function isPurchasableTier(tier: string): tier is PurchasableTier {
  return PURCHASABLE_TIERS.includes(tier as PurchasableTier);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tier: string }> }
) {
  const { tier } = await params;

  // Validate tier
  if (!isPurchasableTier(tier)) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid subscription tier: ${tier}. Valid tiers: ${PURCHASABLE_TIERS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const tierInfo = SUBSCRIPTION_TIERS[tier as SubscriptionTier];

  // Extract wallet address from request body
  let walletAddress: string;
  try {
    const body = await request.json();
    walletAddress = body.walletAddress;
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "walletAddress is required in request body" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body. Expected: { walletAddress: string }" },
      { status: 400 }
    );
  }

  console.log(`[Subscription API] Processing ${tier} subscription for ${walletAddress}`);

  // Verify x402 payment
  // Route is /api/subscription/{tier} - middleware will look up price from paymentRoutes
  const paymentResult = await verifyX402Payment(request, `POST /api/subscription/${tier}`);

  if (!paymentResult.isValid) {
    console.log(`[Subscription API] Payment required for ${tier} tier: $${tierInfo.priceUsd}`);
    return paymentResult.response!;
  }

  // Payment successful - activate subscription
  console.log(`[Subscription API] Payment verified, activating ${tier} subscription for ${walletAddress}`);

  try {
    // Extract transaction hash from payment envelope for record keeping
    const transactionHash = paymentResult.envelope?.authorization
      ? `${paymentResult.envelope.network}-${paymentResult.envelope.authorization.nonce}`
      : undefined;

    // Activate subscription
    const result = await creditsService.activateSubscription(
      walletAddress,
      tier as SubscriptionTier,
      transactionHash,
      paymentResult.envelope?.network
    );

    console.log(`[Subscription API] Subscription activated:`, {
      tier,
      walletAddress,
      creditsAdded: result.creditsAdded,
      expiresAt: result.subscription.expiresAt,
    });

    // Build response headers with payment info
    const responseHeaders: Record<string, string> = {};
    if (paymentResult.paymentResponseHeader) {
      responseHeaders["PAYMENT-RESPONSE"] = paymentResult.paymentResponseHeader;
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully subscribed to ${tierInfo.name} plan`,
        subscription: {
          tier,
          name: tierInfo.name,
          priceUsd: tierInfo.priceUsd,
          creditsPerMonth: tierInfo.creditsPerMonth,
          discountPercent: tierInfo.discountPercent,
          features: tierInfo.features,
          expiresAt: result.subscription.expiresAt.toISOString(),
        },
        creditsAdded: result.creditsAdded,
        transactionHash,
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error(`[Subscription API] Error activating subscription:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to activate subscription",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check subscription status and available tiers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tier: string }> }
) {
  const { tier } = await params;

  // If tier is "info" or "tiers", return all subscription info
  if (tier === "info" || tier === "tiers") {
    const tiers = Object.entries(SUBSCRIPTION_TIERS).map(([id, info]) => ({
      id,
      ...info,
      purchasable: id !== "free",
    }));

    return NextResponse.json({
      success: true,
      tiers,
    });
  }

  // Otherwise, return info about specific tier
  if (!isPurchasableTier(tier) && tier !== "free") {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid tier: ${tier}. Valid tiers: free, ${PURCHASABLE_TIERS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const tierInfo = SUBSCRIPTION_TIERS[tier as SubscriptionTier];

  return NextResponse.json({
    success: true,
    tier: {
      id: tier,
      ...tierInfo,
      purchasable: tier !== "free",
    },
  });
}
