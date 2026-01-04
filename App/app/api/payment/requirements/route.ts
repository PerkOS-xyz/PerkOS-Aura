/**
 * GET /api/payment/requirements
 * Get payment requirements for a specific endpoint (x402 v2 compliant)
 * Per spec: https://github.com/coinbase/x402/tree/v2-development
 */

import { NextRequest, NextResponse } from "next/server";
import { paymentRoutes, x402Config } from "@/lib/config/x402";
import { toCAIP2Network, parsePriceToUSDC, getUSDCAddress } from "@/lib/utils/x402-payment";
import { detectTokenInfo } from "@/lib/utils/token-detection";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");
    const method = searchParams.get("method") || "POST";

    if (!endpoint) {
      return NextResponse.json(
        { error: "endpoint parameter is required" },
        { status: 400 }
      );
    }

    const route = `${method} ${endpoint}`;

    // Get route config from paymentRoutes
    const routePrice = paymentRoutes[endpoint as keyof typeof paymentRoutes];
    if (!routePrice) {
      return NextResponse.json(
        {
          x402Version: 2,
          accepts: [],
          error: "Payment not required for this endpoint",
        },
        { status: 200 }
      );
    }

    // Create route config object
    const routeConfig = {
      price: `$${routePrice}`,
      network: x402Config.network,
      description: `Payment for ${endpoint}`,
    };

    // Parse price to atomic units
    const priceAmount = parsePriceToUSDC(routeConfig.price);
    const usdcAddress = getUSDCAddress(routeConfig.network);

    // Detect token info to pass to client (so it knows the token name for EIP-712 domain)
    const tokenInfo = await detectTokenInfo(usdcAddress, routeConfig.network);
    const tokenName = tokenInfo?.name || "USD Coin";
    const tokenVersion = "2"; // Standard version for EIP-3009 tokens

    // Return x402 v2 compliant payment requirements
    return NextResponse.json({
      x402Version: 2,
      accepts: [
        {
          scheme: "exact",
          network: toCAIP2Network(routeConfig.network),
          maxAmountRequired: priceAmount.toString(),
          resource: endpoint,
          description: routeConfig.description,
          mimeType: "application/json",
          payTo: x402Config.payTo,
          maxTimeoutSeconds: 30,
          asset: usdcAddress,
          extra: {
            // Token name and version for EIP-712 domain construction
            // Client and facilitator use this to sign/verify correctly
            name: tokenName,
            version: tokenVersion,
          },
        },
      ],
    });
  } catch (error) {
    console.error("Payment requirements error:", error);
    return NextResponse.json(
      {
        x402Version: 2,
        accepts: [],
        error: error instanceof Error ? error.message : "Failed to get payment requirements",
      },
      { status: 500 }
    );
  }
}

