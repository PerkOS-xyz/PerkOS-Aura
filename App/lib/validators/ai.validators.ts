/**
 * AI endpoint request validators using Zod
 */

import { z } from "zod";

export const imageAnalyzeSchema = z.object({
    image: z.string().min(1, "Image is required"),
    question: z.string().optional(),
});

export const imageGenerateSchema = z.object({
    prompt: z.string().min(1, "Prompt is required"),
    size: z.enum(["1024x1024"]).optional().default("1024x1024"),
});

export const textSynthesizeSchema = z.object({
    text: z.string().min(1, "Text is required"),
    voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"])
        .optional()
        .default("alloy"),
});

// Transcribe uses multipart/form-data, validated separately in route

export type ImageAnalyzeInput = z.infer<typeof imageAnalyzeSchema>;
export type ImageGenerateInput = z.infer<typeof imageGenerateSchema>;
export type TextSynthesizeInput = z.infer<typeof textSynthesizeSchema>;

// NLP Service Validators
export const textSummarizeSchema = z.object({
    text: z.string().min(1, "Text is required"),
    length: z.enum(["short", "medium", "long"]).optional().default("medium"),
});

export const textTranslateSchema = z.object({
    text: z.string().min(1, "Text is required"),
    sourceLang: z.string().min(2, "Source language is required"),
    targetLang: z.string().min(2, "Target language is required"),
});

export const sentimentAnalyzeSchema = z.object({
    text: z.string().min(1, "Text is required"),
});

export const contentModerateSchema = z.object({
    content: z.string().min(1, "Content is required"),
});

export type TextSummarizeInput = z.infer<typeof textSummarizeSchema>;
export type TextTranslateInput = z.infer<typeof textTranslateSchema>;
export type SentimentAnalyzeInput = z.infer<typeof sentimentAnalyzeSchema>;
export type ContentModerateInput = z.infer<typeof contentModerateSchema>;
