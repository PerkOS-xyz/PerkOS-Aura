/**
 * Chat endpoint request validators using Zod
 */

import { z } from "zod";

export const chatRequestSchema = z.object({
    message: z.string().min(1).max(2000),
    conversationId: z.string().nullable().optional(),
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    paymentId: z.string().optional(),
    projectId: z.string().uuid().nullable().optional(),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
