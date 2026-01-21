"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useActiveAccount } from "thirdweb/react";
import { PaymentButton, type AcceptOption } from "@perkos/ui-payment";
import { useThirdwebWallet } from "@perkos/ui-payment-thirdweb";
import { ServiceSelector, type ServiceSelection } from "./ServiceSelector";
import type { PaymentRequirements } from "@/lib/utils/x402-payment";

// Pending paid service action that needs x402 payment
interface PendingPaidService {
  selection: ServiceSelection;
  inputText: string;
  messageIndex: number;
}

// Helper to build request body for specific AI service endpoints
function buildServiceRequestBody(serviceId: string, text: string): Record<string, unknown> {
  switch (serviceId) {
    // Vision & Audio
    case "analyze_image":
      return { imageUrl: "", prompt: text }; // Image URL will be added separately
    case "generate_image":
      return { prompt: text };
    case "transcribe_audio":
      return { audioUrl: "" }; // Audio URL will be added separately
    case "synthesize_speech":
      return { text };

    // NLP Services
    case "summarize":
      return { text, length: "medium" };
    case "translate":
      // Try to extract target language from prompt, default to Spanish
      const langMatch = text.match(/(?:to|into)\s+(\w+)/i);
      // Try to extract source language from prompt (e.g., "from English to Spanish")
      const sourceLangMatch = text.match(/(?:from)\s+(\w+)/i);
      return {
        text,
        sourceLang: sourceLangMatch?.[1] || "English", // Default to English if not specified
        targetLang: langMatch?.[1] || "Spanish"
      };
    case "sentiment":
      return { text };
    case "moderate":
      return { text };
    case "simplify":
      return { text, level: "general" }; // Reading level: general, child, expert
    case "extract":
      return { text };

    // Business Tools
    case "email":
      return { keyPoints: text, tone: "professional" };
    case "product":
      return { productName: "Product", features: text };
    case "seo":
      // Extract keywords from the prompt if mentioned
      const keywordMatch = text.match(/keywords?\s*['":]?\s*['"](.*?)['"]/i);
      const keywords = keywordMatch
        ? keywordMatch[1].split(/[,;]\s*/).map(k => k.replace(/['"]|and\s*/gi, "").trim())
        : ["AI", "automation"];
      return { content: text, keywords };

    // Developer Tools
    case "code":
      return { prompt: text, language: "typescript" };
    case "code_review":
      return { code: text };
    case "sql":
      return { prompt: text, dialect: "postgresql" };
    case "regex":
      return { description: text };
    case "docs":
      return { code: text, format: "markdown" };

    // Advanced
    case "ocr":
      return { imageUrl: "" }; // Image URL will be added separately
    case "quiz":
      // Extract number of questions if mentioned, default to 5
      const numMatch = text.match(/(\d+)\s*(?:question|quiz)/i);
      return { topic: text, numQuestions: numMatch ? parseInt(numMatch[1]) : 5 };

    default:
      // Generic fallback - send text in multiple common field names
      return { text, content: text, prompt: text, input: text };
  }
}

// Helper to format paid service responses into readable text
function formatPaidServiceResponse(serviceId: string, data: any): string {
  // Handle nested data structure (some endpoints return { success, data: {...} })
  const result = data.data || data;

  switch (serviceId) {
    case "summarize":
      return result.summary || result.text || JSON.stringify(result);

    case "translate":
      const detected = data.detectedLanguage || result.detectedLanguage;
      const translation = data.translation || result.translation || result.text;
      return detected
        ? `**Translation** (detected: ${detected}):\n\n${translation}`
        : `**Translation:**\n\n${translation}`;

    case "sentiment":
      const sentiment = result.sentiment || result.label || "Unknown";
      const confidence = result.confidence || result.score;
      const emotions = result.emotions;
      let sentimentText = `**Sentiment Analysis:**\n\n• **Overall:** ${sentiment}`;
      if (confidence) sentimentText += ` (${(confidence * 100).toFixed(1)}% confidence)`;
      if (emotions && typeof emotions === "object") {
        sentimentText += "\n• **Emotions:**";
        for (const [emotion, score] of Object.entries(emotions)) {
          sentimentText += `\n  - ${emotion}: ${((score as number) * 100).toFixed(1)}%`;
        }
      }
      return sentimentText;

    case "moderate":
      const isSafe = result.safe ?? result.isSafe ?? !result.flagged;
      const categories = result.categories || result.flags;
      let moderationText = `**Content Moderation:**\n\n• **Status:** ${isSafe ? "✅ Safe" : "⚠️ Flagged"}`;
      if (categories && typeof categories === "object") {
        moderationText += "\n• **Categories:**";
        for (const [category, flagged] of Object.entries(categories)) {
          moderationText += `\n  - ${category}: ${flagged ? "⚠️ Flagged" : "✅ OK"}`;
        }
      }
      return moderationText;

    case "simplify":
      return `**Simplified Text:**\n\n${result.simplified || result.text || result.content || JSON.stringify(result)}`;

    case "extract":
      let extractText = "**Extracted Entities:**\n\n";
      const entities = result.entities || result;
      if (entities.people && Array.isArray(entities.people)) {
        extractText += `• **People:** ${entities.people.join(", ")}\n`;
      }
      if (entities.places && Array.isArray(entities.places)) {
        extractText += `• **Places:** ${entities.places.join(", ")}\n`;
      }
      if (entities.organizations && Array.isArray(entities.organizations)) {
        extractText += `• **Organizations:** ${entities.organizations.join(", ")}\n`;
      }
      if (entities.dates && Array.isArray(entities.dates)) {
        extractText += `• **Dates:** ${entities.dates.join(", ")}\n`;
      }
      if (entities.other && Array.isArray(entities.other)) {
        extractText += `• **Other:** ${entities.other.join(", ")}\n`;
      }
      return extractText.trim() || JSON.stringify(result);

    case "email":
      return `**Generated Email:**\n\n${result.email || result.content || result.text || JSON.stringify(result)}`;

    case "product":
      return `**Product Description:**\n\n${result.description || result.content || result.text || JSON.stringify(result)}`;

    case "seo":
      let seoText = "**SEO Optimization Results:**\n\n";
      if (result.title) seoText += `• **Optimized Title:** ${result.title}\n`;
      if (result.description) seoText += `• **Meta Description:** ${result.description}\n`;
      if (result.keywords && Array.isArray(result.keywords)) {
        seoText += `• **Keywords:** ${result.keywords.join(", ")}\n`;
      }
      if (result.suggestions && Array.isArray(result.suggestions)) {
        seoText += "\n**Suggestions:**\n";
        result.suggestions.forEach((s: string, i: number) => {
          seoText += `${i + 1}. ${s}\n`;
        });
      }
      return seoText.trim() || JSON.stringify(result);

    case "code":
      const language = result.language || "typescript";
      const code = result.code || result.content || result.text;
      return `**Generated Code (${language}):**\n\n\`\`\`${language}\n${code}\n\`\`\``;

    case "code_review":
      let reviewText = "**Code Review:**\n\n";
      if (result.issues && Array.isArray(result.issues)) {
        reviewText += "**Issues Found:**\n";
        result.issues.forEach((issue: any, i: number) => {
          reviewText += `${i + 1}. ${typeof issue === "string" ? issue : issue.description || JSON.stringify(issue)}\n`;
        });
      }
      if (result.suggestions && Array.isArray(result.suggestions)) {
        reviewText += "\n**Suggestions:**\n";
        result.suggestions.forEach((s: string, i: number) => {
          reviewText += `${i + 1}. ${s}\n`;
        });
      }
      if (result.summary) reviewText += `\n**Summary:** ${result.summary}`;
      return reviewText.trim() || result.review || JSON.stringify(result);

    case "sql":
      const sql = result.query || result.sql || result.code || result.text;
      return `**Generated SQL Query:**\n\n\`\`\`sql\n${sql}\n\`\`\``;

    case "regex":
      const pattern = result.pattern || result.regex || result.expression;
      const explanation = result.explanation || result.description;
      let regexText = `**Generated Regex:**\n\n\`${pattern}\``;
      if (explanation) regexText += `\n\n**Explanation:** ${explanation}`;
      return regexText;

    case "docs":
      return `**API Documentation:**\n\n${result.documentation || result.docs || result.content || result.text || JSON.stringify(result)}`;

    case "quiz":
      let quizText = "**Generated Quiz:**\n\n";
      const questions = result.questions || result.quiz || [];
      if (Array.isArray(questions)) {
        questions.forEach((q: any, i: number) => {
          quizText += `**Question ${i + 1}:** ${q.question || q.text}\n`;
          if (q.options && Array.isArray(q.options)) {
            q.options.forEach((opt: string, j: number) => {
              const letter = String.fromCharCode(65 + j); // A, B, C, D
              quizText += `  ${letter}. ${opt}\n`;
            });
          }
          if (q.answer) quizText += `  **Answer:** ${q.answer}\n`;
          quizText += "\n";
        });
      }
      return quizText.trim() || JSON.stringify(result);

    case "generate_image":
      // Image generation is handled separately with attachmentPreview
      return result.revisedPrompt
        ? `Image generated! (Prompt: ${result.revisedPrompt})`
        : "Image generated successfully!";

    case "analyze_image":
      return result.analysis || result.description || result.text || JSON.stringify(result);

    case "transcribe_audio":
      return `**Transcription:**\n\n${result.transcription || result.text || JSON.stringify(result)}`;

    case "synthesize_speech":
      // Audio synthesis is handled separately with attachmentPreview
      return "Audio synthesized successfully!";

    case "ocr":
      return `**Extracted Text:**\n\n${result.text || result.content || JSON.stringify(result)}`;

    default:
      // Generic fallback - try common response fields
      return result.text || result.content || result.result || result.response || JSON.stringify(result);
  }
}

// Helper to format complex response objects (sentiment, entities, quiz, etc.) into readable text
function formatComplexResponse(data: Record<string, unknown>): string | null {
  // Skip if it looks like raw API response metadata
  if ("success" in data && Object.keys(data).length <= 2) return null;

  // Try to intelligently format the data
  const entries = Object.entries(data).filter(([key]) =>
    !["success", "status", "error", "message"].includes(key)
  );

  if (entries.length === 0) return null;

  // If there's only one key with a string value, return it directly
  if (entries.length === 1 && typeof entries[0][1] === "string") {
    return entries[0][1];
  }

  // Format as structured text
  let result = "";
  for (const [key, value] of entries) {
    const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
    if (typeof value === "string") {
      result += `**${label}:** ${value}\n\n`;
    } else if (Array.isArray(value)) {
      result += `**${label}:**\n${value.map((v, i) => `${i + 1}. ${typeof v === "string" ? v : JSON.stringify(v)}`).join("\n")}\n\n`;
    } else if (typeof value === "object" && value !== null) {
      result += `**${label}:**\n${JSON.stringify(value, null, 2)}\n\n`;
    } else if (value !== undefined && value !== null) {
      result += `**${label}:** ${String(value)}\n\n`;
    }
  }

  return result.trim() || null;
}

// Helper to extract service ID from API URL
function extractServiceIdFromUrl(url: string): string | null {
  // Match patterns like /api/ai/summarize, /api/ai/code/generate, etc.
  const match = url.match(/\/api\/ai\/([^/]+)(?:\/([^/]+))?/);
  if (!match) return null;

  const firstPart = match[1]; // e.g., "code", "summarize"
  const secondPart = match[2]; // e.g., "generate", "review", undefined

  // Handle special nested routes that need combined IDs
  // /api/ai/code/review -> "code_review" (different from code/generate)
  if (firstPart === "code" && secondPart === "review") {
    return "code_review";
  }

  // For most nested paths, use the first part only
  // /api/ai/code/generate -> "code"
  // /api/ai/email/generate -> "email"
  // /api/ai/summarize -> "summarize"
  return firstPart;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  paymentRequest?: PaymentRequirements & { paymentId: string };
  // Multi-chain support: x402 v2 accepts array for network selection
  paymentAccepts?: AcceptOption[];
  paymentDefaultNetwork?: string;
  attachmentType?: "audio" | "image";
  attachmentPreview?: string;
  transactionHash?: string;
  paymentNetwork?: string;
  // Credit cost for this message (shown on user messages)
  creditsCost?: number;
}

interface ChatInterfaceProps {
  conversationId?: string;
  projectId?: string;
  onConversationChange?: (conversationId: string, firstMessage?: string) => void;
}

// Recording states
type RecordingState = "idle" | "recording" | "processing";

// Helper to parse and extract payment request JSON from message content
interface ParsedPaymentInfo {
  beforeText: string;
  paymentInfo: {
    endpoint: string;
    price: string;
    description: string;
    prompt?: string;
    network?: string;
    transactionHash?: string;
  } | null;
  afterText: string;
}

// Get block explorer URL based on network (x402 V2 supported networks)
function getBlockExplorerUrl(network: string, txHash: string): string {
  const explorers: Record<string, string> = {
    // Avalanche
    avalanche: "https://snowtrace.io/tx",
    "avalanche-fuji": "https://testnet.snowtrace.io/tx",
    // Base
    base: "https://basescan.org/tx",
    "base-sepolia": "https://sepolia.basescan.org/tx",
    // Ethereum
    ethereum: "https://etherscan.io/tx",
    sepolia: "https://sepolia.etherscan.io/tx",
    // Celo
    celo: "https://explorer.celo.org/mainnet/tx",
    "celo-sepolia": "https://celo-sepolia.blockscout.com/tx",
    // Polygon
    polygon: "https://polygonscan.com/tx",
    "polygon-amoy": "https://amoy.polygonscan.com/tx",
    // Arbitrum
    arbitrum: "https://arbiscan.io/tx",
    "arbitrum-sepolia": "https://sepolia.arbiscan.io/tx",
    // Optimism
    optimism: "https://optimistic.etherscan.io/tx",
    "optimism-sepolia": "https://sepolia-optimism.etherscan.io/tx",
    // Monad
    monad: "https://monadexplorer.com/tx",
    "monad-testnet": "https://testnet.monadexplorer.com/tx",
  };
  const baseUrl = explorers[network.toLowerCase()] || "https://snowtrace.io/tx";
  return `${baseUrl}/${txHash}`;
}

function parsePaymentRequestFromContent(content: string): ParsedPaymentInfo {
  // Match ```json ... ``` code block containing paymentRequest
  const jsonBlockRegex = /```json\s*\n?\{[\s\S]*?"paymentRequest"[\s\S]*?\}\s*\n?```/;
  const match = content.match(jsonBlockRegex);

  if (!match) {
    return { beforeText: content, paymentInfo: null, afterText: "" };
  }

  const jsonBlock = match[0];
  const startIndex = content.indexOf(jsonBlock);
  const beforeText = content.substring(0, startIndex).trim();
  const afterText = content.substring(startIndex + jsonBlock.length).trim();

  try {
    // Extract the JSON content from the code block
    const jsonContent = jsonBlock.replace(/```json\s*\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonContent);

    if (parsed.paymentRequest) {
      return {
        beforeText,
        paymentInfo: {
          endpoint: parsed.paymentRequest.endpoint || "",
          price: parsed.paymentRequest.price || "",
          description: parsed.paymentRequest.description || "",
          prompt: parsed.paymentRequest.requestData?.prompt,
          network: parsed.paymentRequest.network,
          transactionHash: parsed.transactionHash, // May be added after payment
        },
        afterText,
      };
    }
  } catch {
    // JSON parse failed, return original content
  }

  return { beforeText: content, paymentInfo: null, afterText: "" };
}

// Component to display paid transaction badge
function PaidBadge({ paymentInfo }: { paymentInfo: ParsedPaymentInfo["paymentInfo"] }) {
  if (!paymentInfo) return null;

  const explorerUrl = paymentInfo.transactionHash && paymentInfo.network
    ? getBlockExplorerUrl(paymentInfo.network, paymentInfo.transactionHash)
    : null;

  return (
    <div className="my-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span className="text-xs font-medium text-green-500">Paid</span>
        </div>
        <span className="text-xs text-muted-foreground">{paymentInfo.price}</span>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 text-xs text-aura-purple hover:text-aura-purple/80 hover:bg-aura-purple/10 rounded transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            View on Explorer
          </a>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        <span className="font-medium">{paymentInfo.description}</span>
        {paymentInfo.endpoint && (
          <span className="ml-2 opacity-70">• {paymentInfo.endpoint}</span>
        )}
      </div>
    </div>
  );
}

// Component to display insufficient credits message with CTA
function InsufficientCreditsCard({ cost, balance }: { cost: number; balance: number }) {
  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10 shadow-lg shadow-amber-500/5">
      {/* Header with icon */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-500/20 bg-amber-500/5">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-amber-200">Out of Credits</h3>
          <p className="text-xs text-amber-300/70">Your balance: {balance} credits</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4 space-y-4">
        <p className="text-sm text-foreground/80">
          You need <span className="font-semibold text-amber-300">{cost} credit{cost > 1 ? "s" : ""}</span> to send a message.
        </p>

        {/* Options */}
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 text-green-400 flex-shrink-0">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Free users get <strong className="text-foreground">50 credits/month</strong></span>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 text-green-400 flex-shrink-0">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Upgrade for more credits + <strong className="text-foreground">x402 discounts</strong></span>
          </div>
        </div>

        {/* CTA Button */}
        <a
          href="/dashboard/subscription"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 mt-4 font-medium text-sm text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all duration-200 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4" />
            <path d="m16.2 7.8 2.9-2.9" />
            <path d="M18 12h4" />
            <path d="m16.2 16.2 2.9 2.9" />
            <path d="M12 18v4" />
            <path d="m4.9 19.1 2.9-2.9" />
            <path d="M2 12h4" />
            <path d="m4.9 4.9 2.9 2.9" />
          </svg>
          Get More Credits
        </a>
      </div>
    </div>
  );
}

// Helper to check if message is an insufficient credits message
function parseInsufficientCredits(content: string): { cost: number; balance: number } | null {
  if (!content.startsWith("__INSUFFICIENT_CREDITS__:")) return null;
  try {
    const json = content.replace("__INSUFFICIENT_CREDITS__:", "");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function ChatInterface({
  conversationId: initialConversationId,
  projectId,
  onConversationChange
}: ChatInterfaceProps) {
  const account = useActiveAccount();
  const wallet = useThirdwebWallet();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Microphone recording state
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // File attachment state
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected paid service (from ServiceSelector)
  const [selectedPaidService, setSelectedPaidService] = useState<ServiceSelection | null>(null);
  // Pending paid services waiting for x402 payment
  const pendingPaidServicesRef = useRef<Map<string, PendingPaidService>>(new Map());

  // Pending actions waiting for payment
  const pendingActionsRef = useRef<Map<string, {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body: any;
    description: string;
  }>>(new Map());

  // Track payment IDs currently being processed to prevent duplicate settlements
  const processingPaymentsRef = useRef<Set<string>>(new Set());

  // Helper to retry pending action with signature
  const retryPendingAction = async (paymentId: string, envelope: any) => {
    const action = pendingActionsRef.current.get(paymentId);
    if (!action) return;

    // Prevent duplicate settlement attempts
    if (processingPaymentsRef.current.has(paymentId)) {
      console.warn("[ChatInterface] Payment already being processed, skipping duplicate:", paymentId);
      return;
    }
    processingPaymentsRef.current.add(paymentId);

    console.log("[ChatInterface] Retrying action with signature:", {
      paymentId,
      url: action.url,
      envelopeNetwork: envelope.network,
      envelopeFrom: envelope.authorization?.from,
      envelopeNonce: envelope.authorization?.nonce,
    });

    // Add signature to headers (x402 v2: PAYMENT-SIGNATURE)
    const paymentPayload = {
      x402Version: 2,
      scheme: "exact",
      network: envelope.network,
      payload: envelope
    };
    console.log("[ChatInterface] Payment payload:", JSON.stringify(paymentPayload, null, 2));

    const headers = {
      ...action.headers,
      "PAYMENT-SIGNATURE": Buffer.from(JSON.stringify(paymentPayload)).toString("base64")
    };

    try {
      setLoading(true);
      console.log("[ChatInterface] Starting fetch to:", action.url);

      const response = await fetch(action.url, {
        method: action.method,
        headers,
        body: action.body instanceof FormData ? action.body : JSON.stringify(action.body),
      });

      console.log("[ChatInterface] Fetch completed:", {
        status: response.status,
        ok: response.ok,
        hasPaymentResponse: !!response.headers.get("PAYMENT-RESPONSE"),
      });

      const data = await response.json();
      console.log("[ChatInterface] Response parsed:", {
        success: data.success,
        hasData: !!data.data,
        keys: Object.keys(data),
      });

      // Extract transaction hash from PAYMENT-RESPONSE header
      let transactionHash: string | undefined;
      let paymentNetwork: string | undefined;
      const paymentResponseHeader = response.headers.get("PAYMENT-RESPONSE");
      if (paymentResponseHeader) {
        try {
          const paymentResponse = JSON.parse(atob(paymentResponseHeader));
          transactionHash = paymentResponse.transactionHash;
          paymentNetwork = paymentResponse.network || envelope.network;
          console.log("[ChatInterface] Payment settled:", { transactionHash, paymentNetwork });
        } catch (e) {
          console.warn("[ChatInterface] Failed to parse PAYMENT-RESPONSE header:", e);
        }
      }

      if (!response.ok || !data.success) {
        // Include detailed reason if available (x402 middleware returns reason + details)
        const errorMsg = data.reason || data.details || data.error || data.message || "Retry failed";
        throw new Error(errorMsg);
      }

      // Payment and service succeeded - deduct 1 credit for the interaction
      console.log("[ChatInterface] About to deduct credit, account state:", {
        hasAccount: !!account,
        address: account?.address,
      });

      if (account?.address) {
        try {
          const creditResponse = await fetch("/api/credits/deduct", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              walletAddress: account.address,
              description: `x402 Service: ${action.description || action.url}`,
            }),
          });
          if (creditResponse.ok) {
            const creditData = await creditResponse.json();
            console.log("[ChatInterface] Credit deducted for x402 service:", creditData.newBalance);
          }
        } catch (e) {
          console.warn("[ChatInterface] Failed to deduct credit for x402 service:", e);
        }
      }

      // Success! Update messages
      console.log("[ChatInterface] Processing successful response:", {
        url: action.url,
        hasData: !!data.data,
        dataKeys: data.data ? Object.keys(data.data) : [],
      });

      // Remove payment request message
      console.log("[ChatInterface] Removing payment request message for paymentId:", paymentId);
      setMessages((prev) => {
        console.log("[ChatInterface] setMessages filter - prev count:", prev.length);
        const filtered = prev.filter(m => !m.paymentRequest || m.paymentRequest.paymentId !== paymentId);
        console.log("[ChatInterface] setMessages filter - new count:", filtered.length);
        return filtered;
      });

      // Determine the response content based on endpoint type
      let responseContent = "Success!";
      let attachmentPreview: string | undefined;
      let attachmentType: "image" | "audio" | undefined;

      // Handle image generation response (data.data contains { url?, base64?, revisedPrompt? })
      if (data.data?.base64) {
        // Image with base64 data
        attachmentPreview = `data:image/png;base64,${data.data.base64}`;
        attachmentType = "image";
        responseContent = data.data.revisedPrompt
          ? `Here's your generated image! (Prompt: ${data.data.revisedPrompt})`
          : "Here's your generated image!";
      } else if (data.data?.url) {
        // Image with URL
        attachmentPreview = data.data.url;
        attachmentType = "image";
        responseContent = data.data.revisedPrompt
          ? `Here's your generated image! (Prompt: ${data.data.revisedPrompt})`
          : "Here's your generated image!";
      } else if (data.data?.audio || data.audioUrl) {
        // Audio response (TTS)
        attachmentPreview = data.data?.audio || data.audioUrl;
        attachmentType = "audio";
        responseContent = "Here's your synthesized audio!";
      } else {
        // Text responses (analysis, transcription, summarization, etc.)
        // Try to use the comprehensive service-specific formatter
        const serviceId = extractServiceIdFromUrl(action.url);
        console.log("[ChatInterface] Formatting text response:", { serviceId, url: action.url });

        if (serviceId) {
          try {
            responseContent = formatPaidServiceResponse(serviceId, data);
            console.log("[ChatInterface] Formatted response:", {
              serviceId,
              responseLength: responseContent?.length || 0,
              preview: responseContent?.substring(0, 100)
            });
          } catch (formatError) {
            console.error("[ChatInterface] Error formatting response:", formatError);
            // Fall through to manual extraction
          }
        }

        // If no serviceId or formatting failed, use manual extraction
        if (!serviceId || responseContent === "Success!") {
          // Fallback: Handle various service response formats manually
          responseContent = data.response ||
            data.analysis ||
            data.transcription ||
            data.data?.text ||
            data.data?.summary ||
            data.data?.translation ||
            data.data?.simplified ||
            data.data?.code ||
            data.data?.email ||
            data.data?.review ||
            data.data?.sql ||
            data.data?.regex ||
            data.data?.documentation ||
            data.data?.description ||
            data.data?.optimized ||
            // For complex objects (sentiment, entities, quiz, etc.), format as readable text
            (data.data && typeof data.data === "object" && !Array.isArray(data.data)
              ? (() => {
                  try {
                    return formatComplexResponse(data.data);
                  } catch (e) {
                    console.error("[ChatInterface] Error in formatComplexResponse:", e);
                    return null;
                  }
                })()
              : null) ||
            "Success!";
        }
      }

      console.log("[ChatInterface] Adding assistant message:", {
        contentLength: responseContent?.length || 0,
        hasAttachment: !!attachmentPreview,
        attachmentType,
        transactionHash,
      });

      // Add assistant response with transaction info
      const assistantMessage: Message = {
        role: "assistant",
        content: responseContent,
        timestamp: new Date().toISOString(),
        attachmentPreview,
        attachmentType,
        transactionHash,
        paymentNetwork,
      };
      console.log("[ChatInterface] Adding assistant message to state");
      setMessages((prev) => {
        console.log("[ChatInterface] setMessages add - prev count:", prev.length);
        return [...prev, assistantMessage];
      });
      console.log("[ChatInterface] Assistant message added to state queue");

      // Save the generated result to the database so it persists
      // IMPORTANT: Skip saving if the endpoint already saves to database (like /api/chat/image)
      // to avoid duplicate messages
      const endpointAlreadySavesToDatabase = action.url === "/api/chat/image";
      const conversationIdForSave = currentConversationId || data.conversationId;

      if (!endpointAlreadySavesToDatabase && conversationIdForSave && account?.address) {
        try {
          console.log("[ChatInterface] Saving generated content to database", {
            conversationId: conversationIdForSave,
            hasAttachment: !!attachmentPreview,
            attachmentType,
            transactionHash,
            paymentNetwork,
          });

          // Save via the chat API (which uses ElizaService)
          await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: responseContent,
              walletAddress: account.address,
              conversationId: conversationIdForSave,
              projectId: projectId,
              // Include attachment data so it can be stored
              attachment: attachmentPreview ? {
                type: attachmentType,
                data: attachmentPreview,
              } : undefined,
              // Include payment transaction info for persistence
              transactionHash,
              paymentNetwork,
              // Mark this as a system message to store without generating a new response
              storeOnly: true,
              role: "assistant",
            }),
          });
          console.log("[ChatInterface] Generated content saved successfully");
        } catch (saveError) {
          console.error("[ChatInterface] Failed to save generated content:", saveError);
          // Don't throw - the image is displayed, just not persisted
        }
      } else if (endpointAlreadySavesToDatabase) {
        console.log("[ChatInterface] Skipping client-side save - endpoint already persists to database");
      }

      // Handle conversation updates if needed
      if (data.conversationId) {
        // Mark as locally created FIRST to prevent server reload on any state changes
        locallyCreatedConversationsRef.current.add(data.conversationId);

        if (!currentConversationId) {
          setCurrentConversationId(data.conversationId);
          // Use setTimeout to defer the callback to avoid "setState during render" warning
          const conversationIdToNotify = data.conversationId;
          const descriptionToNotify = action.description;
          setTimeout(() => {
            onConversationChange?.(conversationIdToNotify, descriptionToNotify);
          }, 0);
        }
      }

      // Cleanup
      console.log("[ChatInterface] Cleaning up after successful payment");
      pendingActionsRef.current.delete(paymentId);
      processingPaymentsRef.current.delete(paymentId);
      // Clear selected paid service (safety - should already be cleared when 402 was returned)
      if (selectedPaidService) {
        setSelectedPaidService(null);
      }
      console.log("[ChatInterface] retryPendingAction completed successfully");

    } catch (error) {
      console.error("[ChatInterface] retryPendingAction CAUGHT ERROR:", error);
      console.error("[ChatInterface] Error stack:", error instanceof Error ? error.stack : "No stack");
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `Retry failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date().toISOString()
      }]);
      // Clean up processing state on error too
      processingPaymentsRef.current.delete(paymentId);
      // Clear selected paid service on error too
      if (selectedPaidService) {
        setSelectedPaidService(null);
      }
    } finally {
      console.log("[ChatInterface] retryPendingAction finally block - setting loading to false");
      setLoading(false);
    }
  };

  // Generate user-isolated conversation ID if not provided
  const generateConversationId = useCallback(() => {
    if (!account?.address) return null;
    // Use wallet address to ensure user isolation
    return `conv_${account.address.toLowerCase()}_${Date.now()}`;
  }, [account?.address]);

  // Track previous conversation ID to detect actual prop changes
  const prevConversationIdRef = useRef<string | undefined>(initialConversationId);
  // Track if we've had a conversation (to know when to clear on "New Chat")
  const hasHadConversationRef = useRef<boolean>(false);
  // Track conversation IDs we created locally (to skip loading from server)
  const locallyCreatedConversationsRef = useRef<Set<string>>(new Set());
  // Track if we've notified parent about the current conversation (to add to sidebar)
  const notifiedConversationsRef = useRef<Set<string>>(new Set());

  // Load conversation history when conversationId prop changes
  useEffect(() => {
    console.log("[ChatInterface] useEffect triggered", {
      initialConversationId,
      prevConversationId: prevConversationIdRef.current,
      currentConversationId,
      messagesCount: messages.length,
      locallyCreated: Array.from(locallyCreatedConversationsRef.current),
    });

    // Only react to actual prop changes, not re-renders
    if (prevConversationIdRef.current === initialConversationId) {
      console.log("[ChatInterface] Skipping - no prop change detected");
      return;
    }

    const previousId = prevConversationIdRef.current;
    prevConversationIdRef.current = initialConversationId;

    console.log("[ChatInterface] Prop changed", {
      from: previousId,
      to: initialConversationId,
    });

    if (account?.address) {
      if (initialConversationId) {
        // Mark this conversation as already in the sidebar (came from props)
        notifiedConversationsRef.current.add(initialConversationId);

        // Check if this is a conversation we just created locally
        // If so, don't reload from server - we have the messages with paymentRequest locally
        const isLocallyCreated = locallyCreatedConversationsRef.current.has(initialConversationId);

        if (isLocallyCreated) {
          console.log("[ChatInterface] Skipping server reload - conversation was locally created:", initialConversationId);
          // Just update the current conversation ID, keep existing messages
          setCurrentConversationId(initialConversationId);
          hasHadConversationRef.current = true;
        } else {
          // Load from server when user clicked on an existing conversation
          console.log("[ChatInterface] Loading conversation from server:", initialConversationId);
          // Clear existing messages first to show loading state
          setMessages([]);
          setCurrentConversationId(initialConversationId);
          loadConversationHistory(initialConversationId);
          hasHadConversationRef.current = true;
        }
      } else if (previousId !== undefined) {
        // New conversation requested (user clicked "New Chat")
        // Only clear if we previously had a conversation selected
        if (hasHadConversationRef.current) {
          console.log("[ChatInterface] New Chat requested - clearing messages");
          setCurrentConversationId(null);
          setMessages([]);
          // Clear locally created conversations so they reload from server next time
          locallyCreatedConversationsRef.current.clear();
          console.log("[ChatInterface] Cleared locallyCreatedConversationsRef");
        }
      }
    }
    // Note: We intentionally exclude currentConversationId from deps
    // to avoid re-running when we set it internally after sending a message
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId, account?.address]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const loadConversationHistory = async (conversationIdOverride?: string | null) => {
    const conversationIdToUse = conversationIdOverride || currentConversationId;

    console.log("[ChatInterface] loadConversationHistory called", {
      conversationIdOverride,
      currentConversationId,
      conversationIdToUse,
    });

    if (!conversationIdToUse || !account?.address) {
      console.log("[ChatInterface] loadConversationHistory - no conversationId or account, skipping");
      return;
    }

    setLoadingHistory(true);
    try {
      console.log("[ChatInterface] Fetching history from server...");
      const response = await fetch(
        `/api/chat?walletAddress=${account.address}&conversationId=${conversationIdToUse}`
      );
      if (response.ok) {
        const data = await response.json();
        console.log("[ChatInterface] Server returned messages:", data.messages?.length || 0);
        setMessages(data.messages || []);
      } else {
        console.log("[ChatInterface] Server returned error:", response.status);
      }
    } catch (error) {
      console.error("[ChatInterface] Failed to load conversation history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Start microphone recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());

        if (audioChunksRef.current.length === 0) {
          setRecordingState("idle");
          return;
        }

        setRecordingState("processing");
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        // Process the audio
        await handleAudioTranscription(audioBlob);
        setRecordingState("idle");
      };

      mediaRecorder.start(1000); // Collect data every second
      setRecordingState("recording");
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("[ChatInterface] Failed to start recording:", error);
      alert("Could not access microphone. Please check your permissions.");
      setRecordingState("idle");
    }
  };

  // Stop microphone recording
  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  // Handle audio transcription
  const handleAudioTranscription = async (audioBlob: Blob) => {
    if (!account?.address) return;

    // Create user message indicating audio input
    const userMessage: Message = {
      role: "user",
      content: "🎤 [Audio message being transcribed...]",
      timestamp: new Date().toISOString(),
      attachmentType: "audio",
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      // Convert blob to file
      const audioFile = new File([audioBlob], "recording.webm", { type: audioBlob.type });

      // Upload file first
      const conversationIdForUpload = currentConversationId || generateConversationId() || "temp_conv";
      const audioUrl = await uploadFile(audioFile, conversationIdForUpload);

      const formData = new FormData();
      formData.append("audioUrl", audioUrl);
      formData.append("walletAddress", account.address);
      formData.append("conversationId", conversationIdForUpload);
      if (projectId) {
        formData.append("projectId", projectId);
      }

      // Call chat API with audio URL
      const url = "/api/chat/audio";
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      // Handle x402 Payment Required
      if (response.status === 402) {
        const paymentHeader = response.headers.get("PAYMENT-REQUIRED");
        if (paymentHeader) {
          const decoded = atob(paymentHeader);
          const parsed = JSON.parse(decoded);

          // Store full accepts array for multi-chain network selection
          const accepts: AcceptOption[] = parsed.accepts || [];
          const defaultNetwork = parsed.defaultNetwork;
          const requirements = accepts[0]; // First option for backwards compatibility

          // Extract token info from extra field for EIP-712 domain construction
          const tokenName = requirements?.extra?.name;
          const tokenVersion = requirements?.extra?.version;

          const paymentId = `pay_${Date.now()}`;

          // Store pending action
          // NOTE: FormData bodies cannot be simply JSON.stringified and reused easily in all contexts,
          // but assuming we're just retrying the same FormData it should be fine if we store it.
          // However, fetch body with FormData doesn't need Content-Type header (browser sets it with boundary).
          pendingActionsRef.current.set(paymentId, {
            url,
            method: "POST",
            body: formData, // Store FormData directly
            description: "Audio Transcription"
          });

          setMessages(prev => [...prev, {
            role: "assistant",
            content: "Payment required for audio transcription.",
            timestamp: new Date().toISOString(),
            paymentRequest: {
              ...requirements,
              tokenName,
              tokenVersion,
              paymentId,
              endpoint: url
            },
            // Multi-chain support
            paymentAccepts: accepts,
            paymentDefaultNetwork: defaultNetwork,
          }]);
          return;
        }
      }

      const data = await response.json();

      if (response.ok && data.success) {
        // Update conversation ID if new
        if (data.conversationId && !currentConversationId) {
          // Mark this conversation as locally created so we don't reload from server
          locallyCreatedConversationsRef.current.add(data.conversationId);
          setCurrentConversationId(data.conversationId);
          // Use setTimeout to defer the callback to avoid "setState during render" warning
          const conversationIdToNotify = data.conversationId;
          const transcriptionMessage = `🎤 "${data.transcription}"`;
          setTimeout(() => {
            onConversationChange?.(conversationIdToNotify, transcriptionMessage);
          }, 0);
        }

        // Update user message with transcription
        setMessages((prev) => {
          const updated = [...prev];
          const lastUserIdx = updated.length - 1;
          if (updated[lastUserIdx]?.role === "user" && updated[lastUserIdx]?.attachmentType === "audio") {
            updated[lastUserIdx] = {
              ...updated[lastUserIdx],
              content: `🎤 "${data.transcription}"`,
            };
          }
          return updated;
        });

        // Add assistant response
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || "Transcription failed");
      }
    } catch (error) {
      console.error("[ChatInterface] Audio transcription error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: `Audio transcription error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (images only for now)
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (PNG, JPG, GIF, WebP)");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setAttachedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAttachedPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Remove attached file
  const removeAttachment = () => {
    setAttachedFile(null);
    setAttachedPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    console.log("[ChatInterface] handleSend called", {
      input: input.trim(),
      hasAttachedFile: !!attachedFile,
      hasAccount: !!account?.address,
      loading,
      currentConversationId,
    });

    if ((!input.trim() && !attachedFile) || !account?.address || loading) {
      console.log("[ChatInterface] handleSend - validation failed, returning");
      return;
    }

    const messageText = input.trim();
    const hasAttachment = !!attachedFile;

    // Check if a paid service from ServiceSelector was selected
    const isPaidServiceCall = selectedPaidService?.endpoint && !attachedFile;

    // Create user message with credit cost indicator
    // Every interaction costs 1 credit (for agent processing)
    // x402 services cost additional money via x402 payment on top of the 1 credit
    const userMessage: Message = {
      role: "user",
      content: messageText || (hasAttachment ? "📎 [Image attached]" : ""),
      timestamp: new Date().toISOString(),
      attachmentType: hasAttachment ? "image" : undefined,
      attachmentPreview: attachedPreview || undefined,
      creditsCost: 1, // Every interaction costs 1 credit
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Store file reference before clearing
    const fileToSend = attachedFile;

    // Clear attachment
    removeAttachment();

    try {
      let response;
      let data;
      let url = "";
      let body: any;
      let method = "POST";
      let headers: Record<string, string> = { "Content-Type": "application/json" };

      if (fileToSend) {
        // Upload file first
        const conversationIdForUpload = currentConversationId || generateConversationId() || "temp_conv";
        const imageUrl = await uploadFile(fileToSend, conversationIdForUpload);

        url = "/api/chat/image";
        body = {
          walletAddress: account.address,
          conversationId: conversationIdForUpload,
          message: messageText || "Analyze this image",
          imageUrl: imageUrl,
          projectId: projectId || null
        };
        // fetch call below will use url/body
      } else if (isPaidServiceCall && selectedPaidService && selectedPaidService.endpoint) {
        // Route to paid AI service endpoint (x402 protected)
        url = selectedPaidService.endpoint;
        // Build endpoint-specific request body using helper function
        body = {
          ...buildServiceRequestBody(selectedPaidService.serviceId, messageText),
          walletAddress: account.address,
        };
        console.log("[ChatInterface] Routing to paid service:", {
          endpoint: url,
          serviceId: selectedPaidService.serviceId,
          priceUsd: selectedPaidService.priceUsd,
          body,
        });
        // Note: Don't clear selectedPaidService yet - we need it for response formatting
      } else {
        url = "/api/chat";
        body = {
          message: messageText,
          conversationId: currentConversationId,
          walletAddress: account.address,
          projectId: projectId || null,
        };
      }

      response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      // Handle x402 Payment Required
      if (response.status === 402) {
        const paymentHeader = response.headers.get("PAYMENT-REQUIRED");
        if (paymentHeader) {
          const decoded = atob(paymentHeader);
          const parsed = JSON.parse(decoded);

          // Store full accepts array for multi-chain network selection
          const accepts: AcceptOption[] = parsed.accepts || [];
          const defaultNetwork = parsed.defaultNetwork;
          const requirements = accepts[0]; // First option for backwards compatibility

          // Extract token info from extra field for EIP-712 domain construction
          const tokenName = requirements?.extra?.name;
          const tokenVersion = requirements?.extra?.version;

          const paymentId = `pay_${Date.now()}`;

          // Store pending action
          pendingActionsRef.current.set(paymentId, {
            url,
            method,
            headers,
            body,
            description: messageText || "Image Analysis"
          });

          // Add system message with payment button
          setMessages(prev => [...prev, {
            role: "assistant",
            content: "Payment required for this request.",
            timestamp: new Date().toISOString(),
            paymentRequest: {
              ...requirements,
              tokenName,
              tokenVersion,
              paymentId,
              endpoint: url
            },
            // Multi-chain support
            paymentAccepts: accepts,
            paymentDefaultNetwork: defaultNetwork,
          }]);

          // Clear selected paid service - the pending action is stored in pendingActionsRef
          // This prevents subsequent messages from routing to the paid service again
          if (selectedPaidService) {
            setSelectedPaidService(null);
          }
          return;
        }
      }

      data = await response.json();

      if (!response.ok || !data.success) {
        // Handle insufficient credits error specially
        if (data.code === "INSUFFICIENT_CREDITS") {
          const creditMessage: Message = {
            role: "assistant",
            content: `__INSUFFICIENT_CREDITS__:${JSON.stringify({ cost: data.cost || 1, balance: data.balance || 0 })}`,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, creditMessage]);
          return;
        }
        const errorMsg = data.error || data.message || "Failed to get response";
        throw new Error(errorMsg);
      }

      // Check if this was a paid service call (selectedPaidService still set)
      const wasPaidServiceCall = !!selectedPaidService;
      const paidServiceId = selectedPaidService?.serviceId;
      const paidServiceTitle = selectedPaidService?.serviceTitle;

      // Clear the selected paid service now that we have the response
      if (selectedPaidService) {
        setSelectedPaidService(null);
      }

      // Update conversation ID and notify parent to add to sidebar
      if (data.conversationId) {
        const isNewConversation = !currentConversationId;
        const needsNotification = !notifiedConversationsRef.current.has(data.conversationId);

        console.log("[ChatInterface] Conversation update", {
          conversationId: data.conversationId,
          isNewConversation,
          needsNotification,
          firstMessage: messageText || userMessage.content,
        });

        if (isNewConversation) {
          // Mark this conversation as locally created so we don't reload from server
          locallyCreatedConversationsRef.current.add(data.conversationId);
          console.log("[ChatInterface] Added to locallyCreated set:", Array.from(locallyCreatedConversationsRef.current));
          setCurrentConversationId(data.conversationId);
        }

        // Notify parent to add conversation to sidebar (only once per conversation)
        // Use setTimeout to defer the callback to avoid "setState during render" warning
        if (needsNotification) {
          notifiedConversationsRef.current.add(data.conversationId);
          console.log("[ChatInterface] Calling onConversationChange to add to sidebar...");
          const conversationIdToNotify = data.conversationId;
          const firstMessageToNotify = messageText || userMessage.content;
          setTimeout(() => {
            onConversationChange?.(conversationIdToNotify, firstMessageToNotify);
          }, 0);
        }
      }

      // Handle response based on whether it was a paid service call or regular chat
      let responseContent: string;
      let attachmentPreview: string | undefined;
      let attachmentType: "image" | "audio" | undefined;
      let paymentRequest: (PaymentRequirements & { paymentId: string }) | undefined;

      if (wasPaidServiceCall && paidServiceId) {
        // Paid service response - format using helper
        console.log("[ChatInterface] Formatting paid service response:", {
          serviceId: paidServiceId,
          serviceTitle: paidServiceTitle,
          data,
        });

        // Handle special cases: image generation and speech synthesis have attachments
        const result = data.data || data;
        if (paidServiceId === "generate_image") {
          if (result.base64) {
            attachmentPreview = `data:image/png;base64,${result.base64}`;
            attachmentType = "image";
          } else if (result.url) {
            attachmentPreview = result.url;
            attachmentType = "image";
          }
        } else if (paidServiceId === "synthesize_speech") {
          if (result.audio || result.audioUrl) {
            attachmentPreview = result.audio || result.audioUrl;
            attachmentType = "audio";
          }
        }

        responseContent = formatPaidServiceResponse(paidServiceId, data);
      } else {
        // Regular chat response - use existing logic
        responseContent = data.response;

        // Check if response contains payment request (JSON format)
        try {
          // More flexible regex: handles optional whitespace, different newline patterns
          // Matches: ```json followed by JSON content and closing ```
          const paymentMatch = data.response?.match(/```json\s*([\s\S]*?)\s*```/);
          console.log("[ChatInterface] Payment JSON match:", {
            hasMatch: !!paymentMatch,
            rawResponse: data.response?.substring(0, 200),
          });

          if (paymentMatch) {
            const jsonContent = paymentMatch[1].trim();
            console.log("[ChatInterface] Parsing JSON content:", jsonContent.substring(0, 200));
            const paymentData = JSON.parse(jsonContent);

            if (paymentData.paymentRequest) {
              const pr = paymentData.paymentRequest;
              console.log("[ChatInterface] Found paymentRequest:", pr);

              // Store the pending action so we can execute it after payment
              if (pr.paymentId && pr.endpoint && pr.requestData) {
                pendingActionsRef.current.set(pr.paymentId, {
                  url: pr.endpoint,
                  method: pr.method || "POST",
                  headers: { "Content-Type": "application/json" },
                  body: pr.requestData,
                  description: pr.description || "AI Service Request",
                });
                console.log("[ChatInterface] Stored pending action for paymentId:", pr.paymentId);
              }

              paymentRequest = pr;
              // Remove the JSON block from response content
              responseContent = data.response.replace(/```json\s*[\s\S]*?\s*```/g, "").trim();
            }
          }
        } catch (parseError) {
          // Not a payment request or invalid JSON
          console.log("[ChatInterface] Payment JSON parse failed:", parseError);
        }
      }

      // Add assistant response
      const assistantMessage: Message = {
        role: "assistant",
        content: responseContent,
        timestamp: new Date().toISOString(),
        paymentRequest,
        attachmentPreview,
        attachmentType,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("[ChatInterface] Chat error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: error instanceof Error ? error.message : "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle file upload
  const uploadFile = async (file: File, conversationId: string): Promise<string> => {
    if (!account?.address) throw new Error("Wallet not connected");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversationId", conversationId);
    formData.append("walletAddress", account.address);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Upload failed");
    }

    return data.url;
  };

  if (!account?.address) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Please connect your wallet to use the chat</p>
      </div>
    );
  }

  // Welcome / Empty State
  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-background p-4 flex flex-col items-center justify-center min-h-0">
        <div className="w-full max-w-3xl space-y-8 animate-fadeIn">
          {/* Hero Section */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-aura-gradient">
              Hello, {account.address.slice(0, 6)}...{account.address.slice(-5)}
            </h1>
            <p className="text-xl text-muted-foreground">
              How can I help you today?
            </p>
          </div>

          {/* Central Input */}
          <div className="relative max-w-2xl mx-auto w-full">
            <div className="relative flex items-center bg-muted/50 border border-border rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-aura-purple/20 focus-within:border-aura-purple transition-all p-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={recordingState === "recording" ? "Recording..." : "Ask anything..."}
                className="flex-1 bg-transparent border-none text-lg px-4 py-3 focus:outline-none placeholder-muted-foreground"
                disabled={loading || recordingState !== "idle"}
                autoFocus
              />
              <div className="flex items-center gap-2 pr-2">
                {/* File attachment button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || recordingState !== "idle"}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-full transition-colors"
                  title="Attach image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>

                {/* Microphone button */}
                <button
                  onClick={recordingState === "recording" ? stopRecording : startRecording}
                  disabled={loading || recordingState === "processing"}
                  className={`p-2 rounded-full transition-colors ${recordingState === "recording"
                    ? "bg-red-500 text-white animate-pulse"
                    : "text-muted-foreground hover:text-foreground hover:bg-background"
                    } disabled:opacity-50`}
                  title={recordingState === "recording" ? "Stop recording" : "Start recording"}
                >
                  {recordingState === "processing" ? (
                    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={handleSend}
                  disabled={!input.trim() && !attachedFile && recordingState === "idle"}
                  className="p-2 bg-aura-gradient text-white rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>

            {/* Recording indicator */}
            {recordingState === "recording" && (
              <div className="absolute top-full left-0 right-0 mt-2 text-center">
                <span className="text-sm text-red-400 font-medium bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Recording: {formatTime(recordingTime)}
                </span>
              </div>
            )}

            {/* Attachment Preview (Central) */}
            {attachedPreview && (
              <div className="absolute top-full left-0 mt-2 p-2 bg-card border border-border rounded-lg shadow-lg z-10 flex items-center gap-2">
                <img src={attachedPreview} alt="Preview" className="h-12 w-12 object-cover rounded" />
                <span className="text-xs text-muted-foreground max-w-[150px] truncate">{attachedFile?.name}</span>
                <button onClick={removeAttachment} className="ml-2 text-destructive hover:text-destructive/80">✕</button>
              </div>
            )}
          </div>

          {/* Service Selector */}
          <div className="pt-8">
            <ServiceSelector onSelect={(selection) => {
              setInput(selection.prompt);
              // Track if this is a paid service that needs x402 payment
              if (selection.endpoint) {
                setSelectedPaidService(selection);
              } else {
                setSelectedPaidService(null);
              }
            }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0 scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Loading indicator when switching conversations */}
          {loadingHistory && (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-aura-purple rounded-full animate-bounce" />
                  <div className="w-3 h-3 bg-aura-purple/70 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <div className="w-3 h-3 bg-aura-purple/40 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                </div>
                <span className="text-sm text-muted-foreground">Loading conversation...</span>
              </div>
            </div>
          )}
          {!loadingHistory && messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
                <div className={`flex flex-col max-w-[85%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-5 py-3 shadow-sm ${message.role === "user"
                    ? "bg-aura-gradient text-white rounded-br-none"
                    : "bg-muted text-foreground rounded-bl-none"
                  }`}
                >
                  {/* Credit cost badge for user messages */}
                  {message.role === "user" && message.creditsCost && (
                    <div className="flex items-center gap-1.5 mb-2 -mt-0.5">
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v12" />
                          <path d="M6 12h12" />
                        </svg>
                        <span>{message.creditsCost} credit</span>
                      </div>
                    </div>
                  )}
                  {/* Show image preview if attached */}
                  {message.attachmentPreview && message.attachmentType === "image" && (
                    <div className="mb-2 inline-block relative group">
                      <img
                        src={message.attachmentPreview}
                        alt="Generated image"
                        className="max-w-full max-h-64 rounded-lg object-contain bg-background/50 block"
                      />
                      {/* Download overlay on hover - positioned relative to image */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center gap-3 pointer-events-none group-hover:pointer-events-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            // Download the image
                            const link = document.createElement('a');
                            link.href = message.attachmentPreview!;
                            link.download = `generated-image-${Date.now()}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-gray-800 rounded-lg font-medium text-sm transition-colors"
                          title="Download image"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Download
                        </button>
                        <a
                          href={message.attachmentPreview}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-gray-800 rounded-lg font-medium text-sm transition-colors no-underline"
                          title="Open in new tab"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          Open
                        </a>
                      </div>
                    </div>
                  )}
                  {/* Show other attachment types (non-image) */}
                  {message.attachmentPreview && !message.attachmentType && (
                    <div className="mb-2">
                      <img
                        src={message.attachmentPreview}
                        alt="Attached"
                        className="max-w-full max-h-48 rounded-lg object-contain bg-background/50"
                      />
                    </div>
                  )}
                  {(() => {
                    // Check for insufficient credits message first
                    const creditsData = parseInsufficientCredits(message.content);
                    if (creditsData) {
                      return <InsufficientCreditsCard cost={creditsData.cost} balance={creditsData.balance} />;
                    }

                    const parsed = parsePaymentRequestFromContent(message.content);
                    if (parsed.paymentInfo) {
                      return (
                        <>
                          {parsed.beforeText && (
                            <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{parsed.beforeText}</p>
                          )}
                          <PaidBadge paymentInfo={parsed.paymentInfo} />
                          {parsed.afterText && (
                            <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{parsed.afterText}</p>
                          )}
                        </>
                      );
                    }
                    return <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{message.content}</p>;
                  })()}

                  {/* Show transaction link for current session messages with tx hash */}
                  {message.transactionHash && message.paymentNetwork && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span className="text-xs font-medium text-green-500">Paid</span>
                      </div>
                      <a
                        href={getBlockExplorerUrl(message.paymentNetwork, message.transactionHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 text-xs text-aura-purple hover:text-aura-purple/80 hover:bg-aura-purple/10 rounded transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        View on Explorer
                      </a>
                    </div>
                  )}

                  {message.paymentRequest && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-aura-purple/10 to-aura-cyan/10 border border-aura-purple/30 rounded-xl shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-aura-gradient flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                            <path d="M12 18V6" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Payment Required</p>
                          <p className="text-xs text-muted-foreground">Complete payment to continue</p>
                        </div>
                      </div>
                      <PaymentButton
                        wallet={wallet}
                        accepts={message.paymentAccepts || []}
                        defaultNetwork={message.paymentDefaultNetwork}
                        onPaymentSigned={async (envelope) => {
                          // Check if this is a chat retry action
                          if (message.paymentRequest?.paymentId && pendingActionsRef.current.has(message.paymentRequest.paymentId)) {
                            await retryPendingAction(message.paymentRequest.paymentId, envelope);
                            return;
                          }

                          // Store signed envelope (Legacy Flow)
                          const storeResponse = await fetch("/api/payment/store", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              paymentId: message.paymentRequest!.paymentId,
                              envelope,
                              endpoint: message.paymentRequest!.endpoint,
                            }),
                          });

                          if (storeResponse.ok) {
                            // Notify elizaOS that payment is ready
                            const notifyMessage = `Payment signed for ${message.paymentRequest!.endpoint}. Payment ID: ${message.paymentRequest!.paymentId}`;

                            const notifyResponse = await fetch("/api/chat", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                message: notifyMessage,
                                conversationId: currentConversationId,
                                walletAddress: account.address,
                                paymentId: message.paymentRequest!.paymentId,
                              }),
                            });

                            if (notifyResponse.ok) {
                              const data = await notifyResponse.json();
                              if (data.success) {
                                const paymentMessage: Message = {
                                  role: "assistant",
                                  content: data.response,
                                  timestamp: new Date().toISOString(),
                                };
                                setMessages((prev) => [...prev, paymentMessage]);
                              }
                            }
                          }
                        }}
                        onError={(error) => {
                          const errorMessage: Message = {
                            role: "assistant",
                            content: `Payment error: ${error.message}`,
                            timestamp: new Date().toISOString(),
                          };
                          setMessages((prev) => [...prev, errorMessage]);
                        }}
                      />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 opacity-70 px-1">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          {loading && !loadingHistory && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-none px-4 py-3 flex items-center space-x-2">
                <div className="w-2 h-2 bg-aura-purple/40 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-aura-purple/40 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 bg-aura-purple/40 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Attachment Preview (Bottom Bar) */}
      {attachedPreview && (
        <div className="px-4 py-2 border-t border-border bg-card/50 backdrop-blur-sm">
          <div className="relative inline-block group">
            <img
              src={attachedPreview}
              alt="Preview"
              className="max-h-20 rounded-lg border border-border"
            />
            <button
              onClick={removeAttachment}
              className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">{attachedFile?.name}</p>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-background">
        <div className="max-w-4xl mx-auto flex items-end gap-2 bg-muted/30 border border-border rounded-2xl p-2 shadow-sm focus-within:ring-1 focus-within:ring-primary/20 transition-shadow">
          {/* File attachment button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || recordingState !== "idle"}
            className="p-3 text-muted-foreground hover:text-aura-purple hover:bg-aura-purple/10 rounded-xl transition-colors disabled:opacity-50"
            title="Attach image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          {/* Microphone button */}
          <button
            onClick={recordingState === "recording" ? stopRecording : startRecording}
            disabled={loading || recordingState === "processing"}
            className={`p-3 rounded-xl transition-colors ${recordingState === "recording"
              ? "bg-red-500/10 text-red-500 animate-pulse ring-1 ring-red-500"
              : "text-muted-foreground hover:text-aura-purple hover:bg-aura-purple/10"
              } disabled:opacity-50`}
            title={recordingState === "recording" ? "Stop recording" : "Start recording"}
          >
            {recordingState === "processing" ? (
              <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>

          {/* Recording indicator */}
          {recordingState === "recording" && (
            <span className="text-sm text-red-500 font-medium self-center px-2">
              {formatTime(recordingTime)}
            </span>
          )}

          {/* Text input */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={recordingState === "recording" ? "Recording..." : "Type your message..."}
            rows={1}
            className="flex-1 max-h-32 px-3 py-3 bg-transparent border-none text-foreground placeholder-muted-foreground focus:outline-none focus:ring-0 text-sm sm:text-base resize-none"
            disabled={loading || recordingState !== "idle"}
            style={{ minHeight: '44px' }}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={loading || recordingState !== "idle" || (!input.trim() && !attachedFile)}
            className="p-3 bg-aura-gradient text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        <p className="text-center text-[10px] sm:text-xs text-muted-foreground mt-3 opacity-60">
          AI agents can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  );
}
