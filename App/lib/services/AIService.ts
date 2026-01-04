import OpenAI from "openai";
import Replicate from "replicate";
import fs from "fs";

export class AIService {
  private openai: OpenAI;
  private openrouter: OpenAI;
  private replicate: Replicate | null = null;
  private useOpenRouter: boolean;
  private useReplicate: boolean;

  // Configurable model names via environment variables
  private imageModel: string;
  private ttsModel: string;
  private whisperModel: string;
  private moderationModel: string;

  constructor() {
    // OpenRouter for chat completions (preferred - better model access)
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const replicateToken = process.env.REPLICATE_API_TOKEN;

    this.useOpenRouter = !!openrouterKey;
    this.useReplicate = !!replicateToken;

    // Model configuration with environment variable overrides
    this.imageModel = process.env.OPENAI_IMAGE_MODEL || "dall-e-3";
    this.ttsModel = process.env.OPENAI_TTS_MODEL || "tts-1";
    this.whisperModel = process.env.OPENAI_WHISPER_MODEL || "whisper-1";
    this.moderationModel = process.env.OPENAI_MODERATION_MODEL || "omni-moderation-latest";

    if (openrouterKey) {
      this.openrouter = new OpenAI({
        apiKey: openrouterKey,
        baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": process.env.OPENROUTER_REFERER || "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_TITLE || "PerkOS AI Service",
        },
      });
    } else {
      // Fallback: create dummy client (will error if used)
      this.openrouter = new OpenAI({ apiKey: "dummy" });
    }

    // Replicate for image generation fallback
    if (replicateToken) {
      this.replicate = new Replicate({ auth: replicateToken });
    }

