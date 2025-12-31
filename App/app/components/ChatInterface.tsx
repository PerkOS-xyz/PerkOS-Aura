"use client";

import { useState, useRef, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { PaymentButton } from "./PaymentButton";
import type { PaymentRequirements } from "@/lib/utils/x402-payment";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  paymentRequest?: PaymentRequirements & { paymentId: string };
}

interface ChatInterfaceProps {
  conversationId?: string;
}

export function ChatInterface({ conversationId: initialConversationId }: ChatInterfaceProps) {
  const account = useActiveAccount();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Log component initialization
  useEffect(() => {
    console.log("[ChatInterface] Component initialized", {
      hasAccount: !!account?.address,
      accountAddress: account?.address,
      initialConversationId,
      currentConversationId,
    });
  }, []);

  // Load conversation history on mount (only if conversationId was provided initially)
  // Don't reload when conversationId changes (to avoid overwriting new messages)
  const hasLoadedHistory = useRef(false);
  useEffect(() => {
    if (initialConversationId && account?.address && !hasLoadedHistory.current) {
      console.log("[ChatInterface] Loading initial conversation history on mount", {
        conversationId: initialConversationId,
        walletAddress: account.address,
      });
      setCurrentConversationId(initialConversationId);
      // Load history using the initialConversationId
      loadConversationHistory(initialConversationId);
      hasLoadedHistory.current = true;
    }
  }, [initialConversationId, account?.address]); // Wait for account, but only load once

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    console.log("[ChatInterface] Messages changed", {
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1],
    });
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversationHistory = async (conversationIdOverride?: string | null) => {
    const conversationIdToUse = conversationIdOverride || currentConversationId;

    if (!conversationIdToUse || !account?.address) {
      console.log("[ChatInterface] Skipping history load", {
        hasConversationId: !!conversationIdToUse,
        hasAccount: !!account?.address,
      });
      return;
    }

    try {
      console.log("[ChatInterface] Fetching conversation history", {
        conversationId: conversationIdToUse,
        walletAddress: account.address,
      });
      const response = await fetch(
        `/api/chat?walletAddress=${account.address}&conversationId=${conversationIdToUse}`
      );
      if (response.ok) {
        const data = await response.json();
        console.log("[ChatInterface] History loaded", {
          messageCount: data.messages?.length || 0,
          messages: data.messages,
        });
        setMessages(data.messages || []);
      } else {
        console.error("[ChatInterface] History load failed", {
          status: response.status,
          statusText: response.statusText,
        });
      }
    } catch (error) {
      console.error("[ChatInterface] Failed to load conversation history:", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !account?.address || loading) {
      console.log("[ChatInterface] handleSend skipped", {
        hasInput: !!input.trim(),
        hasAccount: !!account?.address,
        isLoading: loading,
      });
      return;
    }

    console.log("[ChatInterface] handleSend called", {
      message: input.trim(),
      conversationId: currentConversationId,
      walletAddress: account.address,
    });

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message to UI immediately
    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = input.trim();
    setInput("");
    setLoading(true);

    try {
      const requestBody = {
        message: messageToSend,
        conversationId: currentConversationId,
        walletAddress: account.address,
      };

      console.log("[ChatInterface] Sending chat request", {
        url: "/api/chat",
        method: "POST",
        body: requestBody,
      });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("[ChatInterface] Chat API response received", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      const data = await response.json();
      console.log("[ChatInterface] Chat API response data", {
        success: data.success,
        hasResponse: !!data.response,
        responseLength: data.response?.length,
        responsePreview: data.response?.substring(0, 200),
        conversationId: data.conversationId,
        error: data.error,
        message: data.message,
      });

      if (!response.ok || !data.success) {
        // Extract error message from response
        const errorMsg = data.error || data.message || "Failed to get response";
        console.error("[ChatInterface] Chat API error:", {
          status: response.status,
          error: errorMsg,
          fullData: data,
        });
        throw new Error(errorMsg);
      }

      // Update conversation ID if this is a new conversation
      if (data.conversationId && !currentConversationId) {
        console.log("[ChatInterface] New conversation ID received", {
          oldId: currentConversationId,
          newId: data.conversationId,
        });
        setCurrentConversationId(data.conversationId);
      }

      // Parse response for payment requests
      let paymentRequest: (PaymentRequirements & { paymentId: string }) | undefined;
      let responseContent = data.response;

      console.log("[ChatInterface] Parsing response for payment request", {
        responseLength: data.response?.length,
        containsJsonBlock: /```json/.test(data.response || ""),
      });

      // Check if response contains payment request (JSON format)
      try {
        // Match JSON code block (handles multi-line JSON)
        const paymentMatch = data.response.match(/```json\n([\s\S]*?)\n```/);
        if (paymentMatch) {
          console.log("[ChatInterface] Found JSON code block", {
            matchLength: paymentMatch[1].length,
            matchPreview: paymentMatch[1].substring(0, 100),
          });

          const jsonContent = paymentMatch[1].trim();
          const paymentData = JSON.parse(jsonContent);
          console.log("[ChatInterface] Parsed payment data", {
            hasPaymentRequest: !!paymentData.paymentRequest,
            paymentRequest: paymentData.paymentRequest,
          });

          if (paymentData.paymentRequest) {
            paymentRequest = paymentData.paymentRequest;
            // Remove the JSON block from content
            responseContent = data.response.replace(/```json\n[\s\S]*?\n```/g, "").trim();
            console.log("[ChatInterface] Payment request extracted", {
              paymentId: paymentRequest?.paymentId,
              endpoint: paymentRequest?.endpoint,
              price: paymentRequest?.price,
              network: paymentRequest?.network,
              cleanedContent: responseContent,
            });
          }
        } else {
          console.log("[ChatInterface] No JSON code block found in response");
        }
      } catch (e) {
        // Not a payment request, continue normally
        console.debug("[ChatInterface] Payment request parsing failed (not a payment request):", e);
      }

      // Add assistant response
      const assistantMessage: Message = {
        role: "assistant",
        content: responseContent,
        timestamp: new Date().toISOString(),
        paymentRequest,
      };

      console.log("[ChatInterface] Adding assistant message", {
        contentLength: responseContent.length,
        hasPaymentRequest: !!paymentRequest,
        message: assistantMessage,
      });

      setMessages((prev) => {
        const newMessages = [...prev, assistantMessage];
        console.log("[ChatInterface] Messages updated", {
          totalMessages: newMessages.length,
          lastMessage: newMessages[newMessages.length - 1],
        });
        return newMessages;
      });
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
      console.log("[ChatInterface] handleSend completed");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      console.log("[ChatInterface] Enter key pressed, sending message");
      handleSend();
    }
  };

  if (!account?.address) {
    console.log("[ChatInterface] No account connected, showing connect message");
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">Please connect your wallet to use the chat</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="mb-2">Start a conversation with your AI agent</p>
            <p className="text-sm">
              Ask questions, create tokens, or get help with API operations
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-gray-100"
                  }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.paymentRequest && (
                  <div className="mt-3">
                    <PaymentButton
                      requirements={message.paymentRequest}
                      onPaymentSigned={async (envelope) => {
                        console.log("[ChatInterface] Payment signed callback", {
                          paymentId: message.paymentRequest!.paymentId,
                          endpoint: message.paymentRequest!.endpoint,
                          envelope: {
                            network: envelope.network,
                            from: envelope.authorization.from,
                            to: envelope.authorization.to,
                            value: envelope.authorization.value,
                          },
                        });

                        // Store signed envelope
                        console.log("[ChatInterface] Storing payment envelope", {
                          paymentId: message.paymentRequest!.paymentId,
                          endpoint: message.paymentRequest!.endpoint,
                        });

                        const storeResponse = await fetch("/api/payment/store", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            paymentId: message.paymentRequest!.paymentId,
                            envelope,
                            endpoint: message.paymentRequest!.endpoint,
                          }),
                        });

                        console.log("[ChatInterface] Payment store response", {
                          status: storeResponse.status,
                          ok: storeResponse.ok,
                        });

                        if (storeResponse.ok) {
                          // Notify elizaOS that payment is ready
                          const notifyMessage = `Payment signed for ${message.paymentRequest!.endpoint}. Payment ID: ${message.paymentRequest!.paymentId}`;
                          console.log("[ChatInterface] Notifying elizaOS of payment", {
                            message: notifyMessage,
                            conversationId: currentConversationId,
                            walletAddress: account.address,
                            paymentId: message.paymentRequest!.paymentId,
                          });

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

                          console.log("[ChatInterface] elizaOS notification response", {
                            status: notifyResponse.status,
                            ok: notifyResponse.ok,
                          });

                          if (notifyResponse.ok) {
                            const data = await notifyResponse.json();
                            console.log("[ChatInterface] elizaOS notification data", {
                              success: data.success,
                              hasResponse: !!data.response,
                              response: data.response,
                            });

                            if (data.success) {
                              const paymentMessage: Message = {
                                role: "assistant",
                                content: data.response,
                                timestamp: new Date().toISOString(),
                              };
                              console.log("[ChatInterface] Adding payment completion message", {
                                message: paymentMessage,
                              });
                              setMessages((prev) => [...prev, paymentMessage]);
                            }
                          } else {
                            console.error("[ChatInterface] elizaOS notification failed", {
                              status: notifyResponse.status,
                              statusText: notifyResponse.statusText,
                            });
                          }
                        } else {
                          console.error("[ChatInterface] Payment store failed", {
                            status: storeResponse.status,
                            statusText: storeResponse.statusText,
                          });
                        }
                      }}
                      onError={(error) => {
                        console.error("[ChatInterface] Payment button error", {
                          error: error.message,
                          stack: error.stack,
                        });
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

      {/* Input Area */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Your personal AI agent • Conversation ID: {currentConversationId || "New"}
        </p>
      </div>
    </div>
  );
}

