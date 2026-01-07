"use client";

import { ThirdwebProvider } from "thirdweb/react";
import type { ReactNode } from "react";
import { createThirdwebClient } from "thirdweb";
import { avalanche, avalancheFuji, base, baseSepolia, celo, celoSepoliaTestnet } from "thirdweb/chains";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThirdwebProvider>
      {children}
    </ThirdwebProvider>
  );
}

