import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { z } from "zod";

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

    const { data, error } = await supabaseAdmin.rpc("aura_get_project_by_id", {
      p_user_wallet: walletAddress,
      p_project_id: projectId,
    });

    if (error) {
      console.error("Failed to get project:", error);
      return NextResponse.json(
        { error: "Failed to get project", message: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      project: data[0],
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

    const { data, error } = await supabaseAdmin.rpc("aura_update_project", {
      p_project_id: projectId,
      p_user_wallet: validated.walletAddress,
      p_name: validated.name,
      p_description: validated.description || null,
    });

    if (error) {
      console.error("Failed to update project:", error);
      return NextResponse.json(
        { error: "Failed to update project", message: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Project not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: data,
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
 * Delete a project
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

    const { data, error } = await supabaseAdmin.rpc("aura_delete_project", {
      p_project_id: projectId,
      p_user_wallet: validated.walletAddress,
    });

    if (error) {
      console.error("Failed to delete project:", error);
      return NextResponse.json(
        { error: "Failed to delete project", message: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Project not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: data,
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
