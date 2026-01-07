/**
 * GET /api/docs/json
 * OpenAPI/Swagger JSON specification for AI Service
 */

import { NextResponse } from "next/server";
import { x402Config, aiServiceConfig, serviceDiscovery } from "@/lib/config/x402";

export const dynamic = "force-dynamic";

export async function GET() {
  const spec = {
    openapi: "3.0.0",
    info: {
      title: serviceDiscovery.service,
      version: serviceDiscovery.version || "1.0.0",
      description: serviceDiscovery.description,
      contact: {
        name: "PerkOS AI Vendor Service",
        url: process.env.NEXT_PUBLIC_SERVICE_URL || "https://your-api.com",
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_SERVICE_URL || "http://localhost:3000",
        description: "API Server",
      },
    ],
    paths: {
      "/api/ai/analyze": {
        post: {
          summary: "Analyze Image (GPT-4o)",
          description: `Analyze image contents using GPT-4o vision. **Requires x402 payment ($${aiServiceConfig.analyzePriceUsd})**`,
          tags: ["AI Services"],
          security: [{ x402Payment: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["image"],
                  properties: {
                    image: {
                      type: "string",
                      description: "Base64 encoded image",
                      example: "data:image/png;base64,iVBORw0KGgoAAAANS...",
                    },
                    question: {
                      type: "string",
                      description: "Optional question about the image",
                      example: "What objects are in this image?",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Analysis successful",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      data: {
                        type: "object",
                        properties: {
                          analysis: {
                            type: "string",
                            example: "The image shows a sunset over mountains...",
                          },
                        },
                      },
                    },
                  },
                },
              },
              headers: {
                "PAYMENT-RESPONSE": {
                  description: "x402 v2 payment confirmation (base64 encoded JSON)",
                  schema: { type: "string" },
                },
              },
            },
            "402": {
              description: "Payment Required",
              headers: {
                "PAYMENT-REQUIRED": {
                  description: "x402 v2 payment requirements (base64 encoded JSON)",
                  schema: { type: "string" },
                },
              },
            },
          },
        },
      },
      "/api/ai/generate": {
        post: {
          summary: "Generate Image (DALL-E 3)",
          description: `Generate an image from a text prompt using DALL-E 3. **Requires x402 payment ($${aiServiceConfig.generatePriceUsd})**`,
          tags: ["AI Services"],
          security: [{ x402Payment: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["prompt"],
                  properties: {
                    prompt: {
                      type: "string",
                      description: "Image generation prompt",
                      example: "A futuristic city at sunset with flying cars",
                    },
                    size: {
                      type: "string",
                      description: "Image size",
                      default: "1024x1024",
                      enum: ["1024x1024"],
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Image generated successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          url: { type: "string" },
                          base64: { type: "string" },
                          revisedPrompt: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
              headers: {
                "PAYMENT-RESPONSE": {
                  description: "x402 payment confirmation",
                  schema: { type: "string" },
                },
              },
            },
            "402": {
              description: "Payment Required",
              headers: {
                "PAYMENT-REQUIRED": {
                  description: "x402 payment requirements",
                  schema: { type: "string" },
                },
              },
            },
          },
        },
      },
      "/api/ai/transcribe": {
        post: {
          summary: "Transcribe Audio (Whisper)",
          description: `Transcribe audio file using Whisper. **Requires x402 payment ($${aiServiceConfig.transcribePriceUsd})**`,
          tags: ["AI Services"],
          security: [{ x402Payment: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["file"],
                  properties: {
                    file: {
                      type: "string",
                      format: "binary",
                      description: "Audio file to transcribe",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Transcription successful",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          transcription: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "402": { description: "Payment Required" },
          },
        },
      },
      "/api/ai/synthesize": {
        post: {
          summary: "Synthesize Speech (TTS-1)",
          description: `Convert text to speech using TTS-1. **Requires x402 payment ($${aiServiceConfig.synthesizePriceUsd})**`,
          tags: ["AI Services"],
          security: [{ x402Payment: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["text"],
                  properties: {
                    text: {
                      type: "string",
                      description: "Text to convert to speech",
                      example: "Hello, this is a test of text to speech.",
                    },
                    voice: {
                      type: "string",
                      description: "Voice to use",
                      default: "alloy",
                      enum: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Audio file generated",
              content: {
                "audio/mpeg": {
                  schema: {
                    type: "string",
                    format: "binary",
                  },
                },
              },
            },
            "402": { description: "Payment Required" },
          },
        },
      },
      "/api/health": {
        get: {
          summary: "Health Check",
          description: "Check service health and configuration",
          tags: ["Utilities"],
          responses: {
            "200": {
              description: "Service is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "healthy" },
                      service: { type: "string" },
                      version: { type: "string" },
                      timestamp: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        x402Payment: {
          type: "apiKey",
          in: "header",
          name: "PAYMENT-SIGNATURE",
          description: `x402 v2 payment envelope (base64 encoded). Sign payments via stack.perkos.xyz`,
        },
      },
    },
    tags: [
      {
        name: "AI Services",
        description: `AI operations powered by OpenAI (GPT-4o, DALL-E 3, Whisper, TTS-1). All endpoints require x402 micropayments.`,
      },
      {
        name: "Utilities",
        description: "Service utilities and health checks",
      },
    ],
  };

  return NextResponse.json(spec);
}
