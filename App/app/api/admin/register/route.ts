import { NextRequest, NextResponse } from "next/server";
import { registrationService } from "@/lib/services/RegistrationService";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/register
 * Manually trigger service registration with facilitator
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const result = await registrationService.register(body);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
                alreadyRegistered: result.alreadyRegistered,
            }, { status: result.alreadyRegistered ? 200 : 400 });
        }

        return NextResponse.json({
            success: true,
            vendor: result.vendor,
            vendorId: result.vendorId,
        });
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Registration failed",
        }, { status: 500 });
    }
}

/**
 * GET /api/admin/register
 * Check registration status
 */
export async function GET(request: NextRequest) {
    try {
        const status = await registrationService.checkStatus();
        return NextResponse.json(status);
    } catch (error) {
        console.error("Status check error:", error);
        return NextResponse.json({
            registered: false,
            facilitatorUrl: process.env.FACILITATOR_URL || "https://stack.perkos.xyz",
            error: error instanceof Error ? error.message : "Failed to check status",
            lastChecked: new Date().toISOString(),
        }, { status: 200 });
    }
}
