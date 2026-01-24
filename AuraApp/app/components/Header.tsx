"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton, useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { inAppWallet } from "thirdweb/wallets";
import { avalanche, avalancheFuji, base, baseSepolia, celo, celoSepoliaTestnet, ethereum } from "thirdweb/chains";
import { unichain } from "@/app/providers";
import { client } from "@/lib/client";

// Supported chains (Unichain is now the primary network)
const supportedChains = [
  unichain,
  avalanche,
  base,
  celo,
  ethereum,
  avalancheFuji,
  baseSepolia,
  celoSepoliaTestnet,
];

// Define wallets
const supportedWallets = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("walletConnect"),
  inAppWallet({
    auth: {
      options: ["email", "google", "apple"],
    },
  }),
].filter((wallet) => wallet && typeof wallet === "object");

interface NavItem {
  href: string;
  label: string;
  requiresAuth?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard", requiresAuth: true },
  { href: "/docs", label: "Docs" },
];

// Network configurations
const networkConfig: Record<number, { name: string; color: string; isTestnet: boolean }> = {
  130: { name: "Unichain", color: "#FF007A", isTestnet: false },  // Uniswap pink
  1: { name: "Ethereum", color: "#627EEA", isTestnet: false },
  43114: { name: "Avalanche", color: "#E84142", isTestnet: false },
  43113: { name: "Fuji", color: "#E84142", isTestnet: true },
  8453: { name: "Base", color: "#0052FF", isTestnet: false },
  84532: { name: "Base Sepolia", color: "#0052FF", isTestnet: true },
  42220: { name: "Celo", color: "#35D07F", isTestnet: false },
  11142220: { name: "Celo Sepolia", color: "#35D07F", isTestnet: true },
};

// Tier configurations
const tierConfig: Record<string, { gradient: string; badge: string }> = {
  free: {
    gradient: "from-slate-500/20 to-slate-600/20",
    badge: "bg-slate-500/30 text-slate-300",
  },
  starter: {
    gradient: "from-blue-500/20 to-blue-600/20",
    badge: "bg-blue-500/30 text-blue-300",
  },
  pro: {
    gradient: "from-purple-500/20 to-purple-600/20",
    badge: "bg-purple-500/30 text-purple-300",
  },
  unlimited: {
    gradient: "from-amber-500/20 to-orange-500/20",
    badge: "bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300",
  },
};

interface CreditsState {
  balance: number;
  tier: string;
  tierName: string;
  discountPercent: number;
  canClaimMonthly: boolean;
  loading: boolean;
  error: string | null;
}

