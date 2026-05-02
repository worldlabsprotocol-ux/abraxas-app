// FILE: lib/useOgVerification.ts
"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import type { Chain } from "viem";

// Mainnet inline — no wagmi/chains or viem/chains barrel import
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

export const OG_COLLECTION_ADDRESS =
  process.env.NEXT_PUBLIC_OG_ETH_COLLECTION &&
  /^0x[a-fA-F0-9]{40}$/.test(process.env.NEXT_PUBLIC_OG_ETH_COLLECTION.trim())
    ? (process.env.NEXT_PUBLIC_OG_ETH_COLLECTION.trim() as `0x${string}`)
    : undefined;

const ERC721_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// OgState shape matches what access/page.tsx expects:
// switch (og.status) with cases: no-collection, disconnected, checking, verified, not-holder, error
export interface OgState {
  status:  "no-collection" | "disconnected" | "checking" | "verified" | "not-holder" | "error";
  balance: number;
  error:   string | null;
}

export function useOgVerification(): OgState {
  const { address, isConnected } = useAccount();

  const { data: balance, isLoading, isError } = useReadContract({
    address:      OG_COLLECTION_ADDRESS,
    abi:          ERC721_ABI,
    functionName: "balanceOf",
    args:         address ? [address] : undefined,
    chainId:      mainnet.id,
    query: { enabled: Boolean(isConnected && address && OG_COLLECTION_ADDRESS) },
  });

  if (!OG_COLLECTION_ADDRESS) {
    return { status: "no-collection", balance: 0, error: null };
  }
  if (!isConnected || !address) {
    return { status: "disconnected", balance: 0, error: null };
  }
  if (isLoading) {
    return { status: "checking", balance: 0, error: null };
  }
  if (isError) {
    return { status: "error", balance: 0, error: "Contract read failed" };
  }
  if (balance !== undefined) {
    const n = Number(balance);
    return n > 0
      ? { status: "verified",    balance: n, error: null }
      : { status: "not-holder",  balance: 0, error: null };
  }
  return { status: "checking", balance: 0, error: null };
}