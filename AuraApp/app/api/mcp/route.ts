/**
 * POST /api/mcp
 * MCP (Model Context Protocol) server endpoint for elizaOS agent
 * Exposes AI operations as MCP tools
 */

import { NextRequest, NextResponse } from "next/server";
import { x402Config, aiServiceConfig } from "@/lib/config/x402";
import { getAIService } from "@/lib/services/AIService";

export const dynamic = "force-dynamic";

/**
 * MCP Server for elizaOS agent integration
 * Provides tools for AI operations via x402 paid endpoints
 */
class MCPServer {
    private userWalletAddress: string;

    constructor(userWalletAddress: string) {
        this.userWalletAddress = userWalletAddress.toLowerCase();
    }

    /**
     * List available MCP tools
     */
    listTools() {
        return [
            {
                name: "analyze_image",
                description:
                    `Analyze an image using AI (GPT-4o). Requires x402 payment ($${aiServiceConfig.analyzePriceUsd}).`,
                inputSchema: {
                    type: "object",
                    properties: {
                        image: {
                            type: "string",
                            description: "Base64 encoded image string",
                        },
                        question: {
                            type: "string",
                            description: "Optional question about the image",
                        },
                    },
                    required: ["image"],
                },
            },
            {
                name: "generate_image",
                description:
                    `Generate an image from a text prompt (DALL-E 3). Requires x402 payment ($${aiServiceConfig.generatePriceUsd}).`,
                inputSchema: {
                    type: "object",
                    properties: {
                        prompt: {
                            type: "string",
                            description: "Description of the image to generate",
                        },
                        size: {
                            type: "string",
                            description: "Image size (default: 1024x1024)",
                            enum: ["1024x1024"],
                        },
                    },
                    required: ["prompt"],
                },
            },
            {
                name: "transcribe_audio",
                description:
                    `Transcribe an audio file (Whisper). Requires x402 payment ($${aiServiceConfig.transcribePriceUsd}).`,
                inputSchema: {
                    type: "object",
                    properties: {
                        fileUrl: {
                            type: "string",
                            description: "URL or Base64 of the audio file", // Simplified for MCP text interface
                        },
                    },
                    required: ["fileUrl"],
                },
            },
            {
                name: "synthesize_speech",
                description:
                    `Convert text to speech (TTS-1). Requires x402 payment ($${aiServiceConfig.synthesizePriceUsd}).`,
                inputSchema: {
                    type: "object",
                    properties: {
                        text: {
                            type: "string",
                            description: "Text to speak",
                        },
                        voice: {
                            type: "string",
                            enum: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
                            default: "alloy",
                        },
                    },
                    required: ["text"],
                },
            },
        ];
    }

    /**
     * Call an MCP tool
     */
    async callTool(name: string, args: any) {
        try {
            const aiService = getAIService();

            switch (name) {
                case "analyze_image":
                    return await this.handleAnalyzeImage(aiService, args);

                case "generate_image":
                    return await this.handleGenerateImage(aiService, args);

                case "transcribe_audio":
                    // Note: Handling file uploads via MCP text interface is tricky. 
                    // Ideally expects a URL or base64. 
                    // For now return not implemented to avoid complexity without a file input strategy.
                    return {
                        content: [{ type: "text", text: "Audio transcription via MCP not yet fully supported (requires file handling)." }],
                        isError: true
                    }

                case "synthesize_speech":
                    return await this.handleSynthesizeSpeech(aiService, args);

                default:
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Unknown tool: ${name}`,
                            },
                        ],
                        isError: true,
                    };
            }
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    }

    private async handleAnalyzeImage(aiService: any, args: { image: string; question?: string }) {
        const result = await aiService.analyzeImage(args.image, args.question);
        return {
            content: [{ type: "text", text: result }],
        };
    }

    private async handleGenerateImage(aiService: any, args: { prompt: string; size?: "1024x1024" }) {
        const result = await aiService.generateImage(args.prompt, args.size || "1024x1024");
        return {
            content: [
                {
                    type: "text",
                    text: `Image generated successfully. \nRevised Prompt: ${result.revisedPrompt}\nURL: ${result.url || "N/A"}`
                },
                // We could verify if MCP client supports images here, but text URL is safer for now
            ],
        };
    }

    private async handleSynthesizeSpeech(aiService: any, args: { text: string; voice?: any }) {
        const buffer = await aiService.synthesizeSpeech(args.text, args.voice || "alloy");
        // Return base64 audio
        const base64Audio = buffer.toString("base64");
        return {
            content: [
                { type: "text", text: `Speech synthesized (${buffer.length} bytes). content-type: audio/mpeg` },
                { type: "text", text: `data:audio/mpeg;base64,${base64Audio}` }
            ]
        }
    }
}

/**
 * HTTP endpoint for MCP server
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const walletAddress = body.walletAddress || body.userWalletAddress;

        if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return NextResponse.json(
                { error: "walletAddress is required and must be a valid address" },
                { status: 400 }
            );
        }

        const mcpServer = new MCPServer(walletAddress);

        if (body.method === "tools/list") {
            return NextResponse.json({ tools: mcpServer.listTools() });
        } else if (body.method === "tools/call") {
            const { name, arguments: args } = body.params || {};
            const result = await mcpServer.callTool(name, args);
            return NextResponse.json(result);
        } else {
            return NextResponse.json(
                { error: "Unknown MCP method", supportedMethods: ["tools/list", "tools/call"] },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("MCP server error:", error);
        return NextResponse.json(
            { error: "MCP request failed", message: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/mcp
 * Get MCP server information
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return NextResponse.json(
            { error: "walletAddress is required" },
            { status: 400 }
        );
    }

    const mcpServer = new MCPServer(walletAddress);

    return NextResponse.json({
        name: "perkos-vendor-ai-mcp",
        version: "1.0.0",
        description: "MCP server for AI Service (Analysis, Generation, TTS)",
        tools: mcpServer.listTools().map((tool) => ({
            name: tool.name,
            description: tool.description,
            requiresPayment: true, // All AI tools are paid
            price: undefined, // Detailed in description
        })),
        facilitator: x402Config.facilitatorUrl,
        network: x402Config.network,
    });
}
