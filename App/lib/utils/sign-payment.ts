/**
 * Sign Payment Envelope
 * Signs an x402 payment envelope using a private key
 */

import { privateKeyToAccount } from "viem/accounts";
import {
  getUSDCAddress,
  getChainId,
  parsePriceToUSDC,
  generateNonce,
  createEIP712Domain,
  TRANSFER_WITH_AUTHORIZATION_TYPES,
  type PaymentEnvelope,
  type PaymentRequirements,
} from "./x402-payment";

/**
 * Sign a payment envelope using a private key
 */
export async function signPaymentEnvelope(
  requirements: PaymentRequirements,
  privateKey: `0x${string}`
): Promise<PaymentEnvelope> {
  // Create account from private key
  const account = privateKeyToAccount(privateKey);

  // Parse price to USDC amount (use maxAmountRequired if available, fall back to price)
  const value = requirements.maxAmountRequired
    ? BigInt(requirements.maxAmountRequired)
    : parsePriceToUSDC(requirements.price || "$0.01");

  // Generate nonce
  const nonce = generateNonce();

  // Set validity window (1 hour from now)
  const now = Math.floor(Date.now() / 1000);
  const validAfter = BigInt(now);
  const validBefore = BigInt(now + 3600); // 1 hour

  // Create authorization message (use bigint for value, like PaymentButton does)
  const authorization = {
    from: account.address,
    to: requirements.payTo as `0x${string}`,
    value: value, // Keep as bigint for signing
    nonce,
    validAfter,
    validBefore,
  };

  // Create EIP-712 domain
  const domain = createEIP712Domain(requirements.network);
  
  console.log("🔐 Signing payment envelope:", {
    network: requirements.network,
    domain,
    authorization: {
      from: authorization.from,
      to: authorization.to,
      value: authorization.value.toString(),
      validAfter: authorization.validAfter.toString(),
      validBefore: authorization.validBefore.toString(),
      nonce,
    },
  });

  // Sign typed data using account method (like PaymentButton does)
  const signature = await account.signTypedData({
    domain,
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization",
    message: authorization,
  });
  
  console.log("✅ Signature created:", {
    signature,
    signerAddress: account.address,
  });

  return {
    network: requirements.network,
    authorization: {
      from: authorization.from,
      to: authorization.to,
      value: authorization.value.toString(), // Convert bigint to string for JSON
      nonce,
      validAfter: authorization.validAfter.toString(), // Convert bigint to string
      validBefore: authorization.validBefore.toString(), // Convert bigint to string
    },
    signature,
  };
}

