/**
 * RegistrationService
 * Handles vendor service registration with PerkOS-Stack facilitator
 * Uses direct registration mode with full endpoint definitions
 */

import { x402Config, aiServiceConfig, serviceDiscovery } from "@/lib/config/x402";

export interface RegistrationStatus {
    registered: boolean;
    vendorId?: string;
    vendorName?: string;
    facilitatorUrl: string;
    lastChecked?: string;
    error?: string;
}

export interface RegistrationRequest {
    url: string;
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    iconUrl?: string;
    websiteUrl?: string;
    docsUrl?: string;
    walletAddress: string;
    network: string;
    priceUsd?: string;
    facilitatorUrl: string;
    endpoints: Array<{
        path: string;
        method: "GET" | "POST" | "PUT" | "DELETE";
        description: string;
        priceUsd: string;
        inputSchema?: object;
        outputSchema?: object;
    }>;
}

export interface RegistrationResult {
    success: boolean;
    vendor?: any;
    vendorId?: string;
    error?: string;
    alreadyRegistered?: boolean;
}

export class RegistrationService {
    private facilitatorUrl: string;
    private serviceUrl: string;

    constructor() {
        this.facilitatorUrl = x402Config.facilitatorUrl;
        this.serviceUrl = process.env.NEXT_PUBLIC_SERVICE_URL || "http://localhost:3000";
    }

