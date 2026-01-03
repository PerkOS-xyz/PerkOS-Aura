import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Validation schema
const getConversationsSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Valid wallet address required"),
  projectId: z.string().uuid().optional(),
});

/**
 * GET /api/conversations
 * Get all conversations for a user, optionally filtered by project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");
    const projectId = searchParams.get("projectId");

    const validated = getConversationsSchema.parse({
      walletAddress,
      projectId: projectId || undefined,
    });

    const { data, error } = await supabaseAdmin.rpc("aura_get_user_conversations", {
      p_user_wallet: validated.walletAddress,
      p_limit: 50,
      p_project_id: validated.projectId || null,
    });

    if (error) {
      console.error("Failed to get conversations:", error);
      return NextResponse.json(
        { error: "Failed to get conversations", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversations: data || [],
    });
  } catch (error) {
    console.error("Get conversations error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get conversations", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
