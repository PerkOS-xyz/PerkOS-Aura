"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton, useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { inAppWallet } from "thirdweb/wallets";
import { avalanche, avalancheFuji, base, baseSepolia, celo, celoSepoliaTestnet } from "thirdweb/chains";
import { client } from "@/lib/client";

// Supported chains - include Avalanche and Base mainnets
const supportedChains = [
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
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-950/75">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              PerkOS AI Vendor Service
            </span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => {
              if (item.requiresAuth && !account) return null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-cyan-400 ${pathname === item.href ? "text-cyan-400" : "text-gray-300"
                    }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className={`text-sm font-medium transition-colors hover:text-cyan-400 ${pathname?.startsWith('/admin') ? "text-cyan-400" : "text-gray-300"}`}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          {/* Network Display */}
          {activeChain && (
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className={`w-2 h-2 rounded-full ${isTestnet(activeChain.id) ? "bg-yellow-400" : "bg-green-400"
                }`} />
              <span className="text-xs font-medium text-gray-300">
                {getNetworkDisplayName(activeChain.id)}
              </span>
              <span className="text-xs text-gray-500">
                ({activeChain.id})
              </span>
            </div>
          )}
          <ConnectButton
            client={client}
            wallets={supportedWallets}
            chains={supportedChains}
            connectModal={{ size: "wide" }}
            theme="dark"
          />
        </div>
      </div>
    </header>
  );
}

