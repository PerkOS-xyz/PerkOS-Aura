"use client";

import { useState } from "react";
import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import {
  getUSDCAddress,
  getChainId,
  parsePriceToUSDC,
  generateNonce,
  createEIP712Domain,
  TRANSFER_WITH_AUTHORIZATION_TYPES,
  type PaymentRequirements,
} from "@/lib/utils/x402-payment";

interface PaymentButtonProps {
  requirements: PaymentRequirements;
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
  requirements,
  onPaymentSigned,
  onError,
}: PaymentButtonProps) {
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const [isSigning, setIsSigning] = useState(false);
  const [balance, setBalance] = useState<{ balance: string; hasEnough: boolean } | null>(null);

  // Note: We don't check balance on mount because this endpoint requires payment
  // The balance will be shown after the user signs the payment and the request completes

  const handleSign = async () => {
    console.log("[PaymentButton] handleSign called", {
      hasAccount: !!account,
      hasChain: !!chain,
      network: requirements.network,
      price: requirements.price,
    });

    if (!account || !chain) {
      onError?.(new Error("Please connect your wallet"));
      return;
    }

    // Check if chain matches network
    const requiredChainId = getChainId(requirements.network);
    if (chain.id !== requiredChainId) {
      onError?.(
        new Error(
          `Please switch to ${requirements.network} network (Chain ID: ${requiredChainId})`
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
      const amountInUSDC = requirements.maxAmountRequired
        ? BigInt(requirements.maxAmountRequired)
        : parsePriceToUSDC(requirements.price || "$0.01");

      // Generate nonce
      const nonce = generateNonce();

      // Create authorization valid for 1 hour
      const now = Math.floor(Date.now() / 1000);
      const validAfter = BigInt(0);
      const validBefore = BigInt(now + 3600);

      const authorization = {
        from: account.address,
        to: requirements.payTo as `0x${string}`,
        value: amountInUSDC,
        validAfter,
        validBefore,
        nonce,
      };

      // Create EIP-712 domain (use detected token name if available)
      const domain = createEIP712Domain(
        requirements.network,
        undefined, // Use default USDC address
        requirements.tokenName // Use detected token name from requirements
      );

      // Sign the payment authorization using account.signTypedData
      const signature = await account.signTypedData({
        domain,
        types: TRANSFER_WITH_AUTHORIZATION_TYPES,
        primaryType: "TransferWithAuthorization",
        message: authorization,
      });

      // Create payment envelope
      const envelope = {
        network: requirements.network,
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

  if (!account) {
    return (
      <div className="text-sm text-gray-400">
        Please connect your wallet to sign payment
      </div>
    );
  }

  const requiredChainId = getChainId(requirements.network);
  const isWrongChain = chain?.id !== requiredChainId;

  return (
    <div className="border border-cyan-500/30 rounded-lg p-4 bg-cyan-500/10">
      <div className="mb-3">
        <p className="text-sm font-medium text-cyan-400 mb-1">Payment Required</p>
        <p className="text-xs text-gray-400">
          {requirements.endpoint || requirements.resource} requires {formatPrice(requirements.price, requirements.maxAmountRequired)} payment
        </p>
      </div>

      {isWrongChain && (
        <div className="mb-3 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs text-yellow-400">
          ⚠️ Please switch to {requirements.network} network (Chain ID: {requiredChainId})
        </div>
      )}

      {balance && (
        <div className={`mb-3 p-2 rounded text-xs ${
          balance.hasEnough
            ? "bg-green-500/20 border border-green-500/30 text-green-400"
            : "bg-red-500/20 border border-red-500/30 text-red-400"
        }`}>
          {balance.hasEnough ? (
            <>✅ USDC Balance: {parseFloat(balance.balance).toFixed(6)} USDC (sufficient)</>
          ) : (
            <>⚠️ USDC Balance: {parseFloat(balance.balance).toFixed(6)} USDC (need at least 0.001 USDC)</>
          )}
        </div>
      )}

      <button
        onClick={handleSign}
        disabled={isSigning || isWrongChain}
        className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
      >
        {isSigning && (
          <svg
            className="animate-spin h-4 w-4 text-white"
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
        {isSigning ? "Processing..." : `Sign Payment (${formatPrice(requirements.price, requirements.maxAmountRequired)})`}
      </button>

      {isSigning && (
        <p className="text-xs text-cyan-400 mt-2 animate-pulse">
          ⏳ Signing payment and processing request...
        </p>
      )}

      {!isSigning && (
        <p className="text-xs text-gray-500 mt-2">
          This will sign a payment authorization. The facilitator will process the payment
          on-chain (gasless).
        </p>
      )}
    </div>
  );
}

