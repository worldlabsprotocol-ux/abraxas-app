"use client";

import { useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

// A connected adapter is not authentication. Once a Solana signature has
// authenticated Passport, the browser session must not outlive that account.
export function PassportSolanaSessionBoundary() {
  const { connected, connecting, publicKey } = useWallet();
  const address = publicKey?.toBase58() ?? null;
  const observedConnectedRef = useRef(false);
  if (connected && address) observedConnectedRef.current = true;

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
        // A refreshed tab starts disconnected because the root adapter does
        // not auto-connect. Keep the cookie locked behind an explicit
        // reconnect; only a real disconnect transition revokes it.
        if ((!connected && observedConnectedRef.current)
          || (connected && (!address || signedAddress !== address))) {
          // Wallet state changed: invalidate the server cookie without asking
          // the legacy Sui provider to manage a Solana-authenticated session.
          await fetch("/api/auth/browser-session", { method: "DELETE", credentials: "include" });
        }
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
  }, [address, connected, connecting]);

  return null;
}

