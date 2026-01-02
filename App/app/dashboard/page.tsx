"use client";

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import Link from "next/link";
import { ChatInterface } from "../components/ChatInterface";

/**
 * Format wallet address to show first 6 and last 6 characters
 * "0xc2564e41b7f5cb66d2d99466450cfebce9e8228f" -> "0xc256...8228f"
 */
function formatAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export default function DashboardPage() {
  const account = useActiveAccount();
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (!account?.address) return;

    try {
      await navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold font-heading mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Aura Dashboard
        </h1>
        <p className="text-muted-foreground">
          Interact with your personal AI agent to analyze images, generate art, and more.
        </p>
      </div>

      {/* Wallet Info */}
      <div className="bg-card border border-border rounded-xl p-6 backdrop-blur-sm mb-8">
        <div className="text-sm text-muted-foreground mb-2">Wallet Address</div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-mono text-foreground">
            {account?.address ? formatAddress(account.address) : "Not connected"}
          </div>
          {account?.address && (
            <button
              onClick={handleCopyAddress}
              className="p-1.5 hover:bg-slate-700/50 rounded transition-colors group"
              title="Copy address"
            >
              {copied ? (
                <svg
                  className="w-4 h-4 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-card border border-border rounded-xl p-6 backdrop-blur-sm h-[600px] flex flex-col">
        <h2 className="text-xl font-semibold font-heading text-foreground mb-4">
          AI Agent Chat
        </h2>
        <div className="flex-1 bg-muted/50 rounded-lg overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}

