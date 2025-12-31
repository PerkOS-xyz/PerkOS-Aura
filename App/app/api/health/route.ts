/**
 * GET /api/health
 * Health check endpoint
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check environment variables
    const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasFacilitator = !!process.env.NEXT_PUBLIC_FACILITATOR_URL;
    const hasPayTo = !!process.env.NEXT_PUBLIC_PAY_TO_ADDRESS;
    const hasThirdweb = !!process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

    return NextResponse.json({
      status: "healthy",
      service: "PerkOS AI Vendor Service",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        hasSupabase,
        hasFacilitator,
        hasPayTo,
        hasThirdweb,
      },
      configuration: {
        facilitatorUrl: process.env.NEXT_PUBLIC_FACILITATOR_URL || "not set",
        network: process.env.NEXT_PUBLIC_NETWORK || "not set",
        serviceUrl: process.env.NEXT_PUBLIC_SERVICE_URL || "not set",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

