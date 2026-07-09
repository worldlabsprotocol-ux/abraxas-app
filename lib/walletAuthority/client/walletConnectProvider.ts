"use client";
// FILE: lib/walletAuthority/client/walletConnectProvider.ts
// WalletConnect v2 (Reown) — mobile / no injected provider fallback.

import type { EthereumProvider } from "@/lib/walletAuthority/client/ethereumProvider";
import type { EvmWalletConnection } from "@/lib/walletAuthority/client/ethereumProvider";

const DEFAULT_CHAINS = [1, 8453, 137, 42161] as const;

let cachedProvider: Awaited<ReturnType<typeof initWalletConnectProvider>> | null = null;

function appOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://abraxas-app.vercel.app";
}

async function initWalletConnectProvider() {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error("WalletConnect is not configured for this deployment.");
  }

  const { EthereumProvider: WcEthereumProvider } = await import("@walletconnect/ethereum-provider");

  const provider = await WcEthereumProvider.init({
    projectId,
    optionalChains: [...DEFAULT_CHAINS],
    showQrModal: true,
    metadata: {
      name: "Abraxas Passport",
      description: "Bind your EVM wallet to Abraxas Passport",
      url: appOrigin(),
      icons: [`${appOrigin()}/favicon.ico`],
    },
  });

  return provider;
}

async function getOrCreateWalletConnectProvider() {
  if (!cachedProvider) {
    cachedProvider = await initWalletConnectProvider();
  }
  return cachedProvider;
}

/** Connect via WalletConnect QR / deep link (mobile-friendly). */
export async function connectEvmWalletViaWalletConnect(
  preferredChainId = 1,
): Promise<EvmWalletConnection> {
  const wc = await getOrCreateWalletConnectProvider();

  if (!wc.connected) {
    await wc.connect({
      chains: [preferredChainId],
    });
  }

  const provider = wc as unknown as EthereumProvider;
  const accounts = await provider.request({ method: "eth_accounts" });
  const address = Array.isArray(accounts) ? (accounts[0] as string | undefined) : undefined;
  if (!address) throw new Error("No account selected via WalletConnect");

  const chainHex = await provider.request({ method: "eth_chainId" });
  const chainId = Number.parseInt(String(chainHex), 16);
  if (!Number.isFinite(chainId)) throw new Error("Could not read chain ID from WalletConnect");

  return { provider, address, chainId, method: "walletconnect" };
}

export async function disconnectWalletConnectSession(): Promise<void> {
  if (cachedProvider?.connected) {
    await cachedProvider.disconnect();
  }
  cachedProvider = null;
}
