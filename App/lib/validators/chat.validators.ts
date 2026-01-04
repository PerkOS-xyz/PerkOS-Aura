/**
 * Chat endpoint request validators using Zod
 */

import { z } from "zod";

export const chatRequestSchema = z.object({
    message: z.string().min(1).max(10000), // Increased for longer content
    conversationId: z.string().nullable().optional(),
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    paymentId: z.string().optional(),
    projectId: z.string().uuid().nullable().optional(),
    // For storing generated content (images, audio, etc.) without generating a response
    storeOnly: z.boolean().optional(),
    role: z.enum(["user", "assistant"]).optional(),
    attachment: z.object({
        type: z.enum(["image", "audio"]),
        data: z.string(), // base64 data URL or external URL
    }).nullable().optional(),
    // Payment transaction info (for persisting tx hash with messages)
    transactionHash: z.string().optional(),
    paymentNetwork: z.string().optional(),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
