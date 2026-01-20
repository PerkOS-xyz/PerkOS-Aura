"use client";

import { useState, useEffect, useCallback } from "react";
import { useActiveAccount } from "thirdweb/react";
import Link from "next/link";

interface TierInfo {
  id: string;
  name: string;
  creditsPerMonth: number;
  priceUsd: number;
  discountPercent: number;
  features: string[];
}

interface CreditsState {
  balance: number;
  tier: string;
  tierInfo: TierInfo;
  subscriptionActive: boolean;
  canClaimMonthly: boolean;
  loading: boolean;
  error: string | null;
}

export function CreditsDisplay() {
  const account = useActiveAccount();
  const [credits, setCredits] = useState<CreditsState>({
    balance: 0,
    tier: "free",
    tierInfo: {
      id: "free",
      name: "Free",
      creditsPerMonth: 50,
      priceUsd: 0,
      discountPercent: 0,
      features: [],
    },
    subscriptionActive: false,
    canClaimMonthly: false,
    loading: true,
    error: null,
  });

  const fetchCredits = useCallback(async () => {
    if (!account?.address) {
      setCredits(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const response = await fetch(`/api/credits/balance?walletAddress=${account.address}`);
      const data = await response.json();

      if (data.success) {
        setCredits({
          balance: data.balance,
          tier: data.tier,
          tierInfo: data.tierInfo,
          subscriptionActive: data.subscriptionActive,
          canClaimMonthly: data.canClaimMonthly,
          loading: false,
          error: null,
        });
      } else {
        setCredits(prev => ({
          ...prev,
          loading: false,
          error: data.error || "Failed to fetch credits",
        }));
      }
    } catch (error) {
      setCredits(prev => ({
        ...prev,
        loading: false,
        error: "Network error",
      }));
    }
  }, [account?.address]);

  useEffect(() => {
    fetchCredits();
    // Refresh credits every 30 seconds
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, [fetchCredits]);

  // Don't show if no wallet connected
  if (!account?.address) {
    return null;
  }

  // Loading state
  if (credits.loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border animate-pulse">
        <div className="w-4 h-4 rounded-full bg-muted" />
        <span className="text-xs font-medium text-muted-foreground">...</span>
      </div>
    );
  }

  // Error state - just show simple indicator
  if (credits.error) {
    return (
      <Link
        href="/dashboard/subscription"
        className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors"
      >
        <span className="text-xs font-medium text-red-400">Credits Error</span>
      </Link>
    );
  }

  // Determine display style based on balance
  const isLow = credits.balance < 10 && credits.balance !== -1;
  const isUnlimited = credits.balance === -1 || credits.tier === "unlimited";

  // Tier badge colors
  const tierColors: Record<string, string> = {
    free: "bg-slate-500/20 text-slate-300",
    starter: "bg-blue-500/20 text-blue-300",
    pro: "bg-purple-500/20 text-purple-300",
    unlimited: "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300",
  };

  return (
    <Link
      href="/dashboard/subscription"
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all hover:scale-105 ${
        isLow
          ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
          : isUnlimited
          ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 hover:from-amber-500/20 hover:to-orange-500/20"
          : "bg-muted/50 border-border hover:bg-muted"
      }`}
      title={`${credits.tierInfo.name} tier - Click to manage subscription`}
    >
      {/* Credits icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-4 h-4 ${isLow ? "text-red-400" : isUnlimited ? "text-amber-400" : "text-aura-cyan"}`}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v12" />
        <path d="M6 12h12" />
      </svg>

      {/* Balance display */}
      <span className={`text-xs font-semibold ${isLow ? "text-red-400" : isUnlimited ? "text-amber-300" : "text-foreground"}`}>
        {isUnlimited ? "Unlimited" : credits.balance}
      </span>

      {/* Tier badge */}
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${tierColors[credits.tier] || tierColors.free}`}>
        {credits.tierInfo.name}
      </span>

      {/* Claim indicator */}
      {credits.canClaimMonthly && !isUnlimited && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      )}
    </Link>
  );
}

// Compact version for mobile
export function CreditsDisplayCompact() {
  const account = useActiveAccount();
  const [balance, setBalance] = useState<number | null>(null);
  const [tier, setTier] = useState<string>("free");

  useEffect(() => {
    if (!account?.address) return;

    fetch(`/api/credits/balance?walletAddress=${account.address}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBalance(data.balance);
          setTier(data.tier);
        }
      })
      .catch(() => {});
  }, [account?.address]);

  if (!account?.address || balance === null) return null;

  const isUnlimited = balance === -1 || tier === "unlimited";

  return (
    <Link
      href="/dashboard/subscription"
      className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="w-3 h-3"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v12" />
        <path d="M6 12h12" />
      </svg>
      <span>{isUnlimited ? "Unlimited" : balance}</span>
    </Link>
  );
}
