/**
 * GET /api/admin/transactions
 * Get all x402 transactions with filters and export options
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { x402Config } from "@/lib/config/x402";

export const dynamic = "force-dynamic";

const transactionsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  network: z.string().optional(),
  status: z.enum(["success", "failed", "pending"]).optional(),
  search: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
  export: z.enum(["csv", "json"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // TODO: Add admin authentication check here

    const { searchParams } = new URL(request.url);
    const params = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      network: searchParams.get("network") || undefined,
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      export: searchParams.get("export") || undefined,
    };

    const validatedParams = transactionsQuerySchema.parse(params);

    // Query PerkOS-Stack facilitator for transactions
    const facilitatorUrl = x402Config.facilitatorUrl;
    const queryParams = new URLSearchParams();

    if (validatedParams.startDate) queryParams.append("startDate", validatedParams.startDate);
    if (validatedParams.endDate) queryParams.append("endDate", validatedParams.endDate);
    if (validatedParams.network) queryParams.append("network", validatedParams.network);
    if (validatedParams.status) queryParams.append("status", validatedParams.status);
    if (validatedParams.search) queryParams.append("search", validatedParams.search);
    if (validatedParams.limit) queryParams.append("limit", validatedParams.limit);
    if (validatedParams.offset) queryParams.append("offset", validatedParams.offset);

    let transactions: any[] = [];
    let totalCount = 0;

    try {
      // Try to fetch from facilitator
      const response = await fetch(`${facilitatorUrl}/api/x402/transactions?${queryParams.toString()}`);

      if (response.ok) {
        const data = await response.json();
        transactions = data.transactions || [];
        totalCount = data.totalCount || transactions.length;
      } else {
        // Fallback: return empty array if facilitator doesn't have this endpoint
        console.warn("Facilitator doesn't support transaction query endpoint");
      }
    } catch (error) {
      console.error("Failed to fetch transactions from facilitator:", error);
      // Continue with empty array
    }

    // Handle export
    if (validatedParams.export === "csv") {
      return exportToCSV(transactions);
    } else if (validatedParams.export === "json") {
      return exportToJSON(transactions);
    }

    return NextResponse.json({
      success: true,
      transactions,
      totalCount,
      filters: validatedParams,
    });
  } catch (error) {
    console.error("Get transactions error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to get transactions",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Export transactions to CSV
 */
function exportToCSV(transactions: any[]): NextResponse {
  const headers = [
    "Transaction Hash",
    "Network",
    "Payer Address",
    "Recipient Address",
    "Amount (USD)",
    "Asset",
    "Status",
    "Endpoint",
    "Created At",
  ];

  const rows = transactions.map((tx) => [
    tx.transaction_hash || tx.hash || "",
    tx.network || "",
    tx.payer_address || tx.payer || "",
    tx.recipient_address || tx.recipient || "",
    tx.amount_usd || tx.amount || "0",
    tx.asset_symbol || tx.asset || "",
    tx.status || "",
    tx.endpoint_path || tx.endpoint || "",
    tx.created_at || tx.timestamp || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="transactions-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

/**
 * Export transactions to JSON
 */
function exportToJSON(transactions: any[]): NextResponse {
  return NextResponse.json(transactions, {
    headers: {
      "Content-Disposition": `attachment; filename="transactions-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}

