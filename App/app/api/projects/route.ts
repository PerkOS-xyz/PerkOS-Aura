import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { z } from "zod";

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

    const { data, error } = await supabaseAdmin.rpc("aura_get_projects", {
      p_user_wallet: validated.walletAddress,
    });

    if (error) {
      console.error("Failed to get projects:", error);
      return NextResponse.json(
        { error: "Failed to get projects", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      projects: data || [],
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

    const { data, error } = await supabaseAdmin.rpc("aura_create_project", {
      p_user_wallet: validated.walletAddress,
      p_name: validated.name,
      p_description: validated.description || null,
    });

    if (error) {
      console.error("Failed to create project:", error);
      return NextResponse.json(
        { error: "Failed to create project", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      projectId: data,
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
