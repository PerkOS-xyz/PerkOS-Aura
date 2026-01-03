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
    const { conversationId: rawConversationId } = await params;
    // Decode the conversation ID in case it's URL encoded
    const conversationId = decodeURIComponent(rawConversationId);
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");
    
    console.log("[Delete Conversation] Raw params:", {
      rawConversationId,
      decodedConversationId: conversationId,
      walletAddress,
    });

    const validated = deleteConversationSchema.parse({ walletAddress });

    // First, check if the conversation exists using the same query that the list uses
    // This will help us see what conversation_ids actually exist
    const { data: allConversations, error: listError } = await supabaseAdmin.rpc("aura_get_user_conversations", {
      p_user_wallet: validated.walletAddress,
      p_limit: 100,
      p_project_id: null,
    });

    // Query messages using RPC to see if they actually exist
    // This helps diagnose if the conversation has messages but isn't appearing in the list
    const { data: directMessages, error: directError } = await supabaseAdmin.rpc("aura_get_conversations", {
      p_user_wallet: validated.walletAddress,
      p_conversation_id: conversationId,
      p_limit: 100, // Get all messages to check if any exist
    });

    console.log("[Delete Conversation] Direct message query via RPC:", {
      conversationId,
      messageCount: directMessages?.length || 0,
      messages: directMessages?.slice(0, 3).map((m: any) => ({
        conversation_id: m.conversation_id,
        contentPreview: m.message_content?.substring(0, 30),
        created_at: m.created_at,
      })),
      error: directError?.message,
    });

    const matchingConversation = allConversations?.find(
      (c: any) => c.conversation_id === conversationId
    );

    // If we found it in the list, try using the EXACT conversation_id from the list
    const conversationIdToUse = matchingConversation?.conversation_id || conversationId;
    
    console.log("[Delete Conversation] Using conversation_id:", {
      original: conversationId,
      fromList: matchingConversation?.conversation_id,
      using: conversationIdToUse,
      match: conversationId === conversationIdToUse,
    });

    // Also check messages directly using the conversation_id from the list
    const { data: existingMessages, error: checkError } = await supabaseAdmin.rpc("aura_get_conversations", {
      p_user_wallet: validated.walletAddress,
      p_conversation_id: conversationIdToUse,
      p_limit: 10,
    });

    // Try to query directly using RPC to get raw data
    // This helps us see if there's a format mismatch
    const { data: allMessagesForUser, error: allMessagesError } = await supabaseAdmin.rpc("aura_get_conversations", {
      p_user_wallet: validated.walletAddress,
      p_conversation_id: conversationIdToUse,
      p_limit: 100, // Get all messages to see what's there
    });

    // Check if conversation_id from list matches exactly
    const exactMatch = matchingConversation?.conversation_id === conversationId;
    const conversationIdLength = conversationId.length;
    const listConversationIdLength = matchingConversation?.conversation_id?.length || 0;
    
    // Check for character-by-character differences
    const charDiff: number[] = [];
    if (matchingConversation?.conversation_id) {
      const listId = matchingConversation.conversation_id;
      const maxLen = Math.max(conversationId.length, listId.length);
      for (let i = 0; i < maxLen; i++) {
        if (conversationId[i] !== listId[i]) {
          charDiff.push(i);
        }
      }
    }
    
    console.log("[Delete Conversation] Checking if conversation exists:", {
      conversationId,
      conversationIdToUse,
      conversationIdLength,
      conversationIdJSON: JSON.stringify(conversationId),
      conversationIdToUseJSON: JSON.stringify(conversationIdToUse),
      walletAddress: validated.walletAddress,
      walletLowercase: validated.walletAddress.toLowerCase(),
      existingCount: existingMessages?.length || 0,
      foundInList: !!matchingConversation,
      matchingConversationId: matchingConversation?.conversation_id,
      matchingConversationIdLength: listConversationIdLength,
      matchingConversationIdJSON: matchingConversation?.conversation_id ? JSON.stringify(matchingConversation.conversation_id) : null,
      exactMatch,
      characterDifferences: charDiff.length > 0 ? charDiff : "none",
      matchingConversationMessageCount: matchingConversation?.message_count,
      allConversationIds: allConversations?.map((c: any) => ({
        id: c.conversation_id,
        length: c.conversation_id?.length,
        messageCount: c.message_count,
        firstMessage: c.first_message?.substring(0, 30),
      })) || [],
      allMessagesForUserCount: allMessagesForUser?.length || 0,
      allMessagesForUser: allMessagesForUser?.map((m: any) => ({
        conversation_id: m.conversation_id,
        conversation_idLength: m.conversation_id?.length,
        wallet: m.user_wallet_address,
        role: m.message_role,
        contentPreview: m.message_content?.substring(0, 30),
      })) || [],
      checkError: checkError?.message,
      listError: listError?.message,
      allMessagesError: allMessagesError?.message,
    });

    // Delete all messages for this conversation using RPC function
    // Use the conversation_id from the list to ensure exact match
    let deletedCount = 0;
    let error: any = null;

    try {
      console.log("[Delete Conversation] Attempting delete with:", {
        conversationIdFromURL: conversationId,
        conversationIdFromList: matchingConversation?.conversation_id,
        conversationIdToUse,
        conversationIdMatch: conversationId === conversationIdToUse,
        walletAddress: validated.walletAddress,
        walletLowercase: validated.walletAddress.toLowerCase(),
        matchingConversationMessageCount: matchingConversation?.message_count,
      });

      const result = await supabaseAdmin.rpc("aura_delete_conversation", {
        p_user_wallet: validated.walletAddress,
        p_conversation_id: conversationIdToUse,
      });

      console.log("[Delete Conversation] RPC result:", {
        data: result.data,
        error: result.error,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
        errorDetails: result.error,
      });

      if (result.error) {
        // Check if the error is because the function doesn't exist
        const errorMsg = result.error.message || "";
        const errorCode = result.error.code || "";
        
        if (
          errorMsg.includes("does not exist") ||
          errorCode === "42883" ||
          errorMsg.includes("function") ||
          errorMsg.includes("aura_delete_conversation") ||
          errorMsg.includes("routine") ||
          errorCode === "P0001"
        ) {
          console.error("RPC function not found:", result.error);
          return NextResponse.json(
            {
              error: "Delete function not available",
              message: "Please run the database migration 006_aura_delete_conversation.sql to enable conversation deletion.",
              details: "The aura_delete_conversation RPC function is not found in the database.",
              errorCode,
              errorMessage: errorMsg,
            },
            { status: 503 }
          );
        }
        error = result.error;
      } else {
        // Check if result.data is null/undefined - this might mean function doesn't exist
        if (result.data === null || result.data === undefined) {
          console.warn("[Delete Conversation] RPC returned null/undefined - function might not exist");
          return NextResponse.json(
            {
              error: "Delete function may not be available",
              message: "The delete function returned no result. Please ensure migration 006_aura_delete_conversation.sql has been run.",
              details: "RPC function returned null/undefined instead of a count.",
            },
            { status: 503 }
          );
        }
        
        deletedCount = result.data || 0;
        console.log("[Delete Conversation] RPC deleted count:", deletedCount);
        
        // If RPC returns 0 but we know messages exist (from direct query), the RPC function might have an issue
        const hasDirectMessages = directMessages && directMessages.length > 0;
        if (deletedCount === 0 && hasDirectMessages) {
          console.error("[Delete Conversation] CRITICAL: RPC delete returned 0 but direct query found messages!", {
            rpcDeletedCount: deletedCount,
            directMessageCount: directMessages.length,
            conversationId: conversationIdToUse,
            walletAddress: validated.walletAddress.toLowerCase(),
          });
          
          // Try calling the RPC function again with the exact parameters from the direct query
          console.log("[Delete Conversation] Retrying RPC delete with exact parameters...");
          const retryResult = await supabaseAdmin.rpc("aura_delete_conversation", {
            p_user_wallet: validated.walletAddress.toLowerCase(), // Use lowercase like the query does
            p_conversation_id: conversationIdToUse,
          });
          
          console.log("[Delete Conversation] Retry RPC result:", {
            data: retryResult.data,
            error: retryResult.error?.message,
          });
          
          if (retryResult.data && retryResult.data > 0) {
            deletedCount = retryResult.data;
            console.log("[Delete Conversation] Retry succeeded, deleted:", deletedCount);
          } else if (retryResult.error) {
            console.error("[Delete Conversation] Retry failed:", retryResult.error);
          } else {
            console.error("[Delete Conversation] Retry also returned 0 - RPC function may have a bug or data inconsistency");
          }
        } else if (deletedCount === 0 && !hasDirectMessages) {
          console.log("[Delete Conversation] No messages found - conversation may already be deleted or never existed");
        }
      }
    } catch (rpcError: any) {
      console.error("[Delete Conversation] RPC call failed:", rpcError);
      // If RPC call fails completely, it might mean the function doesn't exist
      if (
        rpcError?.message?.includes("does not exist") ||
        rpcError?.code === "42883" ||
        rpcError?.message?.includes("function")
      ) {
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
      
      // If conversation appears in list but has no messages, there's a data inconsistency
      // OR the conversation_id format doesn't match exactly
      if (matchingConversation && (!existingMessages || existingMessages.length === 0) && (!allMessagesForUser || allMessagesForUser.length === 0)) {
        console.error("[Delete Conversation] Data inconsistency detected:");
        console.error("  - Conversation appears in list with message_count:", matchingConversation.message_count);
        console.error("  - But no messages found when querying directly");
        console.error("  - This suggests conversation_id format mismatch or data corruption");
        console.error("  - Conversation from list:", matchingConversation);
        console.error("  - Trying to delete:", conversationId);
        console.error("  - List shows conversation_id:", matchingConversation.conversation_id);
        console.error("  - IDs match?", matchingConversation.conversation_id === conversationId);
        
        // If IDs don't match exactly, try deleting with the ID from the list
        if (matchingConversation.conversation_id !== conversationId) {
          console.log("[Delete Conversation] IDs don't match, trying with list conversation_id:", matchingConversation.conversation_id);
          
          // Try deleting with the exact ID from the list
          const retryResult = await supabaseAdmin.rpc("aura_delete_conversation", {
            p_user_wallet: validated.walletAddress,
            p_conversation_id: matchingConversation.conversation_id,
          });
          
          if (retryResult.error) {
            console.error("[Delete Conversation] Retry with list ID also failed:", retryResult.error);
            return NextResponse.json(
              {
                error: "Conversation ID mismatch",
                message: `The conversation ID in the list doesn't match the URL parameter. Tried both but deletion failed.`,
                details: {
                  listConversationId: matchingConversation.conversation_id,
                  deleteConversationId: conversationId,
                  retryError: retryResult.error.message,
                },
              },
              { status: 400 }
            );
          }
          
          const retryDeletedCount = retryResult.data || 0;
          if (retryDeletedCount > 0) {
            console.log(`[Delete Conversation] Successfully deleted ${retryDeletedCount} messages using list conversation_id`);
            return NextResponse.json({
              success: true,
              message: "Conversation deleted successfully",
              deletedCount: retryDeletedCount,
              note: "Used conversation_id from list due to URL parameter mismatch.",
            });
          }
        }
        
        // If the conversation appears in the list with messages but we can't find/delete them,
        // there's a serious data inconsistency. Still try to help by returning an error
        // so the user knows something is wrong
        if (matchingConversation.message_count > 0) {
          console.error("[Delete Conversation] CRITICAL: Conversation shows", matchingConversation.message_count, "messages in list but we can't find or delete them");
          return NextResponse.json(
            {
              error: "Delete failed - data inconsistency",
              message: "Conversation appears to have messages but they cannot be deleted. This may indicate a database issue or the delete function is not working correctly.",
              details: {
                listMessageCount: matchingConversation.message_count,
                foundMessages: existingMessages?.length || 0,
                deletedCount: 0,
                conversationId,
              },
            },
            { status: 500 }
          );
        }
        
        // Still return success - the conversation has no messages so it's effectively deleted
        // The frontend refresh will remove it since it has no messages
        return NextResponse.json({
          success: true,
          message: "Conversation deleted (no messages found)",
          deletedCount: 0,
          note: "Conversation appeared in list but had no messages. It will be removed on refresh.",
          dataInconsistency: true,
        });
      }
      
      // If we found messages when checking but deleted 0, there's a problem
      if (existingMessages && existingMessages.length > 0) {
        console.error("[Delete Conversation] Found messages but delete returned 0. Possible issues:");
        console.error("  - RPC function might not be working correctly");
        console.error("  - Parameter mismatch (wallet case, conversation_id format)");
        console.error("  - Migration not run or function doesn't exist");
        
        return NextResponse.json(
          {
            error: "Delete failed",
            message: "Conversation exists but could not be deleted. Please check if the migration 006_aura_delete_conversation.sql has been run.",
            details: {
              foundMessages: existingMessages.length,
              deletedCount: 0,
              conversationId,
              walletAddress: validated.walletAddress,
            },
          },
          { status: 500 }
        );
      }
      
      // If conversation appears in list with messages but we deleted 0, that's a problem
      if (matchingConversation && matchingConversation.message_count > 0 && deletedCount === 0) {
        console.error("[Delete Conversation] CRITICAL ISSUE:");
        console.error("  - Conversation in list has", matchingConversation.message_count, "messages");
        console.error("  - But delete returned 0 deleted");
        console.error("  - This means the RPC function either:");
        console.error("    1. Doesn't exist (migration not run)");
        console.error("    2. Has a bug");
        console.error("    3. Parameters don't match");
        
        return NextResponse.json(
          {
            error: "Delete failed",
            message: `Conversation has ${matchingConversation.message_count} messages but deletion returned 0. The delete function may not be working correctly. Please check if migration 006_aura_delete_conversation.sql has been run.`,
            details: {
              listMessageCount: matchingConversation.message_count,
              deletedCount: 0,
              conversationId,
              walletAddress: validated.walletAddress,
            },
          },
          { status: 500 }
        );
      }
      
      // No messages found and not in list - conversation doesn't exist or already deleted
      // Return success so frontend can remove it from UI
      return NextResponse.json({
        success: true,
        message: "Conversation deleted (or already deleted)",
        deletedCount: 0,
        note: "No messages were found. The conversation may have already been deleted.",
      });
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

