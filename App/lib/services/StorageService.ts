/**
 * StorageService
 * Handles uploading files to Firebase Storage and returning permanent URLs
 *
 * Used for:
 * - Storing generated images from Replicate (temporary URLs → permanent Firebase URLs)
 * - Storing audio files from text-to-speech
 * - Any other generated media content
 */

import { getStorageInstance } from "@/lib/db/firebase";

export interface UploadResult {
  url: string;
  path: string;
  contentType: string;
}

/**
 * StorageService class for Firebase Storage operations
 */
export class StorageService {
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.FIREBASE_STORAGE_BUCKET || "";
    if (!this.bucketName) {
      console.warn("[StorageService] FIREBASE_STORAGE_BUCKET not set");
    }
  }

  /**
   * Upload a file from a URL (e.g., Replicate temporary URL) to Firebase Storage
   */
  async uploadFromUrl(
    sourceUrl: string,
    options: {
      walletAddress: string;
      conversationId: string;
      type: "image" | "audio";
      filename?: string;
    }
  ): Promise<UploadResult> {
    const { walletAddress, conversationId, type, filename } = options;

    console.log("[StorageService] uploadFromUrl called", {
      sourceUrl: sourceUrl.substring(0, 100) + "...",
      walletAddress: walletAddress.substring(0, 10) + "...",
      conversationId,
      type,
    });

    try {
      // Fetch the file from the source URL
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch from source URL: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || this.getDefaultContentType(type);

      // Generate unique filename
      const timestamp = Date.now();
      const extension = this.getExtensionFromContentType(contentType, type);
      const generatedFilename = filename || `${type}_${timestamp}.${extension}`;

      // Build storage path: users/{wallet}/conversations/{convId}/{filename}
      const storagePath = `users/${walletAddress.toLowerCase()}/conversations/${conversationId}/${generatedFilename}`;

      // Get storage bucket and upload
      const storage = getStorageInstance();
      const bucket = storage.bucket();
      const file = bucket.file(storagePath);

      // Upload the file
      await file.save(Buffer.from(buffer), {
        metadata: {
          contentType,
          metadata: {
            walletAddress: walletAddress.toLowerCase(),
            conversationId,
            type,
            originalUrl: sourceUrl.substring(0, 500), // Store reference to original
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // Make the file publicly accessible
      await file.makePublic();

      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

      console.log("[StorageService] uploadFromUrl success", {
        storagePath,
        publicUrl: publicUrl.substring(0, 100) + "...",
        contentType,
        size: buffer.byteLength,
      });

      return {
        url: publicUrl,
        path: storagePath,
        contentType,
      };
    } catch (error) {
      console.error("[StorageService] uploadFromUrl failed:", error);
      throw error;
    }
  }

  /**
   * Upload a base64 data URL to Firebase Storage
   */
  async uploadFromBase64(
    base64DataUrl: string,
    options: {
      walletAddress: string;
      conversationId: string;
      type: "image" | "audio";
      filename?: string;
    }
  ): Promise<UploadResult> {
    const { walletAddress, conversationId, type, filename } = options;

    console.log("[StorageService] uploadFromBase64 called", {
      walletAddress: walletAddress.substring(0, 10) + "...",
      conversationId,
      type,
      dataLength: base64DataUrl.length,
    });

    try {
      // Parse the data URL
      const matches = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error("Invalid base64 data URL format");
      }

      const contentType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      // Generate unique filename
      const timestamp = Date.now();
      const extension = this.getExtensionFromContentType(contentType, type);
      const generatedFilename = filename || `${type}_${timestamp}.${extension}`;

      // Build storage path
      const storagePath = `users/${walletAddress.toLowerCase()}/conversations/${conversationId}/${generatedFilename}`;

      // Get storage bucket and upload
      const storage = getStorageInstance();
      const bucket = storage.bucket();
      const file = bucket.file(storagePath);

      // Upload the file
      await file.save(buffer, {
        metadata: {
          contentType,
          metadata: {
            walletAddress: walletAddress.toLowerCase(),
            conversationId,
            type,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // Make the file publicly accessible
      await file.makePublic();

      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

      console.log("[StorageService] uploadFromBase64 success", {
        storagePath,
        publicUrl: publicUrl.substring(0, 100) + "...",
        contentType,
        size: buffer.byteLength,
      });

      return {
        url: publicUrl,
        path: storagePath,
        contentType,
      };
    } catch (error) {
      console.error("[StorageService] uploadFromBase64 failed:", error);
      throw error;
    }
  }

  /**
   * Upload content to Firebase Storage - auto-detects URL vs base64
   */
  async upload(
    content: string,
    options: {
      walletAddress: string;
      conversationId: string;
      type: "image" | "audio";
      filename?: string;
    }
  ): Promise<UploadResult> {
    // Check if it's a base64 data URL
    if (content.startsWith("data:")) {
      return this.uploadFromBase64(content, options);
    }

    // Check if it's an HTTP(S) URL
    if (content.startsWith("http://") || content.startsWith("https://")) {
      return this.uploadFromUrl(content, options);
    }

    throw new Error("Invalid content format: must be a data URL or HTTP(S) URL");
  }

  /**
   * Check if a URL is already a Firebase Storage URL
   */
  isFirebaseStorageUrl(url: string): boolean {
    return url.includes("storage.googleapis.com") || url.includes("firebasestorage.googleapis.com");
  }

  /**
   * Get file extension from content type
   */
  private getExtensionFromContentType(contentType: string, fallbackType: "image" | "audio"): string {
    const typeMap: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/gif": "gif",
      "image/webp": "webp",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/ogg": "ogg",
      "audio/webm": "webm",
    };

    return typeMap[contentType] || (fallbackType === "image" ? "png" : "mp3");
  }

  /**
   * Get default content type based on file type
   */
  private getDefaultContentType(type: "image" | "audio"): string {
    return type === "image" ? "image/png" : "audio/mpeg";
  }
}

// Singleton instance
let storageServiceInstance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService();
  }
  return storageServiceInstance;
}
