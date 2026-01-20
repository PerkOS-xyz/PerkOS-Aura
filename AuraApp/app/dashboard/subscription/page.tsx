"use client";

import { useState, useEffect, useCallback } from "react";
import { useActiveAccount } from "thirdweb/react";
import { PaymentButton, type AcceptOption } from "@perkos/ui-payment";
import { useThirdwebWallet } from "@perkos/ui-payment-thirdweb";
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
  availableTiers: TierInfo[];
  loading: boolean;
  error: string | null;
}

interface SubscriptionInvoice {
  id: string;
  tier: string;
  tierName: string;
  priceUsd: number;
  creditsIncluded: number;
  discountPercent: number;
  transactionHash?: string;
  paymentNetwork?: string;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
  status: "active" | "expired" | "pending";
  periodStart: string;
  periodEnd: string;
}

// Helper function to get block explorer URL based on network
function getExplorerUrl(transactionHash: string, network?: string): string {
  const chainId = network?.split(":")[1];

  const explorers: Record<string, string> = {
    "1": "https://etherscan.io/tx/",
    "8453": "https://basescan.org/tx/",
    "84532": "https://sepolia.basescan.org/tx/",
    "43114": "https://snowtrace.io/tx/",
    "43113": "https://testnet.snowtrace.io/tx/",
    "42220": "https://celoscan.io/tx/",
  };

  const baseUrl = chainId ? explorers[chainId] || "https://etherscan.io/tx/" : "https://snowtrace.io/tx/";
  return `${baseUrl}${transactionHash}`;
}

// Helper to format network display name
function getNetworkName(network?: string): string {
  const chainId = network?.split(":")[1];

  const names: Record<string, string> = {
    "1": "Ethereum",
    "8453": "Base",
    "84532": "Base Sepolia",
    "43114": "Avalanche",
    "43113": "Avalanche Fuji",
    "42220": "Celo",
  };

  return chainId ? names[chainId] || `Chain ${chainId}` : "Unknown";
}

