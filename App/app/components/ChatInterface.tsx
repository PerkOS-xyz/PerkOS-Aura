"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useActiveAccount } from "thirdweb/react";
import { PaymentButton } from "./PaymentButton";
import type { PaymentRequirements } from "@/lib/utils/x402-payment";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  paymentRequest?: PaymentRequirements & { paymentId: string };
  attachmentType?: "audio" | "image";
  attachmentPreview?: string;
}

interface ChatInterfaceProps {
  conversationId?: string;
  projectId?: string;
  onConversationChange?: (conversationId: string, firstMessage?: string) => void;
}

// Recording states
type RecordingState = "idle" | "recording" | "processing";

export function ChatInterface({
  conversationId: initialConversationId,
  projectId,
  onConversationChange
}: ChatInterfaceProps) {
  const account = useActiveAccount();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    initialConversationId || null
  );
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
        // If so, don't reload from server - we already have the messages
        if (locallyCreatedConversationsRef.current.has(initialConversationId)) {
          console.log("[ChatInterface] Locally created conversation - skipping server load");
          // Just update the current conversation ID, keep existing messages
          setCurrentConversationId(initialConversationId);
          hasHadConversationRef.current = true;
          return;
        }

        console.log("[ChatInterface] Loading conversation from server:", initialConversationId);
        // Load existing conversation (user clicked on a conversation in the list)
        setCurrentConversationId(initialConversationId);
        loadConversationHistory(initialConversationId);
        hasHadConversationRef.current = true;
      } else if (previousId !== undefined) {
        // New conversation requested (user clicked "New Chat")
        // Only clear if we previously had a conversation selected
        if (hasHadConversationRef.current) {
          console.log("[ChatInterface] New Chat requested - clearing messages");
          setCurrentConversationId(null);
          setMessages([]);
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
      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("walletAddress", account.address);
      formData.append("conversationId", currentConversationId || generateConversationId() || "");
      if (projectId) {
        formData.append("projectId", projectId);
      }

      // Call chat API with audio
      const response = await fetch("/api/chat/audio", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update conversation ID if new
        if (data.conversationId && !currentConversationId) {
          // Mark this conversation as locally created so we don't reload from server
          locallyCreatedConversationsRef.current.add(data.conversationId);
          setCurrentConversationId(data.conversationId);
          onConversationChange?.(data.conversationId, `🎤 "${data.transcription}"`);
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

    // Create user message
    const userMessage: Message = {
      role: "user",
      content: messageText || (hasAttachment ? "📎 [Image attached]" : ""),
      timestamp: new Date().toISOString(),
      attachmentType: hasAttachment ? "image" : undefined,
      attachmentPreview: attachedPreview || undefined,
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

      if (fileToSend) {
        // Send with image attachment
        const formData = new FormData();
        formData.append("walletAddress", account.address);
        formData.append("conversationId", currentConversationId || generateConversationId() || "");
        formData.append("message", messageText || "Analyze this image");
        formData.append("image", fileToSend);
        if (projectId) {
          formData.append("projectId", projectId);
        }

        response = await fetch("/api/chat/image", {
          method: "POST",
          body: formData,
        });
      } else {
        // Send text-only message
        const requestBody = {
          message: messageText,
          conversationId: currentConversationId,
          walletAddress: account.address,
          projectId: projectId || null,
        };

        response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
      }

      data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || data.message || "Failed to get response";
        throw new Error(errorMsg);
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
        if (needsNotification) {
          notifiedConversationsRef.current.add(data.conversationId);
          console.log("[ChatInterface] Calling onConversationChange to add to sidebar...");
          onConversationChange?.(data.conversationId, messageText || userMessage.content);
        }
      }

      // Parse response for payment requests
      let paymentRequest: (PaymentRequirements & { paymentId: string }) | undefined;
      let responseContent = data.response;

      // Check if response contains payment request (JSON format)
      try {
        const paymentMatch = data.response.match(/```json\n([\s\S]*?)\n```/);
        if (paymentMatch) {
          const jsonContent = paymentMatch[1].trim();
          const paymentData = JSON.parse(jsonContent);

          if (paymentData.paymentRequest) {
            paymentRequest = paymentData.paymentRequest;
            responseContent = data.response.replace(/```json\n[\s\S]*?\n```/g, "").trim();
          }
        }
      } catch {
        // Not a payment request
      }

      // Add assistant response
      const assistantMessage: Message = {
        role: "assistant",
        content: responseContent,
        timestamp: new Date().toISOString(),
        paymentRequest,
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

  if (!account?.address) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">Please connect your wallet to use the chat</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="mb-2">Start a conversation with your AI agent</p>
            <p className="text-sm mb-4">
              Ask questions about AI services or get help with API operations
            </p>
            <div className="flex justify-center gap-4 text-xs">
              <span className="px-2 py-1 bg-muted rounded">🎤 Voice input</span>
              <span className="px-2 py-1 bg-muted rounded">📎 Image analysis</span>
              <span className="px-2 py-1 bg-muted rounded">💬 Text chat</span>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
                  }`}
              >
                {/* Show image preview if attached */}
                {message.attachmentPreview && (
                  <div className="mb-2">
                    <img
                      src={message.attachmentPreview}
                      alt="Attached"
                      className="max-w-full max-h-48 rounded object-contain"
                    />
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.paymentRequest && (
                  <div className="mt-3">
                    <PaymentButton
                      requirements={message.paymentRequest}
                      onPaymentSigned={async (envelope) => {
                        // Store signed envelope
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
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview */}
      {attachedPreview && (
        <div className="px-4 py-2 border-t border-border">
          <div className="relative inline-block">
            <img
              src={attachedPreview}
              alt="Preview"
              className="max-h-24 rounded object-contain"
            />
            <button
              onClick={removeAttachment}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{attachedFile?.name}</p>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border p-4 flex-shrink-0">
        <div className="flex items-center space-x-2">
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
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
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
            className={`p-2 rounded-lg transition-colors ${recordingState === "recording"
              ? "bg-red-500 text-white animate-pulse"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
            <span className="text-sm text-red-500 font-medium">
              {formatTime(recordingTime)}
            </span>
          )}

          {/* Text input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={recordingState === "recording" ? "Recording..." : "Type your message..."}
            className="flex-1 px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
            disabled={loading || recordingState !== "idle"}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={loading || recordingState !== "idle" || (!input.trim() && !attachedFile)}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Your personal AI agent • Wallet: {account.address.slice(0, 6)}...{account.address.slice(-4)} •
          Conversation: {currentConversationId?.slice(0, 20) || "New"}...
        </p>
      </div>
    </div>
  );
}
