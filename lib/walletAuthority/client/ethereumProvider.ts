"use client";
// FILE: lib/walletAuthority/client/ethereumProvider.ts
// MetaMask / injected EVM provider — client only (no viem/ethers imports).

export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export function getEthereumProvider(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum;
}

export interface EvmWalletConnection {
  provider: EthereumProvider;
  address: string;
  chainId: number;
}

/** Connect MetaMask and return address + chain — must complete before signing. */
export async function connectEvmWallet(): Promise<EvmWalletConnection> {
  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error("MetaMask not detected. Install MetaMask to bind an EVM wallet.");
  }

  const accounts = await provider.request({ method: "eth_requestAccounts" });
  const address = Array.isArray(accounts) ? (accounts[0] as string | undefined) : undefined;
  if (!address) throw new Error("No account selected");

  const chainHex = await provider.request({ method: "eth_chainId" });
  const chainId = Number.parseInt(String(chainHex), 16);
  if (!Number.isFinite(chainId)) throw new Error("Could not read chain ID from wallet");

  return { provider, address, chainId };
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
