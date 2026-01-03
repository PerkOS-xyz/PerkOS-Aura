import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { initializeFirebase } from "@/lib/db/firebase";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const conversationId = formData.get("conversationId") as string;
        const walletAddress = formData.get("walletAddress") as string;

        if (!file || !conversationId) {
            return NextResponse.json(
                { error: "Missing file or conversationId" },
                { status: 400 }
            );
        }

        // Initialize Firebase Admin
        const app = initializeFirebase();
        const storage = getStorage(app);

        // Use default bucket
        const bucket = storage.bucket();

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Create sanitized filename
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `${Date.now()}_${safeName}`;
        const path = `chats/${conversationId}/${filename}`;

        const fileRef = bucket.file(path);

        // Upload file
        await fileRef.save(buffer, {
            contentType: file.type,
            metadata: {
                metadata: {
                    walletAddress,
                    originalName: file.name,
                },
            },
        });

        // Make the file public so it can be accessed by the frontend
        // Note: In a production app with private data, you should use signed URLs
        // specific to the user, but for this implementation we'll use a public URL
        // or long-lived signed URL for simplicity as requested.
        await fileRef.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            path,
            filename,
            size: file.size,
            type: file.type
        });
    } catch (error) {
        console.error("[Upload API] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Upload failed" },
            { status: 500 }
        );
    }
}
