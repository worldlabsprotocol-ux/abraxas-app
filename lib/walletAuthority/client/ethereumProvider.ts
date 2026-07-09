"use client";
// FILE: lib/walletAuthority/client/ethereumProvider.ts
// Injected EVM provider (window.ethereum) — client only.

export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export type EvmConnectionMethod = "injected" | "walletconnect";

export interface EvmWalletConnection {
  provider: EthereumProvider;
  address: string;
  chainId: number;
  method: EvmConnectionMethod;
}

export function getEthereumProvider(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum;
}

export function hasInjectedEthereumProvider(): boolean {
  return Boolean(getEthereumProvider());
}

/** Connect via injected window.ethereum (desktop extension or wallet in-app browser). */
export async function connectEvmWalletInjected(): Promise<EvmWalletConnection> {
  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error("No injected wallet found in this browser.");
  }

  const accounts = await provider.request({ method: "eth_requestAccounts" });
  const address = Array.isArray(accounts) ? (accounts[0] as string | undefined) : undefined;
  if (!address) throw new Error("No account selected");

  const chainHex = await provider.request({ method: "eth_chainId" });
  const chainId = Number.parseInt(String(chainHex), 16);
  if (!Number.isFinite(chainId)) throw new Error("Could not read chain ID from wallet");

  return { provider, address, chainId, method: "injected" };
}

/**
 * Connect EVM wallet — injected when available, otherwise WalletConnect when requested.
 */
export async function connectEvmWallet(options?: {
  method?: EvmConnectionMethod;
  chainId?: number;
}): Promise<EvmWalletConnection> {
  const method = options?.method;
  if (method === "walletconnect") {
    const { connectEvmWalletViaWalletConnect } = await import(
      "@/lib/walletAuthority/client/walletConnectProvider"
    );
    const connection = await connectEvmWalletViaWalletConnect(options?.chainId ?? 1);
    return { ...connection, method: "walletconnect" };
  }

  if (hasInjectedEthereumProvider()) {
    return connectEvmWalletInjected();
  }

  if (method === "injected") {
    throw new Error("No injected wallet found in this browser.");
  }

  const { isMobileWalletContext } = await import("@/lib/walletAuthority/client/detectMobileBrowser");
  const { walletConnectProjectIdConfigured } = await import(
    "@/lib/walletAuthority/client/evmConnectionUi"
  );
  if (isMobileWalletContext() && walletConnectProjectIdConfigured()) {
    const { connectEvmWalletViaWalletConnect } = await import(
      "@/lib/walletAuthority/client/walletConnectProvider"
    );
    const connection = await connectEvmWalletViaWalletConnect(options?.chainId ?? 1);
    return { ...connection, method: "walletconnect" };
  }

  throw new Error("No injected wallet found in this browser.");
}

/** Sign a SIWE challenge message via personal_sign (MetaMask-compatible). */
export async function signEvmPersonalMessage(
  provider: EthereumProvider,
  message: string,
  address: string,
): Promise<string> {
  const signature = await provider.request({
    method: "personal_sign",
    params: [message, address],
  });
  if (typeof signature !== "string" || !signature.startsWith("0x")) {
    throw new Error("Wallet did not return a valid signature");
  }
  return signature;
}
