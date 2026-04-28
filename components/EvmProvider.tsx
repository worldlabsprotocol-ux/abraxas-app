"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { ReactNode, useState } from "react";
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";
import { http } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const ethRpcRaw = (process.env.NEXT_PUBLIC_ETH_RPC_URL || "").trim();
const ethRpc =
  ethRpcRaw && /^https?:\/\//i.test(ethRpcRaw) ? ethRpcRaw : undefined;

// WalletConnect requires a real project ID from cloud.walletconnect.com.
// If missing or using the placeholder, we skip WalletConnect entirely
// and fall back to injected wallets only (MetaMask, Coinbase, etc.).
const wcProjectId = (
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""
).trim();

const config = getDefaultConfig({
  appName: "Abraxas",
  // Use a real project ID or a stable dummy that won't throw
  projectId: wcProjectId || "00000000000000000000000000000000",
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(ethRpc),
  },
  ssr: true,
});

export function EvmProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#c8a96e",
            accentColorForeground: "#0a0a0b",
            borderRadius: "medium",
            fontStack: "system",
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}