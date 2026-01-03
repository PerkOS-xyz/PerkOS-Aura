import { NextRequest, NextResponse } from "next/server";
import { getFirestoreInstance, getUserCollectionPath, COLLECTIONS } from "@/lib/db/firebase";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// Validation schemas
const createProjectSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Valid wallet address required"),
  name: z.string().min(1, "Project name is required").max(100, "Project name too long"),
  description: z.string().max(500, "Description too long").optional(),
});

const getProjectsSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Valid wallet address required"),
});

/**
 * GET /api/projects
 * Get all projects for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    const validated = getProjectsSchema.parse({ walletAddress });
    const db = getFirestoreInstance();
    const userWallet = validated.walletAddress.toLowerCase();

    const projectsRef = db
      .collection(getUserCollectionPath(COLLECTIONS.PROJECTS, userWallet))
      .orderBy("updated_at", "desc");

    const snapshot = await projectsRef.get();

    const projects = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description || null,
        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at || new Date().toISOString(),
        updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at || new Date().toISOString(),
        conversation_count: 0, // Would need to count conversations separately
      };
    });

    return NextResponse.json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get projects", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createProjectSchema.parse(body);
    const db = getFirestoreInstance();
    const userWallet = validated.walletAddress.toLowerCase();

    const projectsRef = db.collection(getUserCollectionPath(COLLECTIONS.PROJECTS, userWallet));
    const projectRef = projectsRef.doc();

    const projectData = {
      id: projectRef.id,
      user_wallet_address: userWallet,
      name: validated.name,
      description: validated.description || null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };

    await projectRef.set(projectData);

    return NextResponse.json({
      success: true,
      projectId: projectRef.id,
    });
  } catch (error) {
    console.error("Create project error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create project", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
