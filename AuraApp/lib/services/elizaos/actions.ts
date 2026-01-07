/**
 * elizaOS Actions for AI Service
 * These actions enable the agent to trigger AI operations through conversation
 * 
 * Reference: https://docs.elizaos.ai/plugins/development
 */

import { aiServiceConfig } from "@/lib/config/x402";

/**
 * Note: Using 'as any' cast for actions to bypass strict elizaOS typing.
 * The actions work correctly but the Handler type expects void return,
 * while our implementation uses callbacks for responses.
 */

/**
 * Generate Image Action
 * Triggers when user wants to create an image
 */
export const generateImageAction = {
    name: "GENERATE_IMAGE",
    similes: ["CREATE_IMAGE", "MAKE_IMAGE", "DRAW_IMAGE"],
    description: "Generate an image from a text prompt using DALL-E 3",
    validate: async (runtime: any, message: any) => {
        const text = message.content?.text?.toLowerCase() || "";
        const keywords = ["generate", "create", "make", "draw", "image", "picture", "art"];
        return keywords.some(keyword => text.includes(keyword));
    },
    handler: async (runtime: any, message: any, state: any, options: any, callback: any) => {
        try {
            const text = message.content?.text || "";

            let prompt = text;
            prompt = prompt.replace(/(generate|create|make|draw)\s+(an?)?\s+(image|picture|art)\s+(of|showing)?\s*/gi, "");

            if (!prompt || prompt.length < 3) {
                if (callback) {
                    callback({
                        text: "I need a description of what image you'd like me to generate. For example: 'Generate an image of a futuristic city at sunset'",
                    });
                }
                return;
            }

            const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const paymentRequest = {
                paymentId,
                endpoint: "/api/ai/generate",
                method: "POST",
                price: `$${aiServiceConfig.generatePriceUsd}`,
                network: process.env.NEXT_PUBLIC_NETWORK || "avalanche",
                payTo: process.env.NEXT_PUBLIC_PAY_TO_ADDRESS || "",
                facilitator: process.env.NEXT_PUBLIC_FACILITATOR_URL || "https://stack.perkos.xyz",
                description: "Generate AI image with DALL-E 3",
                requestData: { prompt },
            };

            if (callback) {
                callback({
                    text: `I can generate that image for you! This will cost ${paymentRequest.price} (paid via x402).\n\nPrompt: "${prompt}"\n\nPlease sign the payment below to proceed:\n\n\`\`\`json\n${JSON.stringify({ paymentRequest }, null, 2)}\n\`\`\``,
                });
            }
        } catch (error) {
            console.error("Generate image action error:", error);
            if (callback) {
                callback({
                    text: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }
    },
    examples: [],
} as any;

/**
 * Analyze Image Action
 */
export const analyzeImageAction = {
    name: "ANALYZE_IMAGE",
    similes: ["DESCRIBE_IMAGE", "EXAMINE_IMAGE", "LOOK_AT_IMAGE"],
    description: "Analyze an image using GPT-4o vision",
    validate: async (runtime: any, message: any) => {
        const text = message.content?.text?.toLowerCase() || "";
        const keywords = ["analyze", "describe", "examine", "look at", "what is in", "what's in"];
        return keywords.some(keyword => text.includes(keyword)) && text.includes("image");
    },
    handler: async (runtime: any, message: any, state: any, options: any, callback: any) => {
        try {
            if (callback) {
                callback({
                    text: "To analyze an image, please upload it first. Once uploaded, I can analyze it using GPT-4o vision for $0.05 (x402 payment).",
                });
            }
        } catch (error) {
            console.error("Analyze image action error:", error);
        }
    },
    examples: [],
} as any;

/**
 * Synthesize Speech Action
 */
export const synthesizeSpeechAction = {
    name: "SYNTHESIZE_SPEECH",
    similes: ["TEXT_TO_SPEECH", "SPEAK_TEXT", "READ_ALOUD"],
    description: "Convert text to speech using TTS-1",
    validate: async (runtime: any, message: any) => {
        const text = message.content?.text?.toLowerCase() || "";
        const keywords = ["speak", "say", "read aloud", "text to speech", "tts", "synthesize"];
        return keywords.some(keyword => text.includes(keyword));
    },
    handler: async (runtime: any, message: any, state: any, options: any, callback: any) => {
        try {
            const text = message.content?.text || "";

            let textToSpeak = text;
            textToSpeak = textToSpeak.replace(/(speak|say|read aloud)\s*/gi, "");

            if (!textToSpeak || textToSpeak.length < 3) {
                if (callback) {
                    callback({
                        text: "What text would you like me to convert to speech?",
                    });
                }
                return;
            }

            const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const paymentRequest = {
                paymentId,
                endpoint: "/api/ai/synthesize",
                method: "POST",
                price: `$${aiServiceConfig.synthesizePriceUsd}`,
                network: process.env.NEXT_PUBLIC_NETWORK || "avalanche",
                payTo: process.env.NEXT_PUBLIC_PAY_TO_ADDRESS || "",
                facilitator: process.env.NEXT_PUBLIC_FACILITATOR_URL || "https://stack.perkos.xyz",
                description: "Synthesize speech with TTS-1",
                requestData: { text: textToSpeak, voice: "alloy" },
            };

            if (callback) {
                callback({
                    text: `I can convert that to speech for ${paymentRequest.price}.\n\nText: "${textToSpeak}"\n\nPlease sign the payment below:\n\n\`\`\`json\n${JSON.stringify({ paymentRequest }, null, 2)}\n\`\`\``,
                });
            }
        } catch (error) {
            console.error("Synthesize speech action error:", error);
        }
    },
    examples: [],
} as any;

/**
 * Process Payment Action
 */
export const processPaymentAction = {
    name: "PROCESS_PAYMENT",
    similes: ["EXECUTE_SERVICE", "CALL_API"],
    description: "Process a signed payment and call the AI endpoint",
    validate: async (runtime: any, message: any) => {
        const text = message.content?.text?.toLowerCase() || "";
        return text.includes("payment signed") && text.includes("payment id:");
    },
    handler: async (runtime: any, message: any, state: any, options: any, callback: any) => {
        try {
            const text = message.content?.text || "";
            const match = text.match(/Payment ID:\s*(\S+)/i);

            if (!match) {
                if (callback) {
                    callback({ text: "Could not find payment ID in message." });
                }
                return;
            }

            const paymentId = match[1];

            if (callback) {
                callback({
                    text: `Payment received! Processing your AI request...\n\n(Note: Full implementation would call the AI endpoint with the signed envelope and return results)`,
                });
            }
        } catch (error) {
            console.error("Process payment action error:", error);
        }
    },
    examples: [],
} as any;

// Export all actions
export const aiActions = [
    generateImageAction,
    analyzeImageAction,
    synthesizeSpeechAction,
    processPaymentAction,
];
