// FILE: components/EvmProvider.tsx
// EVM wallet — wagmi + RainbowKit, Ethereum mainnet only.
//
// mainnet is defined inline to avoid importing from wagmi/chains or viem/chains.
// Both barrels pull in viem/chains/index.js → tempo.js → ox/tempo (broken ESM).

"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { ReactNode, useState } from "react";
import { RainbowKitProvider, getDefaultConfig, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { http } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Chain } from "viem";

// Mainnet defined inline — avoids any chain barrel import.
// Values are stable constants: https://chainlist.org/chain/1
const mainnet: Chain = {
  id: 1,
  name: "Ethereum",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://cloudflare-eth.com"] },
    public:  { http: ["https://cloudflare-eth.com"] },
  },
  blockExplorers: {
    default: { name: "Etherscan", url: "https://etherscan.io" },
  },
};

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