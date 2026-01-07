import { NextRequest, NextResponse } from "next/server";
import { getFirestoreInstance, getUserCollectionPath, COLLECTIONS, getConversationMessagesPath } from "@/lib/db/firebase";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// Validation schemas
const updateProjectSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Valid wallet address required"),
  name: z.string().min(1, "Project name is required").max(100, "Project name too long"),
  description: z.string().max(500, "Description too long").optional(),
});

const deleteProjectSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Valid wallet address required"),
});

/**
 * GET /api/projects/[projectId]
 * Get a single project by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Valid walletAddress is required" },
        { status: 400 }
      );
    }

    const db = getFirestoreInstance();
    const userWallet = walletAddress.toLowerCase();
    const projectRef = db
      .collection(getUserCollectionPath(COLLECTIONS.PROJECTS, userWallet))
      .doc(projectId);

    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const data = projectDoc.data();
    if (data?.user_wallet_address !== userWallet) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      project: {
        id: projectDoc.id,
        name: data.name,
        description: data.description || null,
        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at || new Date().toISOString(),
        updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at || new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json(
      { error: "Failed to get project", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[projectId]
 * Update a project
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const validated = updateProjectSchema.parse(body);
    const db = getFirestoreInstance();
    const userWallet = validated.walletAddress.toLowerCase();

    const projectRef = db
      .collection(getUserCollectionPath(COLLECTIONS.PROJECTS, userWallet))
      .doc(projectId);

    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const data = projectDoc.data();
    if (data?.user_wallet_address !== userWallet) {
      return NextResponse.json(
        { error: "Project not found or not authorized" },
        { status: 404 }
      );
    }

    await projectRef.update({
      name: validated.name,
      description: validated.description || null,
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      updated: true,
    });
  } catch (error) {
    console.error("Update project error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update project", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId]
 * Delete a project and unlink all conversations
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    const validated = deleteProjectSchema.parse({ walletAddress });
    const db = getFirestoreInstance();
    const userWallet = validated.walletAddress.toLowerCase();

    const projectRef = db
      .collection(getUserCollectionPath(COLLECTIONS.PROJECTS, userWallet))
      .doc(projectId);

    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const data = projectDoc.data();
    if (data?.user_wallet_address !== userWallet) {
      return NextResponse.json(
        { error: "Project not found or not authorized" },
        { status: 404 }
      );
    }

    // Unlink all conversations from this project
    const conversationsRef = db
      .collection(getUserCollectionPath(COLLECTIONS.CONVERSATIONS, userWallet))
      .where("project_id", "==", projectId);

    const conversationsSnapshot = await conversationsRef.get();
    const batch = db.batch();

    conversationsSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        project_id: null,
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    // Delete the project
    batch.delete(projectRef);

    await batch.commit();

    return NextResponse.json({
      success: true,
      deleted: true,
    });
  } catch (error) {
    console.error("Delete project error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete project", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
