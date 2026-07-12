"use client";
// FILE: lib/hooks/usePassportCanonicalState.ts
// Reads canonical Passport state from existing APIs — one graph, many summaries.

import { useQuery } from "@tanstack/react-query";
import {
  buildPassportCanonicalState,
  type PassportCanonicalState,
} from "@/lib/passport/passportCanonicalState";
import type { IdentityUiState } from "@/lib/passport/identityUiState";

async function fetchWalletBindings() {
  const res = await fetch("/api/wallet-authority/wallets", { credentials: "include" });
  if (res.status === 401) return [];
  if (!res.ok) throw new Error("Failed to load wallets");
  const data = await res.json() as { wallets?: Array<{
    id: string;
    chain: string;
    wallet_address: string;
    binding_status: string;
    verified_at: string;
  }> };
  return data.wallets ?? [];
}

async function fetchShareHistory() {
  const res = await fetch("/api/credentials/share-history", { credentials: "include" });
  if (!res.ok) return [];
  const data = await res.json() as { shares?: Array<{
    id: string;
    partner_id: string;
    purpose: string | null;
    claims_authorized: string[];
    shared_at: string;
    expires_at: string | null;
    revoked_at: string | null;
  }> };
  return data.shares ?? [];
}

export function usePassportCanonicalState(input: {
  suiAddress: string | null;
  identityUi: IdentityUiState;
  credentialExpiresAt?: string | null;
  credentialIssuedAt?: string | null;
  idvProvider?: "veriff" | "manual";
}) {
  const enabled = Boolean(input.suiAddress);

  const walletsQuery = useQuery({
    queryKey: ["passport-canonical", "wallets", input.suiAddress],
    queryFn: fetchWalletBindings,
    enabled,
    staleTime: 15_000,
  });

  const sharesQuery = useQuery({
    queryKey: ["passport-canonical", "shares", input.suiAddress],
    queryFn: fetchShareHistory,
    enabled,
    staleTime: 15_000,
  });

  const state: PassportCanonicalState | null = enabled
    ? buildPassportCanonicalState({
        identityUi: input.identityUi,
        credentialExpiresAt: input.credentialExpiresAt,
        credentialIssuedAt: input.credentialIssuedAt,
        idvIssuer: input.idvProvider === "manual" ? "Abraxas pilot review" : "Approved identity provider",
        walletBindings: walletsQuery.data,
        shares: sharesQuery.data,
      })
    : null;

  return {
    state,
    isLoading: walletsQuery.isLoading || sharesQuery.isLoading,
    refetch: async () => {
      await Promise.all([walletsQuery.refetch(), sharesQuery.refetch()]);
    },
  };
}