// Integrated Credits Display Component
function AccountCredits() {
  const account = useActiveAccount();
  const [credits, setCredits] = useState<CreditsState>({
    balance: 0,
    tier: "free",
    tierName: "Free",
    discountPercent: 0,
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
          tierName: data.tierInfo?.name || "Free",
          discountPercent: data.tierInfo?.discountPercent || 0,
          canClaimMonthly: data.canClaimMonthly,
          loading: false,
          error: null,
        });
      } else {
        setCredits(prev => ({ ...prev, loading: false, error: "Error" }));
      }
    } catch {
      setCredits(prev => ({ ...prev, loading: false, error: "Error" }));
    }
  }, [account?.address]);

  useEffect(() => {
    fetchCredits();
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, [fetchCredits]);

  if (!account?.address) return null;

  const tier = tierConfig[credits.tier] || tierConfig.free;
  const isUnlimited = credits.balance === -1 || credits.tier === "unlimited";
  const isLow = credits.balance < 10 && !isUnlimited;

  if (credits.loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30 border border-border/50 animate-pulse">
        <div className="w-4 h-4 rounded-full bg-muted" />
        <div className="w-12 h-3 rounded bg-muted" />
      </div>
    );
  }

  return (
    <Link
      href="/dashboard/subscription"
      className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
        isLow
          ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/15 hover:border-red-500/50"
          : `bg-gradient-to-r ${tier.gradient} border-white/10 hover:border-white/20`
      }`}
    >
      {/* Credits Icon */}
      <div className={`relative flex items-center justify-center w-7 h-7 rounded-lg ${
        isLow ? "bg-red-500/20" : isUnlimited ? "bg-amber-500/20" : "bg-white/10"
      }`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          className="w-4 h-4"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke={isLow ? "#EF4444" : isUnlimited ? "#F59E0B" : "#22D3EE"}
            strokeWidth="2"
          />
          <path
            d="M12 8v8M8 12h8"
            stroke={isLow ? "#EF4444" : isUnlimited ? "#F59E0B" : "#22D3EE"}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        {/* Claim indicator */}
        {credits.canClaimMonthly && !isUnlimited && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
        )}
      </div>

      {/* Credits Info */}
      <div className="flex flex-col">
        <span className={`text-sm font-bold leading-none ${
          isLow ? "text-red-400" : isUnlimited ? "text-amber-300" : "text-foreground"
        }`}>
          {isUnlimited ? "∞" : credits.balance}
        </span>
        <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
          credits
        </span>
      </div>

      {/* Tier Badge */}
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${tier.badge}`}>
        {credits.tierName}
      </span>

      {/* Discount indicator */}
      {credits.discountPercent > 0 && (
        <span className="text-[10px] font-medium text-green-400 hidden sm:block">
          -{credits.discountPercent}%
        </span>
      )}

      {/* Hover arrow */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <path fillRule="evenodd" d="M5 10a.75.75 0 01.75-.75h6.638L10.23 7.29a.75.75 0 111.04-1.08l3.5 3.25a.75.75 0 010 1.08l-3.5 3.25a.75.75 0 11-1.04-1.08l2.158-1.96H5.75A.75.75 0 015 10z" clipRule="evenodd" />
      </svg>
    </Link>
  );
}

