"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain } from "thirdweb/react";
import { avalanche, avalancheFuji, base, baseSepolia, celo, celoSepoliaTestnet, ethereum } from "thirdweb/chains";
import type { Chain } from "thirdweb/chains";
import {
  parsePriceToUSDC,
  generateNonce,
  createEIP712Domain,
  TRANSFER_WITH_AUTHORIZATION_TYPES,
  getChainId,
} from "@/lib/utils/x402-payment";
import { NetworkSelector } from "./NetworkSelector";
import { networkDisplayNames, usdcAddresses } from "@/lib/config/x402";

// Map network names to Thirdweb chain objects for wallet switching
const networkToChain: Record<string, Chain> = {
  avalanche,
  "avalanche-fuji": avalancheFuji,
  base,
  "base-sepolia": baseSepolia,
  celo,
  "celo-sepolia": celoSepoliaTestnet,
  ethereum,
};

// Reverse mapping: chain ID to network name
const chainIdToNetwork: Record<number, string> = {
  1: "ethereum",
  43114: "avalanche",
  43113: "avalanche-fuji",
  8453: "base",
  84532: "base-sepolia",
  42220: "celo",
  11142220: "celo-sepolia",
};

// x402 v2 accept option from PAYMENT-REQUIRED header
export interface AcceptOption {
  scheme: string;
  network: string; // CAIP-2 format (e.g., "eip155:43114")
  maxAmountRequired: string;
  resource: string;
  description?: string;
  mimeType?: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  asset: string; // USDC contract address
  extra?: {
    name?: string; // Token name for EIP-712 domain
    version?: string;
    networkName?: string; // Legacy network name (e.g., "avalanche")
  };
}

// Legacy PaymentRequirements for backwards compatibility
export interface PaymentRequirements {
  endpoint?: string;
  resource?: string;
  price?: string;
  network: string;
  payTo: string;
  maxAmountRequired?: string;
  tokenName?: string;
}

