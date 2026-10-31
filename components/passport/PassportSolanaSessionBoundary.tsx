"use client";

import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";

// A connected adapter is not authentication. Once a Solana signature has
// authenticated Passport, the browser session must not outlive that account.
export function PassportSolanaSessionBoundary() {
  const { connected, connecting, publicKey } = useWallet();
  const { signOut } = useSuiAuth();
  const address = publicKey?.toBase58() ?? null;

  useEffect(() => {
    if (connecting) return;
    let cancelled = false;

    const check = async () => {
      try {
        const response = await fetch("/api/auth/browser-session", {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const session = await response.json() as {
          auth_method?: string | null;
          wallet_caip10?: string | null;
        };
        if (cancelled || session.auth_method !== "solana_wallet") return;

        const signedAddress = session.wallet_caip10?.split(":")[2] ?? null;
        if (!connected || !address || signedAddress !== address) signOut();
      } catch {
        // Protected APIs still require the server session. Recheck on the
        // next wallet change or holder-session event if the probe failed.
      }
    };

    void check();
    window.addEventListener("abraxas:holder-session", check);
    return () => {
      cancelled = true;
      window.removeEventListener("abraxas:holder-session", check);
    };
  }, [address, connected, connecting, signOut]);

  return null;
}
