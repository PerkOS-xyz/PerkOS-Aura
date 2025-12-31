/**
 * AI service type definitions
 * Request/response types for all AI endpoints
 */

export interface ImageAnalyzeRequest {
    image: string;
    question?: string;
}

export interface ImageAnalyzeResponse {
    success: boolean;
    data: {
        analysis: string;
    };
}

export interface ImageGenerateRequest {
    prompt: string;
    size?: "1024x1024";
}

export interface ImageGenerateResponse {
    success: boolean;
    data: {
        url?: string;
        base64?: string;
        revisedPrompt?: string;
    };
}

export interface AudioTranscribeRequest {
    file: File | Blob;
}

export interface AudioTranscribeResponse {
    success: boolean;
    data: {
        transcription: string;
    };
}

export interface TextSynthesizeRequest {
    text: string;
    voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
}

// Synthesize returns audio binary, so no JSON response type

export type AIServiceName = "analyze" | "generate" | "transcribe" | "synthesize";

export interface AIServiceConfig {
    analyzePriceUsd: number;
    generatePriceUsd: number;
    transcribePriceUsd: number;
    synthesizePriceUsd: number;
    summarizePriceUsd: number;
    translatePriceUsd: number;
    sentimentPriceUsd: number;
    moderatePriceUsd: number;
}

// NLP Service Types
export interface TextSummarizeRequest {
    text: string;
    length?: "short" | "medium" | "long";
}

export interface TextSummarizeResponse {
    success: boolean;
    data: {
        summary: string;
    };
}

export interface TextTranslateRequest {
    text: string;
    sourceLang: string;
    targetLang: string;
}

export interface TextTranslateResponse {
    success: boolean;
    data: {
        translation: string;
        confidence: number;
    };
}

export interface SentimentAnalyzeRequest {
    text: string;
}

export interface SentimentAnalyzeResponse {
    success: boolean;
    data: {
        sentiment: "positive" | "negative" | "neutral";
        score: number;
        emotions: string[];
    };
}

export interface ContentModerateRequest {
    content: string;
}

export interface ContentModerateResponse {
    success: boolean;
    data: {
        flagged: boolean;
        categories: Record<string, boolean>;
        categoryScores: Record<string, number>;
        reasoning?: string;
    };
}
