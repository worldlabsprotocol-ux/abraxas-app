// FILE: components/EvmProvider.tsx
// EVM wallet provider — wagmi + RainbowKit, Ethereum mainnet ONLY.
//
// CRITICAL: import mainnet directly from viem, NOT from "wagmi/chains".
// "wagmi/chains" re-exports ALL chains via viem/chains/index.js which pulls in
// viem/chains/definitions/tempo.js → ox/tempo → broken ESM imports at build time.
// Importing from "viem/chains" (the barrel) has the same problem.
// Direct path import bypasses the barrel entirely.

"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { ReactNode, useState } from "react";
import { RainbowKitProvider, getDefaultConfig, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { http } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Direct import — avoids wagmi/chains and viem/chains barrels entirely
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { mainnet } = require("viem/chains/definitions/mainnet") as { mainnet: import("viem").Chain };

const projectId = (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "").trim() || "abraxas-app";
const ethRpcRaw  = (process.env.NEXT_PUBLIC_ETH_RPC_URL || "").trim();
const ethRpc     = ethRpcRaw && /^https?:\/\//i.test(ethRpcRaw) ? ethRpcRaw : undefined;

const config = getDefaultConfig({
  appName:  "Abraxas",
  projectId,
  chains:   [mainnet],
  transports: { [mainnet.id]: http(ethRpc) },
  ssr: true,
});

export function EvmProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({ accentColor: "#c8a96e", accentColorForeground: "#0a0a0b", borderRadius: "medium", fontStack: "system" })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}