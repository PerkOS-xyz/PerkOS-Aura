import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/check
 * Check if a wallet address is an admin
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        {
          isAdmin: false,
          error: "Invalid wallet address",
        },
        { status: 400 }
      );
    }

    // Get admin wallets from environment variable
    // Format: "0x123...,0x456..." (comma-separated)
    const adminWallets = (process.env.ADMIN_WALLETS || "")
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);

    const isAdmin = adminWallets.length > 0
      ? adminWallets.includes(walletAddress.toLowerCase())
      : true; // If no admin wallets configured, allow all (dev mode)

    console.log(`Admin check: ${walletAddress} -> ${isAdmin}`, { adminWallets });

    return NextResponse.json({
      isAdmin,
    });
  } catch (error) {
    console.error("Admin check error:", error);

    return NextResponse.json(
      {
        isAdmin: false,
        error: error instanceof Error ? error.message : "Failed to check admin status",
      },
      { status: 500 }
    );
  }
}
