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
     */
    private buildEndpoints(): RegistrationRequest["endpoints"] {
        return [
            // Original 4 services
            {
                path: "/api/ai/analyze",
                method: "POST",
                description: "Analyze image contents using GPT-4o vision",
                priceUsd: aiServiceConfig.analyzePriceUsd.toString(),
            },
            {
                path: "/api/ai/generate",
                method: "POST",
                description: "Generate image from text prompt using DALL-E 3",
                priceUsd: aiServiceConfig.generatePriceUsd.toString(),
            },
            {
                path: "/api/ai/transcribe",
                method: "POST",
                description: "Transcribe audio to text using Whisper",
                priceUsd: aiServiceConfig.transcribePriceUsd.toString(),
            },
            {
                path: "/api/ai/synthesize",
                method: "POST",
                description: "Convert text to speech using OpenAI TTS",
                priceUsd: aiServiceConfig.synthesizePriceUsd.toString(),
            },
            // NLP Services (Batch 1)
            {
                path: "/api/ai/summarize",
                method: "POST",
                description: "Summarize text in short/medium/long format",
                priceUsd: aiServiceConfig.summarizePriceUsd.toString(),
            },
            {
                path: "/api/ai/translate",
                method: "POST",
                description: "Translate text between 50+ languages",
                priceUsd: aiServiceConfig.translatePriceUsd.toString(),
            },
            {
                path: "/api/ai/sentiment",
                method: "POST",
                description: "Analyze sentiment and emotions in text",
                priceUsd: aiServiceConfig.sentimentPriceUsd.toString(),
            },
            {
                path: "/api/ai/moderate",
                method: "POST",
                description: "Check content for safety violations",
                priceUsd: aiServiceConfig.moderatePriceUsd.toString(),
            },
            // NLP Services (Batch 2)
            {
                path: "/api/ai/simplify",
                method: "POST",
                description: "Simplify text to various reading levels",
                priceUsd: aiServiceConfig.simplifyPriceUsd.toString(),
            },
            {
                path: "/api/ai/extract",
                method: "POST",
                description: "Extract named entities (people, places, dates, etc)",
                priceUsd: aiServiceConfig.extractPriceUsd.toString(),
            },
            // Business Services
            {
                path: "/api/ai/email/generate",
                method: "POST",
                description: "Generate professional emails from key points",
                priceUsd: aiServiceConfig.emailGeneratePriceUsd.toString(),
            },
            {
                path: "/api/ai/product/describe",
                method: "POST",
                description: "Create compelling product descriptions",
                priceUsd: aiServiceConfig.productDescribePriceUsd.toString(),
            },
            {
                path: "/api/ai/seo/optimize",
                method: "POST",
                description: "Optimize content for search engines",
                priceUsd: aiServiceConfig.seoOptimizePriceUsd.toString(),
            },
            // Developer Tools
            {
                path: "/api/ai/code/generate",
                method: "POST",
                description: "Generate code from natural language description",
                priceUsd: aiServiceConfig.codeGeneratePriceUsd.toString(),
            },
            {
                path: "/api/ai/code/review",
                method: "POST",
                description: "Review code for bugs and security issues",
                priceUsd: aiServiceConfig.codeReviewPriceUsd.toString(),
            },
            {
                path: "/api/ai/sql/generate",
                method: "POST",
                description: "Generate SQL queries from natural language",
                priceUsd: aiServiceConfig.sqlGeneratePriceUsd.toString(),
            },
            {
                path: "/api/ai/regex/generate",
                method: "POST",
                description: "Generate regex patterns from descriptions",
                priceUsd: aiServiceConfig.regexGeneratePriceUsd.toString(),
            },
            {
                path: "/api/ai/docs/generate",
                method: "POST",
                description: "Generate API documentation from code",
                priceUsd: aiServiceConfig.docsGeneratePriceUsd.toString(),
            },
            // Advanced Services
            {
                path: "/api/ai/ocr",
                method: "POST",
                description: "Extract text from images (OCR)",
                priceUsd: aiServiceConfig.ocrPriceUsd.toString(),
            },
            {
                path: "/api/ai/quiz/generate",
                method: "POST",
                description: "Generate quiz questions on any topic",
                priceUsd: aiServiceConfig.quizGeneratePriceUsd.toString(),
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
