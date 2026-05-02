// FILE: lib/useOgVerification.ts
"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import type { Chain } from "viem";

// Mainnet defined inline — same as EvmProvider.tsx.
// Avoids wagmi/chains and viem/chains barrels which pull in ox/tempo.
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

const OG_COLLECTION_RAW = process.env.NEXT_PUBLIC_OG_ETH_COLLECTION;

export const OG_COLLECTION_ADDRESS =
  OG_COLLECTION_RAW && /^0x[a-fA-F0-9]{40}$/.test(OG_COLLECTION_RAW.trim())
    ? (OG_COLLECTION_RAW.trim() as `0x${string}`)
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

export type OgState =
  | "loading"
  | "not_connected"
  | "no_collection"
  | "checking"
  | "og"
  | "not_og"
  | "error";

export function useOgVerification(): OgState {
  const { address, isConnected } = useAccount();
  const [state, setState] = useState<OgState>("loading");

  const { data: balance, isLoading, isError } = useReadContract({
    address:      OG_COLLECTION_ADDRESS,
    abi:          ERC721_ABI,
    functionName: "balanceOf",
    args:         address ? [address] : undefined,
    chainId:      mainnet.id,
    query: { enabled: Boolean(isConnected && address && OG_COLLECTION_ADDRESS) },
  });

  useEffect(() => {
    if (!OG_COLLECTION_ADDRESS) { setState("no_collection"); return; }
    if (!isConnected)            { setState("not_connected"); return; }
    if (isLoading)               { setState("checking");      return; }
    if (isError)                 { setState("error");         return; }
    if (balance !== undefined)   { setState(balance > 0n ? "og" : "not_og"); return; }
    setState("loading");
  }, [isConnected, isLoading, isError, balance]);

  return state;
}