interface PaymentButtonProps {
  // New: accepts array for multi-chain support
  accepts?: AcceptOption[];
  defaultNetwork?: string;
  // Legacy: single requirements object
  requirements?: PaymentRequirements;
  onPaymentSigned: (envelope: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Format price string to remove trailing zeros
 * "$0.001000" -> "$0.001"
 * Also handles atomic USDC amounts (6 decimals) from maxAmountRequired
 */
function formatPrice(price: string | undefined, maxAmountRequired?: string): string {
  // If price is provided, use it
  if (price) {
    const numericPrice = price.replace("$", "").trim();
    const num = parseFloat(numericPrice);
    return `$${num}`;
  }

  // Fall back to maxAmountRequired (atomic USDC units with 6 decimals)
  if (maxAmountRequired) {
    const atomicAmount = BigInt(maxAmountRequired);
    const usdcAmount = Number(atomicAmount) / 1_000_000; // USDC has 6 decimals
    return `$${usdcAmount}`;
  }

  return "$0.00";
}

export function PaymentButton({
  accepts: initialAccepts,
  defaultNetwork,
  requirements,
  onPaymentSigned,
  onError,
}: PaymentButtonProps) {
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const [isSigning, setIsSigning] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [balance, setBalance] = useState<{ balance: string; hasEnough: boolean; requiredAmount: number } | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // State for fetched accepts array (if not provided via props)
  const [fetchedAccepts, setFetchedAccepts] = useState<AcceptOption[]>([]);

  // Use refs to track fetch state without causing re-renders
  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);
  const lastEndpointRef = useRef<string | undefined>(undefined);

  // Use provided accepts or fetched accepts
  const accepts = initialAccepts && initialAccepts.length > 0 ? initialAccepts : fetchedAccepts;

  // Convert accepts array to network options for selector
  const networkOptions = (accepts || []).map((a) => ({
    network: a.network,
    networkName: a.extra?.networkName || a.network,
    asset: a.asset,
  }));

  // State for selected network (from accepts array)
  const [selectedAccept, setSelectedAccept] = useState<AcceptOption | undefined>(undefined);

  // Fetch accepts from payment requirements API if not provided (only once per endpoint)
  useEffect(() => {
    const endpoint = requirements?.endpoint;

    // Skip if we have accepts from props
    if (initialAccepts && initialAccepts.length > 0) {
      return;
    }

    // Skip if no endpoint
    if (!endpoint) {
      return;
    }

    // Skip if already fetched for this endpoint
    if (hasFetchedRef.current && lastEndpointRef.current === endpoint) {
      return;
    }

    // Skip if currently fetching
    if (isFetchingRef.current) {
      return;
    }

    const fetchAccepts = async () => {
      isFetchingRef.current = true;
      lastEndpointRef.current = endpoint;

      try {
        const url = `/api/payment/requirements?endpoint=${encodeURIComponent(endpoint)}`;
        console.log("[PaymentButton] Fetching payment requirements from:", url);

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch payment requirements: ${response.status}`);
        }

        const data = await response.json();
        console.log("[PaymentButton] Fetched payment requirements:", data);

        if (data.accepts && data.accepts.length > 0) {
          setFetchedAccepts(data.accepts);
          hasFetchedRef.current = true;

          // Set default selection: prefer active wallet chain, then defaultNetwork prop, then first option
          const activeNetworkName = chain?.id ? chainIdToNetwork[chain.id] : undefined;
          const chainOption = activeNetworkName
            ? data.accepts.find((a: AcceptOption) => a.extra?.networkName === activeNetworkName)
            : undefined;
          const defaultOption = defaultNetwork
            ? data.accepts.find((a: AcceptOption) => a.extra?.networkName === defaultNetwork)
            : undefined;
          setSelectedAccept(chainOption || defaultOption || data.accepts[0]);
        }
      } catch (error) {
        console.error("[PaymentButton] Failed to fetch accepts:", error);
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchAccepts();
  }, [initialAccepts, requirements?.endpoint, defaultNetwork, chain?.id]);

  // Update selected accept when accepts array from props changes (only for prop-provided accepts)
  useEffect(() => {
    // Only run if we have accepts from props AND selectedAccept is not set
    if (initialAccepts && initialAccepts.length > 0 && !selectedAccept) {
      // Prefer active wallet chain, then defaultNetwork prop, then first option
      const activeNetworkName = chain?.id ? chainIdToNetwork[chain.id] : undefined;
      const chainOption = activeNetworkName
        ? initialAccepts.find((a) => a.extra?.networkName === activeNetworkName)
        : undefined;
      const defaultOption = defaultNetwork
        ? initialAccepts.find((a) => a.extra?.networkName === defaultNetwork)
        : undefined;
      setSelectedAccept(chainOption || defaultOption || initialAccepts[0]);
    }
  }, [initialAccepts, defaultNetwork, selectedAccept, chain?.id]);

  // Sync dropdown selection when wallet chain changes AFTER initial selection
  useEffect(() => {
    // Skip if no chain or no accepts yet
    if (!chain?.id || accepts.length === 0) return;

    const activeNetworkName = chainIdToNetwork[chain.id];
    if (!activeNetworkName) return;

    // Check if current selection already matches the active chain
    const currentNetworkName = selectedAccept?.extra?.networkName;
    if (currentNetworkName === activeNetworkName) return;

    // Find matching option for the active wallet chain
    const matchingOption = accepts.find((a) => a.extra?.networkName === activeNetworkName);
    if (matchingOption) {
      console.log("[PaymentButton] Syncing dropdown to wallet chain:", activeNetworkName);
      // Reset balance fetch key to allow new fetch for the new network
      balanceFetchKeyRef.current = "";
      setSelectedAccept(matchingOption);
    }
  }, [chain?.id, accepts, selectedAccept?.extra?.networkName]);

  // Ref to track balance fetch to prevent duplicate calls
  const balanceFetchKeyRef = useRef<string>("");
  const isLoadingBalanceRef = useRef(false);

  // Fetch USDC balance when account or selected network changes
  useEffect(() => {
    if (!account?.address || !selectedAccept) {
      setBalance(null);
      return;
    }

    const networkName = selectedAccept.extra?.networkName || selectedAccept.network;
    const usdcAddress = selectedAccept.asset || usdcAddresses[networkName];

    // Create a unique key for this fetch
    const fetchKey = `${account.address}-${networkName}-${usdcAddress}`;

    // Skip if we already fetched for this key or are currently loading
    if (balanceFetchKeyRef.current === fetchKey || isLoadingBalanceRef.current) {
      return;
    }

    if (!usdcAddress) {
      console.log("[PaymentButton] No USDC address for network:", networkName);
      return;
    }

    const fetchBalance = async () => {
      isLoadingBalanceRef.current = true;
      balanceFetchKeyRef.current = fetchKey;
      setIsLoadingBalance(true);

      try {
        // Get RPC URL based on network
        const rpcUrls: Record<string, string> = {
          avalanche: "https://api.avax.network/ext/bc/C/rpc",
          "avalanche-fuji": "https://api.avax-test.network/ext/bc/C/rpc",
          base: "https://mainnet.base.org",
          "base-sepolia": "https://sepolia.base.org",
          celo: "https://forno.celo.org",
          "celo-sepolia": "https://forno.celo-sepolia.celo-testnet.org",
          ethereum: "https://eth.llamarpc.com",
        };

        const rpcUrl = rpcUrls[networkName] || rpcUrls.avalanche;

        // Use eth_call to get balance (balanceOf selector: 0x70a08231)
        const data = `0x70a08231000000000000000000000000${account.address.slice(2).toLowerCase()}`;

        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_call",
            params: [{ to: usdcAddress, data }, "latest"],
            id: 1,
          }),
        });

        const result = await response.json();

        if (result.result) {
          const balanceRaw = BigInt(result.result);
          const balanceFormatted = Number(balanceRaw) / 1_000_000; // USDC has 6 decimals
          const requiredAmount = selectedAccept.maxAmountRequired
            ? Number(BigInt(selectedAccept.maxAmountRequired)) / 1_000_000
            : 0.001;

          setBalance({
            balance: balanceFormatted.toFixed(6),
            hasEnough: balanceFormatted >= requiredAmount,
            requiredAmount,
          });

          console.log("[PaymentButton] USDC Balance:", {
            network: networkName,
            balance: balanceFormatted,
            required: requiredAmount,
            hasEnough: balanceFormatted >= requiredAmount,
          });
        }
      } catch (error) {
        console.error("[PaymentButton] Failed to fetch balance:", error);
        setBalance(null);
      } finally {
        setIsLoadingBalance(false);
        isLoadingBalanceRef.current = false;
      }
    };

    fetchBalance();
  }, [account?.address, selectedAccept?.network, selectedAccept?.asset, selectedAccept?.extra?.networkName, selectedAccept?.maxAmountRequired]);

  // Get effective requirements (from selectedAccept or legacy requirements)
  const getEffectiveRequirements = () => {
    if (selectedAccept) {
      return {
        network: selectedAccept.extra?.networkName || selectedAccept.network,
        payTo: selectedAccept.payTo,
        maxAmountRequired: selectedAccept.maxAmountRequired,
        tokenName: selectedAccept.extra?.name || "USD Coin",
        asset: selectedAccept.asset,
        resource: selectedAccept.resource,
      };
    }
    return requirements;
  };

  const effectiveReq = getEffectiveRequirements();

  const handleSign = async () => {
    if (!effectiveReq) {
      onError?.(new Error("No payment requirements available"));
      return;
    }

    console.log("[PaymentButton] handleSign called", {
      hasAccount: !!account,
      hasChain: !!chain,
      network: effectiveReq.network,
      maxAmountRequired: effectiveReq.maxAmountRequired,
    });

    if (!account || !chain) {
      onError?.(new Error("Please connect your wallet"));
      return;
    }

    // Check if chain matches selected network
    const requiredChainId = getChainId(effectiveReq.network);
    if (chain.id !== requiredChainId) {
      const networkName = networkDisplayNames[effectiveReq.network] || effectiveReq.network;
      onError?.(
        new Error(
          `Please switch to ${networkName} network (Chain ID: ${requiredChainId})`
        )
      );
      return;
    }

    try {
      setIsSigning(true);
      console.log("[PaymentButton] Starting payment signing process");

      // Parse price to USDC amount
      // If maxAmountRequired is provided (from x402 v2 header), use it directly
      // Otherwise parse the price string
      const amountInUSDC = effectiveReq.maxAmountRequired
        ? BigInt(effectiveReq.maxAmountRequired)
        : parsePriceToUSDC((effectiveReq as PaymentRequirements).price || "$0.01");

      // Generate nonce
      const nonce = generateNonce();

      // Create authorization valid for 1 hour
      const now = Math.floor(Date.now() / 1000);
      const validAfter = BigInt(0);
      const validBefore = BigInt(now + 3600);

      const authorization = {
        from: account.address as `0x${string}`,
        to: effectiveReq.payTo as `0x${string}`,
        value: amountInUSDC,
        validAfter,
        validBefore,
        nonce,
      };

      // Create EIP-712 domain (use detected token name)
      const tokenName = effectiveReq.tokenName || "USD Coin";
      const domain = createEIP712Domain(
        effectiveReq.network,
        undefined, // Use default USDC address from config
        tokenName
      );

      console.log("[PaymentButton] EIP-712 domain:", {
        network: effectiveReq.network,
        tokenName,
        domain,
      });

      // Sign the payment authorization using account.signTypedData
      const signature = await account.signTypedData({
        domain,
        types: TRANSFER_WITH_AUTHORIZATION_TYPES,
        primaryType: "TransferWithAuthorization",
        message: authorization,
      });

      // Create payment envelope
      const envelope = {
        network: effectiveReq.network,
        authorization: {
          from: authorization.from,
          to: authorization.to,
          value: authorization.value.toString(),
          nonce: authorization.nonce,
          validAfter: authorization.validAfter.toString(),
          validBefore: authorization.validBefore.toString(),
        },
        signature,
      };

      // Call callback with signed envelope (wait for it to complete)
      console.log("[PaymentButton] Payment signed, calling onPaymentSigned callback");
      await onPaymentSigned(envelope);
      console.log("[PaymentButton] Payment callback completed");
    } catch (error) {
      console.error("[PaymentButton] Payment signing error:", error);
      onError?.(error instanceof Error ? error : new Error("Failed to sign payment"));
    } finally {
      setIsSigning(false);
    }
  };

  // Handle network selection change - also switch wallet chain
  const handleNetworkChange = async (option: { network: string; networkName: string; asset: string }) => {
    const newAccept = accepts?.find((a) => a.network === option.network);
    if (newAccept) {
      // Reset balance fetch key to allow new fetch for the new network
      balanceFetchKeyRef.current = "";
      setSelectedAccept(newAccept);
      console.log("[PaymentButton] Network changed to:", option.networkName);

      // Automatically switch wallet chain if different from current
      const targetChain = networkToChain[option.networkName];
      if (targetChain && chain?.id !== targetChain.id) {
        setIsSwitchingChain(true);
        try {
          console.log("[PaymentButton] Switching wallet to chain:", option.networkName, targetChain.id);
          await switchChain(targetChain);
          console.log("[PaymentButton] Wallet chain switched successfully");
        } catch (error) {
          console.error("[PaymentButton] Failed to switch chain:", error);
          // Don't show error - user may have rejected the switch
        } finally {
          setIsSwitchingChain(false);
        }
      }
    }
  };

  // Handle manual switch network button click
  const handleSwitchNetwork = async () => {
    const networkName = effectiveReq?.network;
    const targetChain = networkName ? networkToChain[networkName] : undefined;

    if (!targetChain) {
      console.error("[PaymentButton] No chain mapping for network:", networkName);
      return;
    }

    setIsSwitchingChain(true);
    try {
      console.log("[PaymentButton] Manual switch to chain:", networkName, targetChain.id);
      await switchChain(targetChain);
      console.log("[PaymentButton] Wallet chain switched successfully");
    } catch (error) {
      console.error("[PaymentButton] Failed to switch chain:", error);
      onError?.(new Error("Failed to switch network. Please switch manually in your wallet."));
    } finally {
      setIsSwitchingChain(false);
    }
  };

  // Show loading state while fetching accepts
  const isFetchingAccepts = isFetchingRef.current && !hasFetchedRef.current;

  if (!account) {
    return (
      <div className="text-sm text-muted-foreground">
        Please connect your wallet to sign payment
      </div>
    );
  }

  if (!effectiveReq) {
    return (
      <div className="text-sm text-muted-foreground">
        {isFetchingAccepts ? "Loading payment options..." : "No payment requirements available"}
      </div>
    );
  }

  const requiredChainId = getChainId(effectiveReq.network);
  const isWrongChain = chain?.id !== requiredChainId;
  const networkName = networkDisplayNames[effectiveReq.network] || effectiveReq.network;
  const resourceName = (effectiveReq as any).resource || (effectiveReq as PaymentRequirements).endpoint || "this service";
  const priceDisplay = formatPrice(
    (effectiveReq as PaymentRequirements).price,
    effectiveReq.maxAmountRequired
  );

  return (
    <div className="border border-aura-purple/30 rounded-lg p-4 bg-aura-purple/10 w-full max-w-md">
      <div className="mb-3">
        <p className="text-sm font-medium text-aura-purple mb-1">Payment Required</p>
        <p className="text-xs text-muted-foreground">
          {resourceName} requires {priceDisplay} payment
        </p>
      </div>

      {/* Network Selector and Balance - always show if we have network options */}
      {networkOptions.length > 0 && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex-1">
            <NetworkSelector
              accepts={networkOptions}
              defaultNetwork={defaultNetwork}
              value={selectedAccept?.extra?.networkName || selectedAccept?.network}
              onNetworkChange={handleNetworkChange}
              disabled={isSigning || isSwitchingChain}
            />
          </div>
          {/* USDC Balance Display */}
          <div className="text-right">
            {isLoadingBalance ? (
              <span className="text-xs text-muted-foreground">Loading...</span>
            ) : balance ? (
              <div className={`text-xs ${balance.hasEnough ? "text-green-400" : "text-yellow-400"}`}>
                <span className="font-medium">{parseFloat(balance.balance).toFixed(4)}</span>
                <span className="text-muted-foreground ml-1">USDC</span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Balance Warning */}
      {balance && !balance.hasEnough && (
        <div className="mb-3 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs text-yellow-400">
          ⚠️ Insufficient USDC. You need at least {priceDisplay} but have ${parseFloat(balance.balance).toFixed(4)}
        </div>
      )}

      {isWrongChain && (
        <div className="mb-3 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs text-yellow-400">
          <div className="flex items-center justify-between gap-2">
            <span>⚠️ Please switch to {networkName} (Chain ID: {requiredChainId})</span>
            <button
              onClick={handleSwitchNetwork}
              disabled={isSwitchingChain}
              className="px-2 py-1 bg-yellow-500/30 hover:bg-yellow-500/50 rounded text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isSwitchingChain ? "Switching..." : "Switch"}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={handleSign}
        disabled={isSigning || isSwitchingChain || isWrongChain || (balance && !balance.hasEnough)}
        className="w-full px-4 py-2 bg-aura-gradient hover:opacity-90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
      >
        {(isSigning || isSwitchingChain) && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {isSwitchingChain ? "Switching Network..." : isSigning ? "Processing..." : `Sign Payment (${priceDisplay})`}
      </button>

      {isSigning && (
        <p className="text-xs text-aura-purple mt-2 animate-pulse">
          ⏳ Signing payment and processing request...
        </p>
      )}

      {!isSigning && (
        <p className="text-xs text-muted-foreground mt-2">
          This will sign a payment authorization. The facilitator will process the payment
          on-chain (gasless).
        </p>
      )}
    </div>
  );
}
