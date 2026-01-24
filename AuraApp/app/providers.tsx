"use client";

import { ThirdwebProvider } from "thirdweb/react";
import type { ReactNode } from "react";
import { createThirdwebClient } from "thirdweb";
import { avalanche, avalancheFuji, base, baseSepolia, celo, celoSepoliaTestnet, defineChain } from "thirdweb/chains";

// Define Unichain mainnet (Chain ID: 130)
export const unichain = defineChain({
  id: 130,
  name: "Unichain",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "Uniscan",
      url: "https://uniscan.xyz",
    },
  ],
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThirdwebProvider>
      {children}
    </ThirdwebProvider>
  );
}

