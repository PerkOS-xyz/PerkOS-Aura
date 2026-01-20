/**
 * Admin Membership API
 * Manage users, subscriptions, and view stats
 */

import { NextRequest, NextResponse } from "next/server";
import { creditsService, SUBSCRIPTION_TIERS, SubscriptionTier } from "@/lib/services/CreditsService";

// Check if wallet is admin
function isAdmin(walletAddress: string): boolean {
  const adminWallets = process.env.ADMIN_WALLETS?.split(",").map(w => w.toLowerCase()) || [];
  return adminWallets.includes(walletAddress.toLowerCase());
}

// GET: Fetch membership stats and all users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminWallet = searchParams.get("adminWallet");
    const action = searchParams.get("action") || "stats";

    if (!adminWallet || !isAdmin(adminWallet)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    switch (action) {
      case "stats": {
        const stats = await creditsService.getSubscriptionStats();
        return NextResponse.json({
          success: true,
          stats,
          tiers: SUBSCRIPTION_TIERS,
        });
      }

      case "users": {
        const limit = parseInt(searchParams.get("limit") || "100");
        const users = await creditsService.getAllUsers(limit);
        return NextResponse.json({
          success: true,
          users: users.map(u => ({
            ...u,
            subscriptionExpiresAt: u.subscriptionExpiresAt?.toISOString(),
            lastMonthlyClaim: u.lastMonthlyClaim?.toISOString(),
            createdAt: u.createdAt?.toISOString(),
            updatedAt: u.updatedAt?.toISOString(),
          })),
          count: users.length,
        });
      }

      case "subscriptions": {
        const limit = parseInt(searchParams.get("limit") || "100");
        const subscriptions = await creditsService.getAllSubscriptions(limit);
        return NextResponse.json({
          success: true,
          subscriptions: subscriptions.map(s => ({
            ...s,
            startsAt: s.startsAt?.toISOString(),
            expiresAt: s.expiresAt?.toISOString(),
            createdAt: s.createdAt?.toISOString(),
          })),
          count: subscriptions.length,
        });
      }

      case "user-history": {
        const walletAddress = searchParams.get("walletAddress");
        if (!walletAddress) {
          return NextResponse.json(
            { success: false, error: "walletAddress is required" },
            { status: 400 }
          );
        }
        const history = await creditsService.getUserSubscriptionHistory(walletAddress);
        return NextResponse.json({
          success: true,
          subscriptions: history.map(s => ({
            ...s,
            startsAt: s.startsAt?.toISOString(),
            expiresAt: s.expiresAt?.toISOString(),
            createdAt: s.createdAt?.toISOString(),
          })),
          count: history.length,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Admin Membership API] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch data" },
      { status: 500 }
    );
  }
}

// POST: Admin actions (grant credits, set tier)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminWallet, action, walletAddress, ...params } = body;

    if (!adminWallet || !isAdmin(adminWallet)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "walletAddress is required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "grant-credits": {
        const { amount, reason } = params;
        if (!amount || typeof amount !== "number") {
          return NextResponse.json(
            { success: false, error: "amount (number) is required" },
            { status: 400 }
          );
        }
        const result = await creditsService.grantBonusCredits(
          walletAddress,
          amount,
          reason || "Admin grant"
        );
        return NextResponse.json({
          success: true,
          message: `Granted ${amount} credits to ${walletAddress}`,
          newBalance: result.newBalance,
        });
      }

      case "set-tier": {
        const { tier, expiresAt } = params;
        if (!tier || !Object.keys(SUBSCRIPTION_TIERS).includes(tier)) {
          return NextResponse.json(
            { success: false, error: `Invalid tier: ${tier}` },
            { status: 400 }
          );
        }
        const result = await creditsService.setUserTier(
          walletAddress,
          tier as SubscriptionTier,
          expiresAt ? new Date(expiresAt) : undefined
        );
        return NextResponse.json({
          success: true,
          message: `Set ${walletAddress} to ${tier} tier`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Admin Membership API] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Action failed" },
      { status: 500 }
    );
  }
}
