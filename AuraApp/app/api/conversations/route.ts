import { NextRequest, NextResponse } from "next/server";
import { getFirestoreInstance, getUserCollectionPath, COLLECTIONS, getConversationMessagesPath } from "@/lib/db/firebase";
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

    const db = getFirestoreInstance();
    const userWallet = validated.walletAddress.toLowerCase();
    const conversationsRef = db.collection(getUserCollectionPath(COLLECTIONS.CONVERSATIONS, userWallet));

    // Get all conversations for the user
    let query = conversationsRef.orderBy("last_message_at", "desc").limit(50);
    
    if (validated.projectId) {
      query = query.where("project_id", "==", validated.projectId) as any;
    }

    const snapshot = await query.get();
    const conversations = [];

    // For each conversation, get the first message and count messages
    for (const doc of snapshot.docs) {
      const convData = doc.data();
      const conversationId = convData.conversation_id || doc.id;

      // Get messages for this conversation
      const messagesRef = db
        .collection(getConversationMessagesPath(userWallet, conversationId))
        .orderBy("created_at", "asc")
        .limit(1);

      const messagesSnapshot = await messagesRef.get();
      
      // Get message count
      const allMessagesSnapshot = await db
        .collection(getConversationMessagesPath(userWallet, conversationId))
        .get();

      const firstMessage = messagesSnapshot.docs[0]?.data()?.message_content || null;
      const messageCount = allMessagesSnapshot.size;

      // Only include conversations that have messages
      if (messageCount > 0) {
        conversations.push({
          conversation_id: conversationId,
          project_id: convData.project_id || null,
          project_name: null, // Would need to fetch from projects collection
          first_message: firstMessage,
          last_message_at: convData.last_message_at?.toDate?.()?.toISOString() || convData.last_message_at || new Date().toISOString(),
          message_count: messageCount,
        });
      }
    }

    console.log("[Get Conversations] Returning conversations:", {
      walletAddress: validated.walletAddress,
      walletLowercase: userWallet,
      count: conversations.length,
      conversationIds: conversations.map((c: any) => c.conversation_id),
      conversations: conversations.map((c: any) => ({
        id: c.conversation_id,
        firstMessage: c.first_message?.substring(0, 50),
        messageCount: c.message_count,
      })),
    });

    return NextResponse.json({
      success: true,
      conversations,
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
