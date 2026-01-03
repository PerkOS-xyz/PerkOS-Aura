import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Validation schema
const deleteConversationSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Valid wallet address required"),
});

/**
 * DELETE /api/conversations/[conversationId]
 * Delete a conversation and all its messages
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    const validated = deleteConversationSchema.parse({ walletAddress });

    // Delete all messages for this conversation using RPC function
    let deletedCount = 0;
    let error: any = null;

    try {
      const result = await supabaseAdmin.rpc("aura_delete_conversation", {
        p_user_wallet: validated.walletAddress,
        p_conversation_id: conversationId,
      });

      if (result.error) {
        // Check if the error is because the function doesn't exist
        if (result.error.message?.includes("does not exist") || result.error.code === "42883") {
          console.warn("RPC function not found, using fallback delete method");
          // Fallback: Use direct SQL query via RPC (if available) or try direct deletion
          // For now, we'll return an error asking to run the migration
          return NextResponse.json(
            {
              error: "Delete function not available",
              message: "Please run the database migration 006_aura_delete_conversation.sql to enable conversation deletion.",
              details: "The aura_delete_conversation RPC function is not found in the database.",
            },
            { status: 503 }
          );
        }
        error = result.error;
      } else {
        deletedCount = result.data || 0;
      }
    } catch (rpcError: any) {
      // If RPC call fails completely, it might mean the function doesn't exist
      if (rpcError?.message?.includes("does not exist") || rpcError?.code === "42883") {
        return NextResponse.json(
          {
            error: "Delete function not available",
            message: "Please run the database migration 006_aura_delete_conversation.sql to enable conversation deletion.",
            details: "The aura_delete_conversation RPC function is not found in the database.",
          },
          { status: 503 }
        );
      }
      error = rpcError;
    }

    if (error) {
      console.error("Failed to delete conversation:", error);
      return NextResponse.json(
        { error: "Failed to delete conversation", message: error.message || "Unknown error" },
        { status: 500 }
      );
    }

    if (deletedCount === 0) {
      console.warn("No messages deleted for conversation:", conversationId);
      // Return error if nothing was deleted - conversation might not exist or already deleted
      return NextResponse.json(
        {
          error: "Conversation not found",
          message: "No messages were found for this conversation. It may have already been deleted or does not exist.",
        },
        { status: 404 }
      );
    }

    console.log(`Successfully deleted ${deletedCount} messages for conversation:`, conversationId);
    return NextResponse.json({
      success: true,
      message: "Conversation deleted successfully",
      deletedCount,
    });
  } catch (error) {
    console.error("Delete conversation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete conversation", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