    // OpenAI for image generation, audio transcription, and speech synthesis
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    } else if (!openrouterKey) {
      throw new Error("Either OPENROUTER_API_KEY or OPENAI_API_KEY must be set");
    } else {
      // Fallback: create dummy client (will error if image/audio features used)
      this.openai = new OpenAI({ apiKey: "dummy" });
    }
  }

  // Helper to get the appropriate client for chat completions
  private getChatClient(): OpenAI {
    return this.useOpenRouter ? this.openrouter : this.openai;
  }

  // Helper to get chat model name (OpenRouter uses different naming)
  private getChatModel(): string {
    return this.useOpenRouter ? "openai/gpt-4o" : "gpt-4o";
  }

  // [EXISTING METHODS: analyzeImage, generateImage, transcribeAudio, synthesizeSpeech remain unchanged]

  async analyzeImage(imageInput: string, question: string = "What is in this image?"): Promise<string> {
    try {
      let url = imageInput;
      // If it's not a URL and not a data URI, assume it's base64
      if (!imageInput.startsWith("http") && !imageInput.startsWith("data:")) {
        url = `data:image/jpeg;base64,${imageInput}`;
      }

      console.log("[AIService.analyzeImage] Sending to API:", {
        model: this.getChatModel(),
        urlType: url.startsWith("http") ? "url" : url.startsWith("data:") ? "data-uri" : "unknown",
        urlPreview: url.substring(0, 80),
        question,
      });

      const response = await this.getChatClient().chat.completions.create({
        model: this.getChatModel(),
        messages: [{ role: "user", content: [{ type: "text", text: question }, { type: "image_url", image_url: { url } }] }],
      });

      console.log("[AIService.analyzeImage] Response received:", {
        contentLength: response.choices[0]?.message?.content?.length,
        contentPreview: response.choices[0]?.message?.content?.substring(0, 100),
      });

      return response.choices[0].message.content || "Unable to analyze the image";
    } catch (error) {
      console.error("Image analysis error:", error);
      throw error;
    }
  }

  async generateImage(prompt: string, size: "1024x1024" = "1024x1024"): Promise<{ url?: string; base64?: string; revisedPrompt?: string }> {
    // Try OpenAI DALL-E first
    try {
      const response = await this.openai.images.generate({
        model: this.imageModel,
        prompt, n: 1, size, response_format: "b64_json",
      });
      if (!response.data || response.data.length === 0) throw new Error("No image generated");
      const image = response.data[0];
      return { base64: image.b64_json, revisedPrompt: image.revised_prompt };
    } catch (error: any) {
      // Check if this is an access/permission error and we have Replicate as fallback
      if ((error?.status === 403 || error?.message?.includes("does not have access")) && this.useReplicate && this.replicate) {
        console.log("OpenAI DALL-E not available, falling back to Replicate FLUX...");
        return this.generateImageWithReplicate(prompt, size);
      }
      console.error("Image generation error:", error);
      throw error;
    }
  }

  private async generateImageWithReplicate(prompt: string, size: "1024x1024" = "1024x1024"): Promise<{ url?: string; base64?: string; revisedPrompt?: string }> {
    if (!this.replicate) {
      throw new Error("Replicate client not initialized");
    }

    try {
      // Parse size for aspect ratio
      const [width, height] = size.split("x").map(Number);
      const aspectRatio = width === height ? "1:1" : width > height ? "16:9" : "9:16";

      // Use FLUX schnell model (fast, high-quality)
      const output = await this.replicate.run(
        "black-forest-labs/flux-schnell",
        {
          input: {
            prompt: prompt,
            aspect_ratio: aspectRatio,
            output_format: "png",
            output_quality: 90,
          }
        }
      ) as string[];

      if (!output || output.length === 0) {
        throw new Error("No image generated by Replicate");
      }

      // Replicate returns URLs, fetch and convert to base64
      const imageUrl = output[0];
      const imageResponse = await fetch(imageUrl);
      const arrayBuffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      return {
        base64,
        url: imageUrl,
        revisedPrompt: prompt // Replicate doesn't revise prompts like DALL-E
      };
    } catch (error) {
      console.error("Replicate image generation error:", error);
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async transcribeAudio(audioInput: File | Blob | string): Promise<string> {
    // Use Replicate only (OpenAI Whisper not available with project-scoped key)
    if (!this.replicate) {
      throw new Error("Replicate API token required for audio transcription");
    }
    return this.transcribeWithReplicate(audioInput);
  }

  private async transcribeWithReplicate(audioInput: File | Blob | string): Promise<string> {
    if (!this.replicate) {
      throw new Error("Replicate client not initialized");
    }

    try {
      let dataUri: string;

      if (typeof audioInput === "string") {
        // If it's a URL, fetch it and convert to base64
        if (audioInput.startsWith("http")) {
          const response = await fetch(audioInput);
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          const mimeType = response.headers.get("content-type") || "audio/mpeg";
          dataUri = `data:${mimeType};base64,${base64}`;
        } else if (audioInput.startsWith("data:")) {
          dataUri = audioInput;
        } else {
          throw new Error("Invalid string input for transcription (must be URL or data URI)");
        }
      } else {
        // Convert File/Blob to base64 data URI
        const arrayBuffer = await audioInput.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = audioInput.type || "audio/mpeg";
        dataUri = `data:${mimeType};base64,${base64}`;
      }

      // Use Whisper model on Replicate
      const output = await this.replicate.run(
        "openai/whisper:4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2",
        {
          input: {
            audio: dataUri,
            model: "large-v3",
            language: "en",
            translate: false,
          }
        }
      ) as { transcription: string };

      return output.transcription || "";
    } catch (error) {
      console.error("Replicate transcription error:", error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async synthesizeSpeech(text: string, voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy"): Promise<Buffer> {
    // Use Replicate only (OpenAI TTS not available with project-scoped key)
    if (!this.replicate) {
      throw new Error("Replicate API token required for speech synthesis");
    }
    return this.synthesizeWithReplicate(text);
  }

  private async synthesizeWithReplicate(text: string): Promise<Buffer> {
    if (!this.replicate) {
      throw new Error("Replicate client not initialized");
    }

    try {
      // Use minimax/speech-02-turbo for low latency TTS
      // Valid voice_ids: Wise_Woman, Friendly_Person, Inspirational_girl, Deep_Voice_Man,
      // Calm_Woman, Casual_Guy, Lively_Girl, Patient_Man, Young_Knight, Determined_Man,
      // Lovely_Girl, Decent_Boy, Imposing_Manner, Elegant_Man, Abbess, Sweet_Girl_2, Exuberant_Girl
      const output = await this.replicate.run(
        "minimax/speech-02-turbo",
        {
          input: {
            text: text,
            voice_id: "Friendly_Person",
          }
        }
      ) as unknown as string;

      if (!output) {
        throw new Error("No audio generated by Replicate");
      }

      // Replicate returns a URL to the audio file
      const audioResponse = await fetch(output);
      const arrayBuffer = await audioResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error("Replicate TTS error:", error);
      throw new Error(`Speech synthesis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  // [BATCH 1: NLP Services]
  async summarizeText(text: string, length: "short" | "medium" | "long" = "medium"): Promise<string> {
    const lengthInstructions = { short: "in 2-3 sentences", medium: "in 1-2 paragraphs", long: "in 3-4 paragraphs with key points" };
    const response = await this.getChatClient().chat.completions.create({
      model: this.getChatModel(),
      messages: [
        { role: "system", content: "You are a professional summarization assistant. Provide clear, accurate summaries that capture the main ideas." },
        { role: "user", content: `Summarize the following text ${lengthInstructions[length]}:\n\n${text}` }
      ],
      temperature: 0.3,
    });
    return response.choices[0].message.content || "Unable to generate summary";
  }

  async translateText(text: string, sourceLang: string, targetLang: string): Promise<{ translation: string; confidence: number }> {
    const response = await this.getChatClient().chat.completions.create({
      model: this.getChatModel(),
      messages: [
        { role: "system", content: `You are a professional translator. Translate accurately from ${sourceLang} to ${targetLang}. Maintain the tone and style of the original text.` },
        { role: "user", content: text }
      ],
      temperature: 0.2,
    });
    return { translation: response.choices[0].message.content || "Translation unavailable", confidence: 0.95 };
  }

  async analyzeSentiment(text: string): Promise<{ sentiment: "positive" | "negative" | "neutral"; score: number; emotions: string[] }> {
    const response = await this.getChatClient().chat.completions.create({
      model: this.getChatModel(),
      messages: [
        { role: "system", content: 'You are a sentiment analysis expert. Analyze the sentiment of the text and respond ONLY with valid JSON in this exact format:\n{\n  "sentiment": "positive" | "negative" | "neutral",\n  "score": 0.0-1.0,\n  "emotions": ["emotion1", "emotion2"]\n}' },
        { role: "user", content: text }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return { sentiment: result.sentiment || "neutral", score: result.score || 0.5, emotions: result.emotions || [] };
  }

  async moderateContent(content: string): Promise<{ flagged: boolean; categories: Record<string, boolean>; categoryScores: Record<string, number>; reasoning?: string }> {
    // Try OpenAI Moderation API first, fall back to LLM-based moderation
    try {
      const moderation = await this.openai.moderations.create({ input: content, model: this.moderationModel });
      const result = moderation.results[0];
      let reasoning;
      if (result.flagged) {
        const reasoningResponse = await this.getChatClient().chat.completions.create({
          model: this.getChatModel(),
          messages: [
            { role: "system", content: "You are a content moderation expert. Briefly explain why this content was flagged." },
            { role: "user", content: `Content: ${content}\n\nFlagged categories: ${Object.entries(result.categories).filter(([, v]) => v).map(([k]) => k).join(", ")}` }
          ],
          temperature: 0.3,
          max_tokens: 100
        });
        reasoning = reasoningResponse.choices[0].message.content || undefined;
      }
      return {
        flagged: result.flagged,
        categories: result.categories as unknown as Record<string, boolean>,
        categoryScores: result.category_scores as unknown as Record<string, number>,
        reasoning
      };
    } catch (moderationError) {
      // Fallback: Use LLM for content moderation
      console.log("OpenAI Moderation API not available, using LLM-based moderation...");
      const response = await this.getChatClient().chat.completions.create({
        model: this.getChatModel(),
        messages: [
          {
            role: "system",
            content: `You are a content moderation expert. Analyze the content for potential policy violations.
Respond ONLY with valid JSON in this exact format:
{
  "flagged": true/false,
  "categories": {
    "hate": false,
    "hate/threatening": false,
    "harassment": false,
    "harassment/threatening": false,
    "self-harm": false,
    "self-harm/intent": false,
    "self-harm/instructions": false,
    "sexual": false,
    "sexual/minors": false,
    "violence": false,
    "violence/graphic": false
  },
  "categoryScores": {
    "hate": 0.0,
    "harassment": 0.0,
    "sexual": 0.0,
    "violence": 0.0
  },
  "reasoning": "Brief explanation if flagged, or null if safe"
}`
          },
          { role: "user", content: `Analyze this content for moderation:\n\n${content}` }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });
      const result = JSON.parse(response.choices[0].message.content || '{"flagged":false,"categories":{},"categoryScores":{}}');
      return {
        flagged: result.flagged || false,
        categories: result.categories || {},
        categoryScores: result.categoryScores || {},
        reasoning: result.reasoning || undefined
      };
    }
  }

  // [BATCH 2: More NLP + Business]
  async simplifyText(text: string, readingLevel: "elementary" | "middle" | "high" = "middle"): Promise<string> {
    const levelInstructions = {
      elementary: "5th grade reading level (simple words, short sentences)",
      middle: "8th grade reading level (clear and accessible)",
      high: "high school reading level (moderately complex)"
    };
    const response = await this.getChatClient().chat.completions.create({
      model: this.getChatModel(),
      messages: [
        { role: "system", content: `You are an expert at making complex text accessible. Rewrite text at a ${levelInstructions[readingLevel]}.` },
        { role: "user", content: text }
      ],
      temperature: 0.3,
    });
    return response.choices[0].message.content || "Unable to simplify text";
  }

  async extractEntities(text: string): Promise<{ entities: Array<{ text: string; type: string; position: number }> }> {
    const response = await this.getChatClient().chat.completions.create({
      model: this.getChatModel(),
      messages: [
        { role: "system", content: 'You are a named entity recognition expert. Extract entities (names, organizations, locations, dates, etc.) and respond ONLY with valid JSON:\n{\n  "entities": [{"text": "entity text", "type": "PERSON|ORG|LOCATION|DATE|etc", "position": 0}]\n}' },
        { role: "user", content: text }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || '{"entities":[]}');
    return result;
  }

  async generateEmail(purpose: string, tone: "formal" | "casual" | "friendly" = "formal", keyPoints: string[]): Promise<{ subject: string; body: string }> {
    const response = await this.getChatClient().chat.completions.create({
      model: this.getChatModel(),
      messages: [
        { role: "system", content: `You are a professional email writer. Generate emails with a ${tone} tone. Respond ONLY with valid JSON:\n{\n  "subject": "email subject",\n  "body": "email body"\n}` },
        { role: "user", content: `Purpose: ${purpose}\nKey points:\n${keyPoints.map(p => `- ${p}`).join('\n')}` }
      ],
      temperature: 0.4,
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || '{"subject":"","body":""}');
    return result;
  }

  async generateProductDescription(productName: string, features: string[], targetAudience?: string): Promise<string> {
    const audienceText = targetAudience ? `\nTarget audience: ${targetAudience}` : '';
    const response = await this.getChatClient().chat.completions.create({
      model: this.getChatModel(),
      messages: [
        { role: "system", content: "You are an expert e-commerce copywriter. Create compelling, SEO-optimized product descriptions that drive sales." },
        { role: "user", content: `Product: ${productName}\nFeatures:\n${features.map(f => `- ${f}`).join('\n')}${audienceText}\n\nWrite a compelling product description.` }
      ],
      temperature: 0.5,
    });
    return response.choices[0].message.content || "Unable to generate description";
  }

  // [BATCH 3: Developer Tools]
  async generateCode(description: string, language: string, framework?: string): Promise<{ code: string; explanation: string }> {
    const frameworkText = framework ? ` using ${framework}` : '';
    const response = await this.getChatClient().chat.completions.create({
      model: this.getChatModel(),
      messages: [
        { role: "system", content: `You are an expert ${language} developer. Generate clean, well-documented code. Respond ONLY with valid JSON:\n{\n  "code": "code here",\n  "explanation": "brief explanation"\n}` },
        { role: "user", content: `Generate ${language} code${frameworkText}: ${description}` }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || '{"code":"","explanation":""}');
    return result;
  }

  async reviewCode(code: string, language: string): Promise<{ issues: string[]; suggestions: string[]; securityConcerns: string[] }> {
    const response = await this.getChatClient().chat.completions.create({
      model: this.getChatModel(),
      messages: [
        { role: "system", content: `You are a code review expert. Analyze ${language} code for quality, bugs, and security. Respond ONLY with valid JSON:\n{\n  "issues": ["issue1"],\n  "suggestions": ["suggestion1"],\n  "securityConcerns": ["concern1"]\n}` },
        { role: "user", content: code }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || '{"issues":[],"suggestions":[],"securityConcerns":[]}');
    return result;
  }

  async generateSQLQuery(schema: string, naturalLanguageQuery: string): Promise<{ query: string; explanation: string }> {
    const response = await this.getChatClient().chat.completions.create({
      model: this.getChatModel(),
      messages: [
        { role: "system", content: 'You are a SQL expert. Generate safe SQL queries. Respond ONLY with valid JSON:\n{\n  "query": "SELECT ...",\n  "explanation": "explanation"\n}' },
        { role: "user", content: `Schema:\n${schema}\n\nGenerate SQL for: ${naturalLanguageQuery}` }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || '{"query":"","explanation":""}');
    return result;
  }

  async generateRegex(description: string): Promise<{ pattern: string; explanation: string; examples: string[] }> {
    const response = await this.getChatClient().chat.completions.create({
      model: this.getChatModel(),
      messages: [
        { role: "system", content: 'You are a regex expert. Generate regex patterns. Respond ONLY with valid JSON:\n{\n  "pattern": "regex pattern",\n  "explanation": "what it matches",\n  "examples": ["example1"]\n}' },
        { role: "user", content: description }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || '{"pattern":"","explanation":"","examples":[]}');
    return result;
  }

  // [BATCH 4: Advanced]
  async optimizeSEO(content: string, keywords: string[]): Promise<{ optimizedContent: string; analysis: string }> {
    const response = await this.getChatClient().chat.completions.create({
      model: this.getChatModel(),
      messages: [
        { role: "system", content: 'You are an SEO expert. Optimize content for search engines. Respond ONLY with valid JSON:\n{\n  "optimizedContent": "optimized text",\n  "analysis": "what was changed and why"\n}' },
        { role: "user", content: `Content:\n${content}\n\nTarget keywords: ${keywords.join(', ')}\n\nOptimize for SEO.` }
      ],
      temperature: 0.4,
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || '{"optimizedContent":"","analysis":""}');
    return result;
  }

  async generateAPIDocs(code: string, framework: string): Promise<{ documentation: string; openapi?: string }> {
    const response = await this.getChatClient().chat.completions.create({
      model: this.getChatModel(),
      messages: [
        { role: "system", content: `You are an API documentation expert. Generate comprehensive docs for ${framework}. Respond ONLY with valid JSON:\n{\n  "documentation": "markdown docs",\n  "openapi": "optional openapi spec"\n}` },
        { role: "user", content: code }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || '{"documentation":""}');
    return result;
  }

  async extractTextOCR(image: string): Promise<{ text: string; confidence: number }> {
    try {
      const url = image.startsWith("data:image") ? image : `data:image/jpeg;base64,${image}`;
      const response = await this.getChatClient().chat.completions.create({
        model: this.getChatModel(),
        messages: [
          { role: "system", content: "You are an OCR expert. Extract ALL text from the image accurately. Return only the extracted text, preserving formatting where possible." },
          { role: "user", content: [{ type: "text", text: "Extract all text from this image:" }, { type: "image_url", image_url: { url } }] }
        ],
      });
      const text = response.choices[0].message.content || "";
      return { text, confidence: 0.95 };
    } catch (error) {
      console.error("OCR error:", error);
      throw error;
    }
  }

  async generateQuiz(topic: string, numQuestions: number = 5, difficulty: "easy" | "medium" | "hard" = "medium"): Promise<{ questions: Array<{ question: string; options: string[]; correctIndex: number; explanation: string }> }> {
    const response = await this.getChatClient().chat.completions.create({
      model: this.getChatModel(),
      messages: [
        { role: "system", content: `You are an educational quiz expert. Generate ${difficulty} difficulty quiz questions. Respond ONLY with valid JSON:\n{\n  "questions": [{\n    "question": "text",\n    "options": ["A", "B", "C", "D"],\n    "correctIndex": 0,\n    "explanation": "why it's correct"\n  }]\n}` },
        { role: "user", content: `Topic: ${topic}\nNumber of questions: ${numQuestions}` }
      ],
      temperature: 0.5,
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || '{"questions":[]}');
    return result;
  }
}

// Singleton instance
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}
