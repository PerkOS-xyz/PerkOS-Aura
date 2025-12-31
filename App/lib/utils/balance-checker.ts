/**
 * Balance Checker Utilities
 * Check USDC balance for a wallet address
 */

import { createPublicClient, http, formatUnits, type Address } from "viem";
import { avalanche, avalancheFuji, base, baseSepolia, celo, celoSepolia } from "viem/chains";
import { getUSDCAddress, getChainId } from "./x402-payment";

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
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
 * Get viem chain for a network
 */
function getViemChain(network: string) {
  const chains: Record<string, any> = {
    avalanche,
    "avalanche-fuji": avalancheFuji,
    base,
    "base-sepolia": baseSepolia,
    celo,
    "celo-sepolia": celoSepolia,
  };

  return chains[network] || avalanche;
}

/**
 * Check USDC balance for a wallet address
 */
export async function checkUSDCBalance(
  walletAddress: Address,
  network: string
): Promise<{ balance: string; balanceRaw: bigint; hasEnough: boolean; required: string }> {
  try {
    const chain = getViemChain(network);
    const rpcUrl = getRpcUrl(network);
    const usdcAddress = getUSDCAddress(network);

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    // Get USDC balance
    const balanceRaw = (await publicClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletAddress],
    })) as bigint;

    // USDC has 6 decimals
    const balance = formatUnits(balanceRaw, 6);
    const required = "0.001"; // Minimum required for testing
    const hasEnough = parseFloat(balance) >= parseFloat(required);

    return {
      balance,
      balanceRaw,
      hasEnough,
      required,
    };
  } catch (error) {
    console.error("Balance check error:", error);
    throw new Error(
      `Failed to check USDC balance: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get supported networks information
 */
export function getSupportedNetworks() {
  return [
    {
      name: "avalanche",
      displayName: "Avalanche C-Chain",
      chainId: 43114,
      usdcAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      testnet: false,
    },
    {
      name: "avalanche-fuji",
      displayName: "Avalanche Fuji Testnet",
      chainId: 43113,
      usdcAddress: "0x5425890298aed601595a70AB815c96711a31Bc65",
      testnet: true,
    },
    {
      name: "base",
      displayName: "Base",
      chainId: 8453,
      usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      testnet: false,
    },
    {
      name: "base-sepolia",
      displayName: "Base Sepolia",
      chainId: 84532,
      usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      testnet: true,
    },
    {
      name: "celo",
      displayName: "Celo",
      chainId: 42220,
      usdcAddress: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
      testnet: false,
    },
    {
      name: "celo-sepolia",
      displayName: "Celo Sepolia",
      chainId: 11142220,
      usdcAddress: "0x01C5C0122039549AD1493B8220cABEdD739BC44E",
      testnet: true,
    },
  ];
}

