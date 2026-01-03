import { NextRequest, NextResponse } from "next/server";
import { getFirestoreInstance, getConversationMessagesPath, getUserCollectionPath, COLLECTIONS } from "@/lib/db/firebase";
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
    const db = getFirestoreInstance();
    const userWallet = validated.walletAddress.toLowerCase();

    // Get all messages for this conversation
    const messagesPath = getConversationMessagesPath(userWallet, conversationId);
    const messagesRef = db.collection(messagesPath);
    const messagesSnapshot = await messagesRef.get();

    console.log("[Delete Conversation] Found messages:", {
      conversationId,
      messageCount: messagesSnapshot.size,
    });

    // Delete all messages in batch
    const batch = db.batch();
    let deletedCount = 0;

    messagesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    // Delete the conversation document
    const conversationRef = db
      .collection(getUserCollectionPath(COLLECTIONS.CONVERSATIONS, userWallet))
      .doc(conversationId);

    const conversationDoc = await conversationRef.get();
    if (conversationDoc.exists) {
      batch.delete(conversationRef);
    }

    // Commit the batch delete
    await batch.commit();

    console.log(`[Delete Conversation] Successfully deleted ${deletedCount} messages for conversation:`, conversationId);

    return NextResponse.json({
      success: true,
      message: "Conversation deleted successfully",
      deletedCount,
    });
  } catch (error) {
    console.error("Failed to delete conversation:", error);

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
