// FILE: components/WorldIDVerify.tsx
// World ID proof-of-personhood for Abraxas.
// Uses dynamic import (required for Next.js App Router — IDKit is client-only).
"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

const IDKitWidget = dynamic(
  () => import("@worldcoin/idkit").then(m => m.IDKitWidget),
  { ssr: false }
);

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "system-ui,-apple-system,sans-serif";
const G = "#10B981";
const BDR = "#1C2333";
const W = "#F8FAFC";
const R = "#EF4444";

const APP_ID  = (process.env.NEXT_PUBLIC_WORLDID_APP_ID  ?? "") as `app_${string}`;
const ACTION  =  process.env.NEXT_PUBLIC_WORLDID_ACTION  ?? "abraxas-verify-identity";

export type WorldIDStatus = "idle" | "verifying" | "verified" | "failed";

interface Props {
  onVerified?: (nullifierHash: string) => void;
  onError?:    (msg: string) => void;
  mode?:       "button" | "compact";
  signal?:     string;
}

export function WorldIDVerify({
  onVerified, onError, mode = "button", signal = "0x0",
}: Props) {
  const [status,    setStatus]    = useState<WorldIDStatus>("idle");
  const [errMsg,    setErrMsg]    = useState<string | null>(null);
  const [nullifier, setNullifier] = useState<string | null>(null);

  const handleVerify = useCallback(async (proof: {
    nullifier_hash: string;
    merkle_root: string;
    proof: string;
    verification_level: string;
  }) => {
    setStatus("verifying");
    try {
      const res = await fetch("/api/worldid/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ proof, signal, action: ACTION }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Verification failed");
      setStatus("verified");
      setNullifier(proof.nullifier_hash);
      onVerified?.(proof.nullifier_hash);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Verification error";
      setStatus("failed");
      setErrMsg(msg);
      onError?.(msg);
    }
  }, [signal, onVerified, onError]);

  const onSuccess = useCallback(() => {
    // Widget closes after success — handleVerify does the actual work
  }, []);

  // Not configured
  if (!APP_ID || APP_ID === "app_") {
    return (
      <div style={{
        padding: "0.375rem 0.625rem", borderRadius: 4,
        border: `1px solid ${R}25`, background: `${R}06`,
        fontFamily: M, fontSize: "0.6rem", color: `${R}80`,
      }}>
        Set NEXT_PUBLIC_WORLDID_APP_ID to enable World ID
      </div>
    );
  }

  // Already verified
  if (status === "verified") {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "0.4rem",
        padding: "0.3rem 0.625rem", borderRadius: 4,
        border: `1px solid ${G}40`, background: `${G}08`,
      }}>
        <span>🌐</span>
        <span style={{ fontFamily: M, fontSize: "0.62rem", fontWeight: 700,
                        color: G, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          World ID Verified
        </span>
        {mode !== "compact" && nullifier && (
          <span style={{ fontFamily: M, fontSize: "0.52rem",
                          color: "rgba(255,255,255,0.25)" }}>
            {nullifier.slice(0, 10)}…
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      <IDKitWidget
        app_id={APP_ID}
        action={ACTION}
        signal={signal}
        handleVerify={handleVerify}
        onSuccess={onSuccess}
      >
        {({ open }: { open(): void }) => (
          <button
            onClick={open}
            disabled={status === "verifying"}
            style={{
              display: "inline-flex", alignItems: "center",
              gap: mode === "compact" ? "0.375rem" : "0.5rem",
              padding: mode === "compact" ? "0.3rem 0.625rem" : "0.5rem 0.875rem",
              borderRadius: 5,
              border: `1px solid ${BDR}`,
              background: "rgba(255,255,255,0.04)",
              color: W, fontFamily: S,
              fontSize: mode === "compact" ? "0.7rem" : "0.8rem",
              fontWeight: 600, cursor: "pointer",
              opacity: status === "verifying" ? 0.6 : 1,
            }}
          >
            <svg width={mode === "compact" ? 13 : 16} height={mode === "compact" ? 13 : 16}
                 viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5"/>
              <ellipse cx="12" cy="12" rx="4" ry="10" stroke="white" strokeWidth="1.5"/>
              <path d="M2 12h20" stroke="white" strokeWidth="1.5"/>
            </svg>
            {status === "verifying" ? "Verifying…" : "Verify with World ID"}
          </button>
        )}
      </IDKitWidget>

      {status === "failed" && errMsg && (
        <div style={{ marginTop: "0.25rem", fontFamily: M,
                       fontSize: "0.6rem", color: R }}>
          {errMsg}
        </div>
      )}

      {mode !== "compact" && status === "idle" && (
        <p style={{ margin: "0.25rem 0 0", fontFamily: S, fontSize: "0.62rem",
                     color: "rgba(255,255,255,0.28)", lineHeight: 1.5 }}>
          Optional. Proves unique humanity. Increases your Verification Score.
        </p>
      )}
    </div>
  );
}
