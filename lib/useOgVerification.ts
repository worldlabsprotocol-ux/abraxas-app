"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { mainnet } from "wagmi/chains";

/**
 * NEXT_PUBLIC_* env vars are inlined at BUILD TIME by Next.js.
 * This means:
 *  - You MUST restart `npm run dev` after editing .env.local
 *  - The value is captured here once at module load
 */
const OG_COLLECTION_RAW = process.env.NEXT_PUBLIC_OG_ETH_COLLECTION;

// Temporary diagnostic — verify env is loaded. Safe to log: this is a
// public contract address, not a secret. Remove once confirmed working.
if (typeof window !== "undefined") {
  console.log(
    "[og-verification] NEXT_PUBLIC_OG_ETH_COLLECTION =",
    OG_COLLECTION_RAW || "(MISSING — restart dev server after editing .env.local)"
  );
}

const OG_COLLECTION =
  OG_COLLECTION_RAW && /^0x[a-fA-F0-9]{40}$/.test(OG_COLLECTION_RAW.trim())
    ? (OG_COLLECTION_RAW.trim() as `0x${string}`)
    : undefined;

const ERC721_ABI = [
  {
    constant: true,
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
    stateMutability: "view",
  },
] as const;

export type OgState =
  | { status: "disconnected" }
  | { status: "no-collection" }
  | { status: "checking" }
  | { status: "verified"; balance: number }
  | { status: "not-holder" }
  | { status: "error"; error: string };

/**
 * Reads ERC-721 balanceOf on the OG collection contract for the
 * connected EVM wallet. Returns a discriminated union for clean rendering.
 */
export function useOgVerification(): OgState {
  const { address, isConnected } = useAccount();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const enabled =
    hydrated && isConnected && Boolean(address) && Boolean(OG_COLLECTION);

  const { data, isLoading, error } = useReadContract({
    abi: ERC721_ABI,
    address: OG_COLLECTION,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: mainnet.id,
    query: { enabled },
  });

  if (!OG_COLLECTION) return { status: "no-collection" };
  if (!isConnected || !address) return { status: "disconnected" };
  if (isLoading) return { status: "checking" };
  if (error) return { status: "error", error: error.message ?? "Failed to verify" };

  const balance = typeof data === "bigint" ? Number(data) : 0;
  return balance > 0
    ? { status: "verified", balance }
    : { status: "not-holder" };
}

/** Exported so the access page can show the configured contract address. */
export const OG_COLLECTION_ADDRESS = OG_COLLECTION;