// Payment Modal Component
function PaymentModal({
  tier,
  accepts,
  wallet,
  onSuccess,
  onError,
  onClose,
}: {
  tier: TierInfo;
  accepts: AcceptOption[];
  wallet: ReturnType<typeof useThirdwebWallet>;
  onSuccess: (envelope: unknown) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Subscribe to {tier.name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Complete payment to activate your subscription
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-5 h-5"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Plan Summary */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="font-medium">{tier.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Credits</span>
              <span className="font-medium">
                {tier.creditsPerMonth === -1 ? "Unlimited" : `${tier.creditsPerMonth}/month`}
              </span>
            </div>
            {tier.discountPercent > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">x402 Discount</span>
                <span className="font-medium text-green-400">{tier.discountPercent}% off</span>
              </div>
            )}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="font-medium">Total</span>
              <span className="text-2xl font-bold">${tier.priceUsd}</span>
            </div>
          </div>

          {/* Payment Button */}
          <div className="space-y-3">
            <PaymentButton
              wallet={wallet}
              accepts={accepts}
              onPaymentSigned={onSuccess}
              onError={onError}
              className="w-full"
            />
            <p className="text-xs text-center text-muted-foreground">
              Payment is processed securely via x402 protocol
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const account = useActiveAccount();
  const wallet = useThirdwebWallet();
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
    availableTiers: [],
    loading: true,
    error: null,
  });
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [paymentRequirements, setPaymentRequirements] = useState<{
    tier: TierInfo;
    accepts: AcceptOption[];
  } | null>(null);

  // Fetch credits and subscription info
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
          availableTiers: data.availableTiers || [],
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

  // Fetch user's subscription invoices
  const fetchInvoices = useCallback(async () => {
    if (!account?.address) return;

    try {
      const response = await fetch(`/api/subscription/invoices?walletAddress=${account.address}`);
      const data = await response.json();

      if (data.success) {
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    }
  }, [account?.address]);

  useEffect(() => {
    fetchCredits();
    fetchInvoices();
  }, [fetchCredits, fetchInvoices]);

  // Claim monthly credits
  const handleClaim = async () => {
    if (!account?.address) return;

    setClaiming(true);
    setClaimResult(null);

    try {
      const response = await fetch("/api/credits/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: account.address }),
      });

      const data = await response.json();

      if (data.success) {
        setClaimResult(`Successfully claimed ${data.creditsAdded} credits!`);
        fetchCredits();
      } else {
        setClaimResult(data.error || "Failed to claim credits");
      }
    } catch (error) {
      setClaimResult("Network error while claiming credits");
    } finally {
      setClaiming(false);
    }
  };

  // Start subscription upgrade
  const handleSubscribe = async (tier: TierInfo) => {
    if (!account?.address) return;

    setSubscribing(tier.id);

    try {
      const response = await fetch(
        `/api/payment/requirements?endpoint=/api/subscription/${tier.id}&walletAddress=${account.address}`
      );
      const data = await response.json();

      if (data.accepts && data.accepts.length > 0) {
        setPaymentRequirements({ tier, accepts: data.accepts });
      } else {
        setSubscribing(null);
        alert("Failed to get payment requirements");
      }
    } catch (error) {
      setSubscribing(null);
      alert("Network error while getting payment requirements");
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = async (envelope: unknown) => {
    if (!subscribing || !account?.address || !paymentRequirements) return;

    try {
      const paymentPayload = {
        x402Version: 2,
        scheme: "exact",
        network: (envelope as { network?: string })?.network,
        payload: envelope,
      };

      const response = await fetch(`/api/subscription/${subscribing}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "PAYMENT-SIGNATURE": btoa(JSON.stringify(paymentPayload)),
        },
        body: JSON.stringify({ walletAddress: account.address }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully subscribed to ${data.subscription.name} plan!`);
        fetchCredits();
        fetchInvoices();
      } else {
        alert(data.error || "Subscription failed");
      }
    } catch (error) {
      alert("Network error while processing subscription");
    } finally {
      setSubscribing(null);
      setPaymentRequirements(null);
    }
  };

  // Close payment modal
  const handleClosePayment = () => {
    setSubscribing(null);
    setPaymentRequirements(null);
  };

  // Tier card colors and gradients
  const tierStyles: Record<string, {
    bg: string;
    border: string;
    text: string;
    button: string;
    glow: string;
  }> = {
    free: {
      bg: "bg-slate-900/50",
      border: "border-slate-700",
      text: "text-slate-300",
      button: "bg-slate-700 hover:bg-slate-600",
      glow: "",
    },
    starter: {
      bg: "bg-gradient-to-br from-blue-950/50 to-blue-900/30",
      border: "border-blue-500/50",
      text: "text-blue-400",
      button: "bg-blue-600 hover:bg-blue-500",
      glow: "shadow-blue-500/20",
    },
    pro: {
      bg: "bg-gradient-to-br from-purple-950/50 to-purple-900/30",
      border: "border-purple-500/50",
      text: "text-purple-400",
      button: "bg-purple-600 hover:bg-purple-500",
      glow: "shadow-purple-500/20",
    },
    unlimited: {
      bg: "bg-gradient-to-br from-amber-950/50 via-orange-900/30 to-yellow-900/20",
      border: "border-amber-500/50",
      text: "text-amber-400",
      button: "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500",
      glow: "shadow-amber-500/20",
    },
  };

  if (!account?.address) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 mb-6 rounded-2xl bg-muted/50 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-muted-foreground">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Subscription Management</h1>
        <p className="text-muted-foreground max-w-md">
          Connect your wallet to view and manage your subscription plans.
        </p>
      </div>
    );
  }

  if (credits.loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-muted-foreground">Loading subscription info...</p>
      </div>
    );
  }

  const currentStyle = tierStyles[credits.tier] || tierStyles.free;

  return (
    <div className="min-h-screen">
      {/* Payment Modal */}
      {paymentRequirements && (
        <PaymentModal
          tier={paymentRequirements.tier}
          accepts={paymentRequirements.accepts}
          wallet={wallet}
          onSuccess={handlePaymentSuccess}
          onError={(error) => {
            console.error("Payment error:", error);
            handleClosePayment();
          }}
          onClose={handleClosePayment}
        />
      )}

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Subscription</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage your membership and credits
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors w-full sm:w-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Current Status Card */}
        <div className={`rounded-2xl p-4 sm:p-6 border-2 ${currentStyle.bg} ${currentStyle.border} shadow-lg ${currentStyle.glow}`}>
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Plan Info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">Current Plan</p>
                <h2 className={`text-xl sm:text-2xl font-bold ${currentStyle.text}`}>
                  {credits.tierInfo.name}
                </h2>
                {credits.subscriptionActive && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-xs sm:text-sm text-green-400">Active Subscription</p>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                <div className="text-center min-w-[80px]">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Credits</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1">
                    {credits.balance === -1 ? "∞" : credits.balance}
                  </p>
                </div>

                {credits.tierInfo.discountPercent > 0 && (
                  <div className="text-center min-w-[80px]">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Discount</p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-400 mt-1">
                      {credits.tierInfo.discountPercent}%
                    </p>
                  </div>
                )}

                {credits.canClaimMonthly && credits.tier !== "unlimited" && (
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 hover:bg-green-500 rounded-xl font-medium transition-all disabled:opacity-50 text-sm sm:text-base shadow-lg shadow-green-600/20 hover:shadow-green-500/30 flex-shrink-0"
                  >
                    {claiming ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Claiming...
                      </span>
                    ) : (
                      `Claim ${credits.tierInfo.creditsPerMonth} Credits`
                    )}
                  </button>
                )}
              </div>
            </div>

            {claimResult && (
              <p className={`text-sm ${claimResult.includes("Successfully") ? "text-green-400" : "text-red-400"}`}>
                {claimResult}
              </p>
            )}
          </div>
        </div>

        {/* Subscription Tiers */}
        <div>
          <h3 className="text-lg sm:text-xl font-semibold mb-4">Available Plans</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {credits.availableTiers.map((tier) => {
              const isCurrentTier = tier.id === credits.tier;
              const style = tierStyles[tier.id] || tierStyles.free;
              const isLoading = subscribing === tier.id && !paymentRequirements;

              return (
                <div
                  key={tier.id}
                  className={`relative rounded-2xl p-4 sm:p-5 border-2 transition-all duration-300 ${style.bg} ${
                    isCurrentTier ? style.border : "border-border hover:border-muted-foreground/50"
                  } ${isCurrentTier ? `ring-2 ring-offset-2 ring-offset-background ring-primary/50 shadow-lg ${style.glow}` : "hover:shadow-lg"}`}
                >
                  {/* Popular badge for Pro */}
                  {tier.id === "pro" && !isCurrentTier && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">
                      Popular
                    </div>
                  )}

                  {/* Tier Header */}
                  <div className="mb-4">
                    <h4 className={`text-base sm:text-lg font-bold ${style.text}`}>{tier.name}</h4>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-2xl sm:text-3xl font-bold">${tier.priceUsd}</span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                  </div>

                  {/* Credits & Discount */}
                  <div className="space-y-2 mb-4">
                    <p className="text-sm flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${style.text}`}>
                        <circle cx="10" cy="10" r="8" />
                      </svg>
                      <span>
                        <span className="font-medium">
                          {tier.creditsPerMonth === -1 ? "Unlimited" : tier.creditsPerMonth}
                        </span>{" "}
                        credits/month
                      </span>
                    </p>
                    {tier.discountPercent > 0 && (
                      <p className="text-sm text-green-400 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.531.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.061l5.25-5.25a.75.75 0 011.06 0l3.074 3.073a20.923 20.923 0 015.545-4.931l-3.042-.815a.75.75 0 01-.53-.919z" clipRule="evenodd" />
                        </svg>
                        {tier.discountPercent}% discount on x402
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-1.5 mb-5">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Action Button */}
                  <div>
                    {isCurrentTier ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-muted/50 text-muted-foreground rounded-xl text-sm font-medium border border-border"
                      >
                        Current Plan
                      </button>
                    ) : tier.id === "free" ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-muted/50 text-muted-foreground rounded-xl text-sm font-medium border border-border"
                      >
                        Default
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(tier)}
                        disabled={isLoading}
                        className={`w-full py-2.5 ${style.button} rounded-xl text-sm font-medium transition-all disabled:opacity-50 shadow-lg hover:shadow-xl`}
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Loading...
                          </span>
                        ) : (
                          `Upgrade to ${tier.name}`
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription History / Invoices */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-semibold">Payment History</h3>
            {invoices.length > 0 && (
              <span className="text-xs sm:text-sm text-muted-foreground">
                {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {invoices.length === 0 ? (
            <div className="bg-muted/20 rounded-2xl p-8 sm:p-12 text-center border border-border">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="w-8 h-8 text-muted-foreground"
                >
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-muted-foreground font-medium">No subscription payments yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Subscribe to a plan above to see your payment history here.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3">
                {invoices.map((invoice) => {
                  const statusColors = {
                    active: "bg-green-500/20 text-green-400 border-green-500/30",
                    expired: "bg-gray-500/20 text-gray-400 border-gray-500/30",
                    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                  };

                  return (
                    <div key={invoice.id} className="bg-muted/20 rounded-xl p-4 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium capitalize">{invoice.tierName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(invoice.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-lg border ${statusColors[invoice.status]}`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Amount</p>
                          <p className="font-semibold">${invoice.priceUsd.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Credits</p>
                          <p className="font-medium">
                            {invoice.creditsIncluded === -1 ? "Unlimited" : invoice.creditsIncluded}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Period</p>
                          <p className="text-xs">
                            {new Date(invoice.periodStart).toLocaleDateString()} - {new Date(invoice.periodEnd).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Network</p>
                          <p className="text-xs">{invoice.paymentNetwork ? getNetworkName(invoice.paymentNetwork) : "-"}</p>
                        </div>
                      </div>

                      {invoice.transactionHash && (
                        <a
                          href={getExplorerUrl(invoice.transactionHash, invoice.paymentNetwork)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm text-primary transition-colors"
                        >
                          <span className="font-mono text-xs">{invoice.transactionHash.slice(0, 12)}...</span>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                            <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                          </svg>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block bg-muted/20 rounded-2xl overflow-hidden border border-border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Invoice</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Period</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Transaction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {invoices.map((invoice) => {
                        const statusColors = {
                          active: "bg-green-500/20 text-green-400",
                          expired: "bg-gray-500/20 text-gray-400",
                          pending: "bg-yellow-500/20 text-yellow-400",
                        };

                        return (
                          <tr key={invoice.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium">
                                {new Date(invoice.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {invoice.id.slice(0, 12)}...
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium capitalize">{invoice.tierName}</div>
                              <div className="text-xs text-muted-foreground">
                                {invoice.creditsIncluded === -1
                                  ? "Unlimited credits"
                                  : `${invoice.creditsIncluded} credits`}
                                {invoice.discountPercent > 0 && (
                                  <span className="text-green-400 ml-1">
                                    +{invoice.discountPercent}% off
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm">
                                {new Date(invoice.periodStart).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                to {new Date(invoice.periodEnd).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-semibold">${invoice.priceUsd.toFixed(2)}</div>
                              {invoice.paymentNetwork && (
                                <div className="text-xs text-muted-foreground">
                                  {getNetworkName(invoice.paymentNetwork)}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg ${statusColors[invoice.status]}`}
                              >
                                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {invoice.transactionHash ? (
                                <a
                                  href={getExplorerUrl(invoice.transactionHash, invoice.paymentNetwork)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  <span className="font-mono text-xs">
                                    {invoice.transactionHash.slice(0, 8)}...
                                  </span>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="w-3 h-3"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
                                      clipRule="evenodd"
                                    />
                                    <path
                                      fillRule="evenodd"
                                      d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </a>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
