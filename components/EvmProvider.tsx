"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { ReactNode, useState } from "react";
import { RainbowKitProvider, getDefaultConfig, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";
import { http } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const projectId =
  (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "").trim() || "abraxas-app";

// Treat empty string as missing (`||` handles "" but `??` does not).
const ethRpcRaw = (process.env.NEXT_PUBLIC_ETH_RPC_URL || "").trim();
const ethRpc =
  ethRpcRaw && /^https?:\/\//i.test(ethRpcRaw) ? ethRpcRaw : undefined;

if (typeof window !== "undefined") {
  console.log(
    "[evm] ETH RPC:",
    ethRpc ? ethRpc.split("?")[0] + " (configured)" : "wagmi default (public)"
  );
  console.log(
    "[evm] WalletConnect project:",
    projectId === "abraxas-app" ? "default placeholder" : "configured"
  );
}

const config = getDefaultConfig({
  appName: "Abraxas",
  projectId,
  chains: [mainnet],
  transports: {
    // If ethRpc is undefined, viem's http() uses its default public RPC list.
    [mainnet.id]: http(ethRpc),
  },
  ssr: true,
});

interface Props {
  children: ReactNode;
}

/**
 * EVM wallet provider — wagmi + RainbowKit on Ethereum mainnet only.
 * Used for La Casa Distortion NFT ownership verification on /access.
 */
export function EvmProvider({ children }: Props) {
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
