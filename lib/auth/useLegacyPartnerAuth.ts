"use client";

import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";

/** Legacy partner routes only. Hosted Solana requests never use this identity. */
export function useLegacyPartnerAuth() {
  const auth = useSuiAuthOptional();
  return {
    suiAddress: auth?.suiAddress ?? null,
    session: auth?.session ?? null,
    isLoading: auth?.isLoading ?? false,
    signInWithGoogle: auth?.signInWithGoogle,
    refreshSession: auth?.refreshSession ?? (() => {}),
  };
}
