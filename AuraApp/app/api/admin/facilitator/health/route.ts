/**
 * GET /api/admin/facilitator/health
 * Check facilitator health (server-side proxy to avoid CORS)
 */

import { NextResponse } from "next/server";
import { x402Config } from "@/lib/config/x402";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const facilitatorUrl = x402Config.facilitatorUrl;
    
    // Use the correct health endpoint for PerkOS-Stack
    const response = await fetch(`${facilitatorUrl}/api/v2/x402/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          healthy: false,
          status: response.status,
          statusText: response.statusText,
        },
        { status: 200 } // Return 200 so client can handle the response
      );
    }

    const healthData = await response.json().catch(() => ({}));

    return NextResponse.json({
      healthy: true,
      status: healthData.status || "healthy",
      data: healthData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        healthy: false,
        error: error instanceof Error ? error.message : "Failed to check health",
      },
      { status: 200 } // Return 200 so client can handle the response
    );
  }
}

