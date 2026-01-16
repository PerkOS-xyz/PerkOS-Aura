"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton, useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { inAppWallet } from "thirdweb/wallets";
import { avalanche, avalancheFuji, base, baseSepolia, celo, celoSepoliaTestnet, ethereum } from "thirdweb/chains";
import { client } from "@/lib/client";

// Supported chains - include mainnets and testnets
const supportedChains = [
  ethereum,         // Ethereum Mainnet (1)
  avalanche,        // Avalanche C-Chain (43114)
  base,             // Base (8453)
  celo,             // Celo (42220)
  avalancheFuji,    // Avalanche Fuji Testnet (43113)
  baseSepolia,      // Base Sepolia (84532)
  celoSepoliaTestnet, // Celo Sepolia Testnet
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

// Helper function to get network display name
function getNetworkDisplayName(chainId: number | undefined): string {
  if (!chainId) return "Not Connected";

  const networkMap: Record<number, string> = {
    1: "Mainnet",
    43114: "Avalanche",
    43113: "Avalanche Fuji",
    8453: "Base",
    84532: "Base Sepolia",
    42220: "Celo",
    11142220: "Celo Sepolia",
  };

  return networkMap[chainId] || `Chain ${chainId}`;
}

// Helper function to check if network is testnet
function isTestnet(chainId: number | undefined): boolean {
  if (!chainId) return false;
  return [43113, 84532, 11142220].includes(chainId);
}

export function Header() {
  const pathname = usePathname();
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      } catch (error) {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [account]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container max-w-6xl mx-auto flex h-16 items-center px-4">
        {/* Left: Logo */}
        <div className="flex-1 flex justify-start">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-3xl font-bold font-heading text-aura-gradient">
              Aura
            </span>
          </Link>
        </div>

        {/* Center: Desktop Nav */}
        <nav className="hidden md:flex items-center justify-center space-x-6">
          {navItems.map((item) => {
            if (item.requiresAuth && !account) return null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === item.href ? "text-primary" : "text-muted-foreground"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={`text-sm font-medium transition-colors hover:text-aura-cyan ${pathname?.startsWith('/admin') ? "text-aura-cyan" : "text-muted-foreground"}`}
            >
              Admin
            </Link>
          )}
        </nav>

        {/* Right: Wallet & Mobile Toggle */}
        <div className="flex-1 flex justify-end items-center space-x-4">
          {/* Network Display - Desktop */}
          {activeChain && (
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
              <div className={`w-2 h-2 rounded-full ${isTestnet(activeChain.id) ? "bg-yellow-400" : "bg-green-400"
                }`} />
              <span className="text-xs font-medium text-muted-foreground">
                {getNetworkDisplayName(activeChain.id)}
              </span>
            </div>
          )}
          <div className="hidden md:block">
            <ConnectButton
              client={client}
              wallets={supportedWallets}
              chains={supportedChains}
              connectModal={{ size: "wide" }}
              theme="dark"
            />
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 18 12" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-4">
          <nav className="flex flex-col space-y-4">
            {navItems.map((item) => {
              if (item.requiresAuth && !account) return null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${pathname === item.href ? "text-primary" : "text-muted-foreground"
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className={`text-sm font-medium transition-colors hover:text-aura-cyan ${pathname?.startsWith('/admin') ? "text-aura-cyan" : "text-muted-foreground"}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Admin
              </Link>
            )}
          </nav>
          <div className="pt-4 border-t border-border">
            <ConnectButton
              client={client}
              wallets={supportedWallets}
              chains={supportedChains}
              connectModal={{ size: "wide" }}
              theme="dark"
            />
          </div>
        </div>
      )}
    </header>
  );
}

