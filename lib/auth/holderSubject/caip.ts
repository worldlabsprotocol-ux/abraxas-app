// FILE: lib/auth/holderSubject/caip.ts

import { getAddress } from "viem";
import { PublicKey } from "@solana/web3.js";

export type Caip10Parts = {
  namespace: string;
  reference: string;
  address: string;
  caip10: string;
};

export function formatCaip10(namespace: string, reference: string, address: string): string {
  return `${namespace}:${reference}:${address}`;
}

export function caip10Evm(chainId: number, address: string): Caip10Parts {
  const normalized = getAddress(address);
  const reference = String(chainId);
  return {
    namespace: "eip155",
    reference,
    address: normalized.toLowerCase(),
    caip10: formatCaip10("eip155", reference, normalized),
  };
}

export function caip10Solana(network: string, address: string): Caip10Parts {
  const pk = new PublicKey(address.trim());
  const normalized = pk.toBase58();
  const reference = network.trim();
  return {
    namespace: "solana",
    reference,
    address: normalized,
    caip10: formatCaip10("solana", reference, normalized),
  };
}

export function caip10Sui(network: string, address: string): Caip10Parts {
  const normalized = address.trim().toLowerCase();
  const reference = network.trim();
  return {
    namespace: "sui",
    reference,
    address: normalized,
    caip10: formatCaip10("sui", reference, normalized),
  };
}
