/**
 * x402 Payment Utilities
 * Helper functions for creating payment signatures and envelopes
 */

import { parseUnits } from "viem";
import type { Address } from "viem";

export interface PaymentEnvelope {
  network: string;
  authorization: {
    from: string;
    to: string;
    value: string;
    nonce: string;
    validAfter: string;
    validBefore: string;
  };
  signature: string;
}

export interface PaymentRequirements {
  endpoint: string;
  method: string;
  price: string; // USD price like "$0.10"
  network: string;
  payTo: string;
  facilitator: string;
}

/**
 * Get USDC address for a network
 */
export function getUSDCAddress(network: string): Address {
  const addresses: Record<string, Address> = {
    avalanche: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    "avalanche-fuji": "0x5425890298aed601595a70AB815c96711a31Bc65",
    base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    celo: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    "celo-sepolia": "0x01C5C0122039549AD1493B8220cABEdD739BC44E", // Celo Sepolia USDC
  };

  return addresses[network] || addresses.avalanche;
}

/**
 * Get chain ID for a network
 */
export function getChainId(network: string): number {
  const chainIds: Record<string, number> = {
    avalanche: 43114,
    "avalanche-fuji": 43113,
    base: 8453,
    "base-sepolia": 84532,
    celo: 42220,
    "celo-sepolia": 11142220, // Celo Sepolia testnet
    // CAIP-2 format support
    "eip155:43114": 43114,
    "eip155:43113": 43113,
    "eip155:8453": 8453,
    "eip155:84532": 84532,
    "eip155:42220": 42220,
    "eip155:11142220": 11142220,
  };

  return chainIds[network] || 43114;
}

/**
 * Convert network name to CAIP-2 format for x402 V2
 * V1: "base-sepolia" → V2: "eip155:84532"
 */
export function toCAIP2Network(network: string): string {
  // If already in CAIP-2 format, return as-is
  if (network.includes(":")) {
    return network;
  }

  const caip2Map: Record<string, string> = {
    avalanche: "eip155:43114",
    "avalanche-fuji": "eip155:43113",
    base: "eip155:8453",
    "base-sepolia": "eip155:84532",
    celo: "eip155:42220",
    "celo-sepolia": "eip155:11142220",
  };

  return caip2Map[network] || network;
}

/**
 * Parse USD price string to USDC amount (6 decimals)
 */
export function parsePriceToUSDC(price: string): bigint {
  // Remove $ sign and parse
  const numericPrice = price.replace("$", "").trim();
  const amount = parseFloat(numericPrice);
  // USDC has 6 decimals
  return parseUnits(amount.toString(), 6);
}

/**
 * Generate random nonce for payment
 */
export function generateNonce(): `0x${string}` {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return `0x${Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}` as `0x${string}`;
}

/**
 * Create EIP-712 domain for token transferWithAuthorization
 * @param network - Network name (e.g., "avalanche", "base-sepolia")
 * @param tokenAddress - Token contract address (defaults to USDC)
 * @param tokenName - Token name for EIP-712 domain (defaults to "USD Coin")
 */
export function createEIP712Domain(
  network: string,
  tokenAddress?: Address,
  tokenName?: string
) {
  const address = tokenAddress || getUSDCAddress(network);
  const name = tokenName || "USD Coin"; // Default to USDC name for backward compatibility
  
  return {
    name,
    version: "2",
    chainId: getChainId(network),
    verifyingContract: address,
  };
}

/**
 * EIP-712 types for TransferWithAuthorization
 */
export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

/**
 * Format payment payload for x402 v2 PAYMENT-SIGNATURE header
 * Per spec: https://www.x402.org/writing/x402-v2-launch
 * 
 * @param envelope - Payment envelope with authorization and signature
 * @param network - Network identifier (will be converted to CAIP-2 format)
 * @param encodeBase64 - Whether to base64-encode the JSON (default: true, per V2 spec)
 * @returns Formatted payment payload string for PAYMENT-SIGNATURE header
 */
export function formatPaymentSignature(
  envelope: PaymentEnvelope,
  network: string,
  encodeBase64: boolean = true
): string {
  const paymentPayload = {
    x402Version: 2,
    scheme: "exact",
    network: toCAIP2Network(network),
    payload: envelope,
  };

  const jsonString = JSON.stringify(paymentPayload);
  
  if (encodeBase64) {
    // V2 spec recommends base64-encoded JSON
    return Buffer.from(jsonString).toString("base64");
  } else {
    // Plain JSON (backward compatible)
    return jsonString;
  }
}

