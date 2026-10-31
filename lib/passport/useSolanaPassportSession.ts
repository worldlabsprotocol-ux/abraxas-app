"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

type ServerSession = {
  auth_method?: string | null;
  holder_subject_id?: string | null;
  wallet_caip10?: string | null;
};

type SessionState =
  | { kind: "loading" | "other" | "unavailable" | "reconnect" }
  | { kind: "authenticated"; holderSubjectId: string };

function validSolanaBinding(session: ServerSession): { subjectId: string; walletAddress: string } | null {
  const subjectId = session.holder_subject_id;
  const parts = session.wallet_caip10?.split(":");
  if (session.auth_method !== "solana_wallet"
    || !subjectId || !/^abx_hs_[0-9a-f]{32}$/.test(subjectId)
    || parts?.length !== 3 || parts[0] !== "solana" || !parts[2]) return null;
  return { subjectId, walletAddress: parts[2] };
}

export function useSolanaPassportSession(): { state: SessionState; refresh: () => Promise<void> } {
  const { connected, publicKey } = useWallet();
  const walletAddress = connected ? publicKey?.toBase58() ?? null : null;
  const [serverSession, setServerSession] = useState<ServerSession | null>(null);
  const [probeState, setProbeState] = useState<"loading" | "ready" | "unavailable">("loading");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/browser-session", {
        credentials: "include",
        cache: "no-store",
      });
      if (response.status === 401) {
        setServerSession(null);
        setProbeState("ready");
        return;
      }
      if (!response.ok) throw new Error("session_probe_failed");
      setServerSession(await response.json() as ServerSession);
      setProbeState("ready");
    } catch {
      setServerSession(null);
      setProbeState("unavailable");
    }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener("abraxas:holder-session", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("abraxas:holder-session", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  if (probeState === "loading") return { state: { kind: "loading" }, refresh };
  if (probeState === "unavailable") return { state: { kind: "unavailable" }, refresh };
  if (serverSession?.auth_method !== "solana_wallet") return { state: { kind: "other" }, refresh };
  const binding = validSolanaBinding(serverSession);
  if (!binding || !walletAddress || binding.walletAddress !== walletAddress) {
    return { state: { kind: "reconnect" }, refresh };
  }
  return { state: { kind: "authenticated", holderSubjectId: binding.subjectId }, refresh };
}