    /**
     * Build endpoint definitions from x402 config (ALL 20 SERVICES)
     * Includes inputSchema and outputSchema for discovery
     */
    private buildEndpoints(): RegistrationRequest["endpoints"] {
        return [
            // ========== Vision & Audio Services ==========
            {
                path: "/api/ai/analyze",
                method: "POST",
                description: "Analyze image contents using GPT-4o vision",
                priceUsd: aiServiceConfig.analyzePriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["image"],
                    properties: {
                        image: { type: "string", description: "Base64 encoded image (data:image/...;base64,...) or URL" },
                        question: { type: "string", description: "Optional question about the image" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        analysis: { type: "string", description: "AI analysis of the image" },
                    },
                },
            },
            {
                path: "/api/ai/generate",
                method: "POST",
                description: "Generate image from text prompt using FLUX",
                priceUsd: aiServiceConfig.generatePriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["prompt"],
                    properties: {
                        prompt: { type: "string", description: "Text description of the image to generate" },
                        size: { type: "string", enum: ["1024x1024", "1792x1024", "1024x1792"], default: "1024x1024" },
                        quality: { type: "string", enum: ["standard", "hd"], default: "standard" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        imageUrl: { type: "string", description: "URL of the generated image" },
                    },
                },
            },
            {
                path: "/api/ai/transcribe",
                method: "POST",
                description: "Transcribe audio to text using Whisper",
                priceUsd: aiServiceConfig.transcribePriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["file"],
                    properties: {
                        file: { type: "string", format: "binary", description: "Audio file (WAV, MP3, M4A, etc.)" },
                        language: { type: "string", description: "Optional language code (e.g., 'en', 'es')" },
                    },
                    contentType: "multipart/form-data",
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        transcription: { type: "string", description: "Transcribed text from audio" },
                    },
                },
            },
            {
                path: "/api/ai/synthesize",
                method: "POST",
                description: "Convert text to speech (TTS)",
                priceUsd: aiServiceConfig.synthesizePriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["text"],
                    properties: {
                        text: { type: "string", description: "Text to convert to speech" },
                        voice: { type: "string", enum: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"], default: "alloy" },
                    },
                },
                outputSchema: {
                    type: "binary",
                    contentType: "audio/mpeg",
                    description: "Audio file buffer",
                },
            },
            // ========== NLP Services ==========
            {
                path: "/api/ai/summarize",
                method: "POST",
                description: "Summarize text in short/medium/long format",
                priceUsd: aiServiceConfig.summarizePriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["text"],
                    properties: {
                        text: { type: "string", description: "Text to summarize" },
                        length: { type: "string", enum: ["short", "medium", "long"], default: "medium" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        summary: { type: "string", description: "Summarized text" },
                        originalLength: { type: "number" },
                        summaryLength: { type: "number" },
                    },
                },
            },
            {
                path: "/api/ai/translate",
                method: "POST",
                description: "Translate text between 50+ languages",
                priceUsd: aiServiceConfig.translatePriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["text", "targetLang"],
                    properties: {
                        text: { type: "string", description: "Text to translate" },
                        sourceLang: { type: "string", description: "Source language (auto-detected if not provided)" },
                        targetLang: { type: "string", description: "Target language code (e.g., 'es', 'fr', 'de')" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        translation: { type: "string" },
                        detectedLanguage: { type: "string" },
                    },
                },
            },
            {
                path: "/api/ai/sentiment",
                method: "POST",
                description: "Analyze sentiment and emotions in text",
                priceUsd: aiServiceConfig.sentimentPriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["text"],
                    properties: {
                        text: { type: "string", description: "Text to analyze" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        sentiment: { type: "string", enum: ["positive", "negative", "neutral", "mixed"] },
                        confidence: { type: "number", minimum: 0, maximum: 1 },
                        emotions: { type: "array", items: { type: "string" } },
                    },
                },
            },
            {
                path: "/api/ai/moderate",
                method: "POST",
                description: "Check content for safety violations",
                priceUsd: aiServiceConfig.moderatePriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["content"],
                    properties: {
                        content: { type: "string", description: "Content to moderate" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        flagged: { type: "boolean" },
                        categories: { type: "object", description: "Flagged category scores" },
                        reasoning: { type: "string" },
                    },
                },
            },
            {
                path: "/api/ai/simplify",
                method: "POST",
                description: "Simplify text to various reading levels",
                priceUsd: aiServiceConfig.simplifyPriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["text"],
                    properties: {
                        text: { type: "string", description: "Text to simplify" },
                        readingLevel: { type: "string", enum: ["elementary", "middle_school", "high_school", "adult"], default: "middle_school" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        simplifiedText: { type: "string" },
                        readabilityScore: { type: "number" },
                    },
                },
            },
            {
                path: "/api/ai/extract",
                method: "POST",
                description: "Extract named entities (people, places, dates, etc)",
                priceUsd: aiServiceConfig.extractPriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["text"],
                    properties: {
                        text: { type: "string", description: "Text to extract entities from" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        entities: {
                            type: "object",
                            properties: {
                                people: { type: "array", items: { type: "string" } },
                                organizations: { type: "array", items: { type: "string" } },
                                locations: { type: "array", items: { type: "string" } },
                                dates: { type: "array", items: { type: "string" } },
                                amounts: { type: "array", items: { type: "string" } },
                            },
                        },
                    },
                },
            },
            // ========== Business Services ==========
            {
                path: "/api/ai/email/generate",
                method: "POST",
                description: "Generate professional emails from key points",
                priceUsd: aiServiceConfig.emailGeneratePriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["purpose", "keyPoints"],
                    properties: {
                        purpose: { type: "string", description: "Email purpose (e.g., 'follow up after meeting')" },
                        keyPoints: { type: "array", items: { type: "string" }, description: "Key points to include" },
                        tone: { type: "string", enum: ["formal", "casual", "friendly", "urgent"], default: "formal" },
                        recipientName: { type: "string" },
                        senderName: { type: "string" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        subject: { type: "string" },
                        body: { type: "string" },
                    },
                },
            },
            {
                path: "/api/ai/product/describe",
                method: "POST",
                description: "Create compelling product descriptions",
                priceUsd: aiServiceConfig.productDescribePriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["productName", "features"],
                    properties: {
                        productName: { type: "string" },
                        features: { type: "array", items: { type: "string" } },
                        targetAudience: { type: "string" },
                        tone: { type: "string", enum: ["professional", "casual", "luxury", "technical"], default: "professional" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        shortDescription: { type: "string" },
                        longDescription: { type: "string" },
                        bulletPoints: { type: "array", items: { type: "string" } },
                    },
                },
            },
            {
                path: "/api/ai/seo/optimize",
                method: "POST",
                description: "Optimize content for search engines",
                priceUsd: aiServiceConfig.seoOptimizePriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["content"],
                    properties: {
                        content: { type: "string", description: "Content to optimize" },
                        keywords: { type: "array", items: { type: "string" }, description: "Target keywords" },
                        contentType: { type: "string", enum: ["blog", "product", "landing", "article"], default: "article" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        optimizedContent: { type: "string" },
                        metaTitle: { type: "string" },
                        metaDescription: { type: "string" },
                        suggestedKeywords: { type: "array", items: { type: "string" } },
                    },
                },
            },
            // ========== Developer Tools ==========
            {
                path: "/api/ai/code/generate",
                method: "POST",
                description: "Generate code from natural language description",
                priceUsd: aiServiceConfig.codeGeneratePriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["description"],
                    properties: {
                        description: { type: "string", description: "What the code should do" },
                        language: { type: "string", description: "Programming language (e.g., 'python', 'javascript')" },
                        framework: { type: "string", description: "Optional framework (e.g., 'react', 'express')" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        code: { type: "string" },
                        language: { type: "string" },
                        explanation: { type: "string" },
                    },
                },
            },
            {
                path: "/api/ai/code/review",
                method: "POST",
                description: "Review code for bugs and security issues",
                priceUsd: aiServiceConfig.codeReviewPriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["code"],
                    properties: {
                        code: { type: "string", description: "Code to review" },
                        language: { type: "string", description: "Programming language" },
                        focusAreas: { type: "array", items: { type: "string" }, description: "Areas to focus on (security, performance, style)" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        issues: { type: "array", items: { type: "object" } },
                        suggestions: { type: "array", items: { type: "string" } },
                        overallScore: { type: "number", minimum: 0, maximum: 10 },
                    },
                },
            },
            {
                path: "/api/ai/sql/generate",
                method: "POST",
                description: "Generate SQL queries from natural language",
                priceUsd: aiServiceConfig.sqlGeneratePriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["query"],
                    properties: {
                        query: { type: "string", description: "Natural language query description" },
                        schema: { type: "string", description: "Database schema (table definitions)" },
                        dialect: { type: "string", enum: ["postgresql", "mysql", "sqlite", "mssql"], default: "postgresql" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        sql: { type: "string" },
                        explanation: { type: "string" },
                    },
                },
            },
            {
                path: "/api/ai/regex/generate",
                method: "POST",
                description: "Generate regex patterns from descriptions",
                priceUsd: aiServiceConfig.regexGeneratePriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["description"],
                    properties: {
                        description: { type: "string", description: "What the regex should match" },
                        testCases: { type: "array", items: { type: "string" }, description: "Example strings to test" },
                        flavor: { type: "string", enum: ["javascript", "python", "pcre"], default: "javascript" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        pattern: { type: "string" },
                        flags: { type: "string" },
                        explanation: { type: "string" },
                        testResults: { type: "array", items: { type: "object" } },
                    },
                },
            },
            {
                path: "/api/ai/docs/generate",
                method: "POST",
                description: "Generate API documentation from code",
                priceUsd: aiServiceConfig.docsGeneratePriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["code"],
                    properties: {
                        code: { type: "string", description: "Code to document" },
                        format: { type: "string", enum: ["markdown", "jsdoc", "openapi"], default: "markdown" },
                        framework: { type: "string", description: "Framework for context (e.g., 'express', 'fastapi')" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        documentation: { type: "string" },
                        format: { type: "string" },
                    },
                },
            },
            // ========== Advanced Services ==========
            {
                path: "/api/ai/ocr",
                method: "POST",
                description: "Extract text from images (OCR)",
                priceUsd: aiServiceConfig.ocrPriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["image"],
                    properties: {
                        image: { type: "string", description: "Base64 encoded image or URL" },
                        language: { type: "string", description: "Expected language for better accuracy" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        text: { type: "string", description: "Extracted text" },
                        confidence: { type: "number" },
                        blocks: { type: "array", items: { type: "object" }, description: "Text blocks with positions" },
                    },
                },
            },
            {
                path: "/api/ai/quiz/generate",
                method: "POST",
                description: "Generate quiz questions on any topic",
                priceUsd: aiServiceConfig.quizGeneratePriceUsd.toString(),
                inputSchema: {
                    type: "object",
                    required: ["topic"],
                    properties: {
                        topic: { type: "string", description: "Quiz topic" },
                        numQuestions: { type: "number", minimum: 1, maximum: 20, default: 5 },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"], default: "medium" },
                        questionType: { type: "string", enum: ["multiple_choice", "true_false", "mixed"], default: "multiple_choice" },
                    },
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        questions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    question: { type: "string" },
                                    options: { type: "array", items: { type: "string" } },
                                    correctAnswer: { type: "string" },
                                    explanation: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        ];
    }

