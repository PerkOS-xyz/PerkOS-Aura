/**
 * Token Detection Utilities
 * Detect token information (name, symbol, decimals) from contract address
 * Required for proper EIP-712 domain construction in x402 payments
 */

import { createPublicClient, http, type Address } from "viem";
import { getChainId } from "./x402-payment";

// Standard ERC20 ABI (minimal - just what we need)
const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
] as const;

export interface TokenInfo {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  chainId: number;
}

/**
 * Get RPC URL for a network
 */
export function getRpcUrl(network: string): string {
  const rpcUrls: Record<string, string> = {
    avalanche: process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
    "avalanche-fuji": process.env.AVALANCHE_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
    base: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    "base-sepolia": process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    celo: process.env.CELO_RPC_URL || "https://forno.celo.org",
    "celo-sepolia": process.env.CELO_SEPOLIA_RPC_URL || "https://forno.celo-sepolia.celo-testnet.org",
  };

  return rpcUrls[network] || rpcUrls.avalanche;
}

/**
 * Convert CAIP-2 network format to legacy format
 * e.g., "eip155:43114" -> "avalanche"
 */
function toLegacyNetwork(network: string): string {
  if (!network.includes(":")) {
    return network;
  }

  const chainIdMap: Record<string, string> = {
    "eip155:43114": "avalanche",
    "eip155:43113": "avalanche-fuji",
    "eip155:8453": "base",
    "eip155:84532": "base-sepolia",
    "eip155:42220": "celo",
    "eip155:11142220": "celo-sepolia",
  };

  return chainIdMap[network] || "avalanche";
}

/**
 * Get public client for a network
 */
function getPublicClient(network: string) {
  // Convert CAIP-2 to legacy format if needed
  const legacyNetwork = toLegacyNetwork(network);
  const chainId = getChainId(legacyNetwork);
  const rpcUrl = getRpcUrl(legacyNetwork);

  // Import chain definitions from viem/chains
  const { avalanche, avalancheFuji, base, baseSepolia, celo, celoAlfajores } = require("viem/chains");

  const chainMap: Record<string, any> = {
    avalanche,
    "avalanche-fuji": avalancheFuji,
    base,
    "base-sepolia": baseSepolia,
    celo,
    "celo-sepolia": celoAlfajores, // Celo testnet
  };

  const chain = chainMap[legacyNetwork] || {
    id: chainId,
    name: legacyNetwork,
    network: legacyNetwork,
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [rpcUrl] },
    },
  };

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

// Token info cache to avoid repeated RPC calls
const tokenInfoCache = new Map<string, TokenInfo>();

/**
 * Detect token information from contract address
 * Results are cached to avoid repeated RPC calls
 */
export async function detectTokenInfo(
  tokenAddress: Address,
  network: string
): Promise<TokenInfo | null> {
  // Convert to legacy network format for consistent cache keys
  const legacyNetwork = toLegacyNetwork(network);
  const cacheKey = `${tokenAddress.toLowerCase()}-${legacyNetwork}`;

  // Check cache first
  if (tokenInfoCache.has(cacheKey)) {
    return tokenInfoCache.get(cacheKey)!;
  }

  try {
    const client = getPublicClient(legacyNetwork);
    const chainId = getChainId(legacyNetwork);

    // Read token info in parallel
    const [name, symbol, decimals] = await Promise.all([
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "name",
      }) as Promise<string>,
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "symbol",
      }) as Promise<string>,
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "decimals",
      }) as Promise<number>,
    ]);

    const tokenInfo: TokenInfo = {
      address: tokenAddress,
      name: name || "Unknown Token",
      symbol: symbol || "UNKNOWN",
      decimals: decimals || 18,
      chainId,
    };

    // Cache the result
    tokenInfoCache.set(cacheKey, tokenInfo);

    console.log(`🔍 Detected token info for ${tokenAddress}:`, {
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      decimals: tokenInfo.decimals,
      network: legacyNetwork,
    });

    return tokenInfo;
  } catch (error) {
    console.error("Failed to detect token info:", error);
    // Return null - caller should fall back to defaults
    return null;
  }
}