// Network Badge Component
function NetworkBadge() {
  const activeChain = useActiveWalletChain();

  if (!activeChain) return null;

  const network = networkConfig[activeChain.id] || {
    name: `Chain ${activeChain.id}`,
    color: "#6B7280",
    isTestnet: false,
  };

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/30 border border-border/50">
      <div
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ backgroundColor: network.color }}
      />
      <span className="text-xs font-medium text-muted-foreground">
        {network.name}
      </span>
      {network.isTestnet && (
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 uppercase">
          Test
        </span>
      )}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const account = useActiveAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!account) {
        setIsAdmin(false);
        return;
      }
      try {
        const response = await fetch(`/api/admin/wallet/check?wallet=${account.address}`);
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin || false);
        }
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [account]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-black/5"
          : "bg-background/60 backdrop-blur-md border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5 flex-shrink-0">
            {/* Logo mark */}
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE] p-[1px] transition-transform duration-300 group-hover:scale-110">
              <div className="w-full h-full rounded-xl bg-background flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  <path
                    d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="url(#logo-gradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <defs>
                    <linearGradient id="logo-gradient" x1="2" y1="2" x2="22" y2="22">
                      <stop stopColor="#8B5CF6" />
                      <stop offset="1" stopColor="#22D3EE" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE] opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40" />
            </div>
            {/* Logo text */}
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] transition-all duration-300 group-hover:drop-shadow-[0_0_12px_rgba(139,92,246,0.5)]">
              Aura
            </span>
          </Link>

          {/* Center Navigation - Desktop */}
          <nav className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-full bg-muted/30 border border-border/50">
            {navItems.map((item) => {
              if (item.requiresAuth && !account) return null;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-full bg-background border border-border shadow-sm" />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className={`relative px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                  pathname?.startsWith("/admin")
                    ? "text-aura-cyan"
                    : "text-muted-foreground hover:text-aura-cyan"
                }`}
              >
                {pathname?.startsWith("/admin") && (
                  <span className="absolute inset-0 rounded-full bg-aura-cyan/10 border border-aura-cyan/30" />
                )}
                <span className="relative flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 011.262.125l.962.962a1 1 0 01.125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.295a1 1 0 01.804.98v1.36a1 1 0 01-.804.98l-1.473.295a6.95 6.95 0 01-.587 1.416l.834 1.25a1 1 0 01-.125 1.262l-.962.962a1 1 0 01-1.262.125l-1.25-.834a6.953 6.953 0 01-1.416.587l-.295 1.473a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.295-1.473a6.957 6.957 0 01-1.416-.587l-1.25.834a1 1 0 01-1.262-.125l-.962-.962a1 1 0 01-.125-1.262l.834-1.25a6.957 6.957 0 01-.587-1.416l-1.473-.295A1 1 0 011 10.68V9.32a1 1 0 01.804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 01.125-1.262l.962-.962A1 1 0 015.38 3.03l1.25.834a6.957 6.957 0 011.416-.587l.295-1.473zM13 10a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Admin
                </span>
              </Link>
            )}
          </nav>

          {/* Right Side - Account Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Network Badge - Desktop */}
            <div className="hidden xl:block">
              <NetworkBadge />
            </div>

            {/* Credits Display - Desktop */}
            <div className="hidden md:block">
              <AccountCredits />
            </div>

            {/* Wallet Connect - Desktop */}
            <div className="hidden md:block">
              <ConnectButton
                client={client}
                wallets={supportedWallets}
                chains={supportedChains}
                connectModal={{ size: "wide" }}
                theme="dark"
              />
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden relative p-2 rounded-xl bg-muted/30 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <div className="relative w-5 h-5">
                <span
                  className={`absolute left-0 block w-5 h-0.5 bg-current transform transition-all duration-300 ${
                    isMobileMenuOpen ? "top-2.5 rotate-45" : "top-1"
                  }`}
                />
                <span
                  className={`absolute left-0 top-2.5 block w-5 h-0.5 bg-current transition-opacity duration-300 ${
                    isMobileMenuOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute left-0 block w-5 h-0.5 bg-current transform transition-all duration-300 ${
                    isMobileMenuOpen ? "top-2.5 -rotate-45" : "top-4"
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-out ${
          isMobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 py-4 space-y-4 bg-background/95 backdrop-blur-xl border-t border-border/50">
          {/* Mobile Navigation */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              if (item.requiresAuth && !account) return null;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  pathname?.startsWith("/admin")
                    ? "bg-aura-cyan/10 text-aura-cyan"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-aura-cyan"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 011.262.125l.962.962a1 1 0 01.125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.295a1 1 0 01.804.98v1.36a1 1 0 01-.804.98l-1.473.295a6.95 6.95 0 01-.587 1.416l.834 1.25a1 1 0 01-.125 1.262l-.962.962a1 1 0 01-1.262.125l-1.25-.834a6.953 6.953 0 01-1.416.587l-.295 1.473a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.295-1.473a6.957 6.957 0 01-1.416-.587l-1.25.834a1 1 0 01-1.262-.125l-.962-.962a1 1 0 01-.125-1.262l.834-1.25a6.957 6.957 0 01-.587-1.416l-1.473-.295A1 1 0 011 10.68V9.32a1 1 0 01.804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 01.125-1.262l.962-.962A1 1 0 015.38 3.03l1.25.834a6.957 6.957 0 011.416-.587l.295-1.473zM13 10a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Admin</span>
              </Link>
            )}
          </nav>

          {/* Mobile Account Section */}
          {account && (
            <div className="space-y-3 pt-3 border-t border-border/50">
              {/* Network + Credits Row */}
              <div className="flex items-center gap-2">
                <NetworkBadge />
                <AccountCredits />
              </div>
            </div>
          )}

          {/* Mobile Wallet Connect */}
          <div className="pt-3 border-t border-border/50">
            <ConnectButton
              client={client}
              wallets={supportedWallets}
              chains={supportedChains}
              connectModal={{ size: "wide" }}
              theme="dark"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

// Re-export for backwards compatibility
export { CreditsDisplay, CreditsDisplayCompact } from "./CreditsDisplay";
