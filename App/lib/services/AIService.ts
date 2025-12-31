import OpenAI from "openai";
import fs from "fs";

export class AIService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set in environment variables");
    }
    this.openai = new OpenAI({ apiKey });
  }

  // [EXISTING METHODS: analyzeImage, generateImage, transcribeAudio, synthesizeSpeech remain unchanged]

  async analyzeImage(imageBase64: string, question: string = "What is in this image?"): Promise<string> {
    try {
      const url = imageBase64.startsWith("data:image") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: [{ type: "text", text: question }, { type: "image_url", image_url: { url } }] }],
      });
      return response.choices[0].message.content || "Unable to analyze the image";
    } catch (error) {
      console.error("Image analysis error:", error);
      throw error;
    }
  }

  async generateImage(prompt: string, size: "1024x1024" = "1024x1024"): Promise<{ url?: string; base64?: string; revisedPrompt?: string }> {
    try {
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt, n: 1, size, response_format: "b64_json",
      });
      if (!response.data || response.data.length === 0) throw new Error("No image generated");
      const image = response.data[0];
      return { base64: image.b64_json, revisedPrompt: image.revised_prompt };
    } catch (error) {
      console.error("Image generation error:", error);
      throw error;
    }
  }

  async transcribeAudio(audioFile: File | Blob): Promise<string> {
    try {
      const file = audioFile instanceof File ? audioFile : new File([audioFile], "audio.mp3", { type: "audio/mpeg" });
      const response = await this.openai.audio.transcriptions.create({ file, model: "whisper-1" });
      return response.text;
    } catch (error) {
      console.error("Audio transcription error:", error);
      throw error;
    }
  }

  async synthesizeSpeech(text: string, voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy"): Promise<Buffer> {
    const mp3 = await this.openai.audio.speech.create({ model: "tts-1", voice, input: text });
    return Buffer.from(await mp3.arrayBuffer());
  }

  // [BATCH 1: NLP Services]
  async summarizeText(text: string, length: "short" | "medium" | "long" = "medium"): Promise<string> {
    const lengthInstructions = { short: "in 2-3 sentences", medium: "in 1-2 paragraphs", long: "in 3-4 paragraphs with key points" };
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a professional summarization assistant. Provide clear, accurate summaries that capture the main ideas." },
        { role: "user", content: `Summarize the following text ${lengthInstructions[length]}:\n\n${text}` }
      ],
      temperature: 0.3,
    });
    return response.choices[0].message.content || "Unable to generate summary";
  }

  async translateText(text: string, sourceLang: string, targetLang: string): Promise<{ translation: string; confidence: number }> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `You are a professional translator. Translate accurately from ${sourceLang} to ${targetLang}. Maintain the tone and style of the original text.` },
        { role: "user", content: text }
      ],
      temperature: 0.2,
    });
    return { translation: response.choices[0].message.content || "Translation unavailable", confidence: 0.95 };
  }

  async analyzeSentiment(text: string): Promise<{ sentiment: "positive" | "negative" | "neutral"; score: number; emotions: string[] }> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
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
    const moderation = await this.openai.moderations.create({ input: content });
    const result = moderation.results[0];
    let reasoning;
    if (result.flagged) {
      const reasoningResponse = await this.openai.chat.completions.create({
        model: "gpt-4o",
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
  }

  // [BATCH 2: More NLP + Business]
  async simplifyText(text: string, readingLevel: "elementary" | "middle" | "high" = "middle"): Promise<string> {
    const levelInstructions = {
      elementary: "5th grade reading level (simple words, short sentences)",
      middle: "8th grade reading level (clear and accessible)",
      high: "high school reading level (moderately complex)"
    };
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `You are an expert at making complex text accessible. Rewrite text at a ${levelInstructions[readingLevel]}.` },
        { role: "user", content: text }
      ],
      temperature: 0.3,
    });
    return response.choices[0].message.content || "Unable to simplify text";
  }

  async extractEntities(text: string): Promise<{ entities: Array<{ text: string; type: string; position: number }> }> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
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
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
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
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
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
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
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
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
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
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
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
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
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
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
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
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
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
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
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
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
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