    /**
     * Register vendor service with PerkOS-Stack facilitator
     */
    async register(request?: Partial<RegistrationRequest>): Promise<RegistrationResult> {
        try {
            const endpoints = this.buildEndpoints();

            const registrationPayload: RegistrationRequest = {
                url: request?.url || this.serviceUrl,
                name: request?.name || "PerkOS AI Vendor Service",
                description: request?.description || serviceDiscovery.description,
                category: request?.category || "ai",
                tags: request?.tags || ["ai", "gpt-4", "dall-e", "whisper", "tts", "nlp", "vision", "x402"],
                iconUrl: request?.iconUrl,
                websiteUrl: request?.websiteUrl || this.serviceUrl,
                docsUrl: request?.docsUrl || `${this.serviceUrl}/docs`,
                walletAddress: request?.walletAddress || x402Config.payTo,
                network: request?.network || x402Config.network,
                priceUsd: request?.priceUsd || x402Config.priceUsd,
                facilitatorUrl: request?.facilitatorUrl || this.facilitatorUrl,
                endpoints,
            };

            console.log(`🔗 Registering with Stack at ${this.facilitatorUrl}`);
            console.log(`   Service URL: ${registrationPayload.url}`);

            const response = await fetch(`${this.facilitatorUrl}/api/vendors/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(registrationPayload),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                const errorMessage = result.error || response.statusText || "Registration failed";

                if (errorMessage.toLowerCase().includes("already")) {
                    console.log("📋 Vendor already registered, updating...");

                    const status = await this.checkStatus();
                    if (status.registered && status.vendorId) {
                        const updateResponse = await fetch(
                            `${this.facilitatorUrl}/api/vendors/${status.vendorId}`,
                            {
                                method: "PATCH",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    name: registrationPayload.name,
                                    description: registrationPayload.description,
                                    category: registrationPayload.category,
                                    tags: registrationPayload.tags,
                                    icon_url: registrationPayload.iconUrl,
                                    website_url: registrationPayload.websiteUrl,
                                    docs_url: registrationPayload.docsUrl,
                                }),
                            }
                        );

                        if (updateResponse.ok) {
                            return {
                                success: true,
                                vendor: { id: status.vendorId, name: registrationPayload.name },
                                vendorId: status.vendorId,
                                alreadyRegistered: true,
                            };
                        }
                    }
                    return {
                        success: false,
                        error: errorMessage,
                        alreadyRegistered: true,
                    };
                }
                return {
                    success: false,
                    error: errorMessage,
                    alreadyRegistered: false,
                };
            }

            console.log("✅ Successfully registered with Stack!");
            return {
                success: true,
                vendor: result.vendor,
                vendorId: result.vendor?.id,
            };
        } catch (error) {
            console.error("❌ Registration error:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Registration failed",
            };
        }
    }

    /**
     * Check registration status with facilitator
     */
    async checkStatus(): Promise<RegistrationStatus> {
        try {
            const response = await fetch(`${this.facilitatorUrl}/api/vendors`);

            if (!response.ok) {
                return {
                    registered: false,
                    facilitatorUrl: this.facilitatorUrl,
                    error: `Failed to check status: ${response.statusText}`,
                    lastChecked: new Date().toISOString(),
                };
            }

            const data = await response.json();
            const vendors = data.vendors || (Array.isArray(data) ? data : []);
            const ourVendor = Array.isArray(vendors)
                ? vendors.find((v: any) => {
                    const vendorUrl = v.url || "";
                    const serviceUrlObj = new URL(this.serviceUrl);
                    return (
                        vendorUrl === this.serviceUrl ||
                        vendorUrl.replace(/\/$/, "") === this.serviceUrl.replace(/\/$/, "") ||
                        vendorUrl.includes(serviceUrlObj.hostname)
                    );
                })
                : null;

            if (ourVendor) {
                return {
                    registered: true,
                    vendorId: ourVendor.id,
                    vendorName: ourVendor.name,
                    facilitatorUrl: this.facilitatorUrl,
                    lastChecked: new Date().toISOString(),
                };
            }

            return {
                registered: false,
                facilitatorUrl: this.facilitatorUrl,
                lastChecked: new Date().toISOString(),
            };
        } catch (error) {
            return {
                registered: false,
                facilitatorUrl: this.facilitatorUrl,
                error: error instanceof Error ? error.message : "Failed to check status",
                lastChecked: new Date().toISOString(),
            };
        }
    }

    async checkFacilitatorHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${this.facilitatorUrl}/api/v2/x402/health`, {
                method: "GET",
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

export const registrationService = new RegistrationService();
