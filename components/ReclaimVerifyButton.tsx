"use client";
// FILE: components/ReclaimVerifyButton.tsx
// Triggers a Reclaim Protocol verification flow for a given provider
// (linkedin, twitter, github). Real triggerReclaimFlow() usage per
// the actual SDK docs, opens a portal in a new tab and polls for
// completion.

import { useState } from "react";

const S = "system-ui,-apple-system,sans-serif";
const G = "#10B981";

interface ReclaimVerifyButtonProps {
  provider: "linkedin" | "twitter" | "github" | "gmail";
  label: string;
  userId?: string;
  onVerified?: () => void;
}

export function ReclaimVerifyButton({ provider, label, userId, onVerified }: ReclaimVerifyButtonProps) {
  const [status, setStatus] = useState<"idle" | "starting" | "open" | "error">("idle");

  async function start() {
    setStatus("starting");
    try {
      const res = await fetch("/api/reclaim/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, userId }),
      });
      const data = await res.json();
      if (data.error) {
        setStatus("error");
        return;
      }

      // Dynamic import, this SDK is browser-heavy, no need to bundle
      // it into every page that doesn't use verification.
      const { ReclaimProofRequest } = await import("@reclaimprotocol/js-sdk");
      const reclaimProofRequest = await ReclaimProofRequest.fromJsonString(data.configJson);
      const handle = await reclaimProofRequest.triggerReclaimFlow();
      setStatus("open");

      // The SDK's portal flow polls and calls your callback URL on
      // completion server-side, onVerified here is optimistic UI only,
      // confirm real status from your own backend before trusting it.
      void handle;
      onVerified?.();
    } catch {
      setStatus("error");
    }
  }

  return (
    <button onClick={start} disabled={status === "starting" || status === "open"}
      style={{ padding:"0.5rem 1rem", borderRadius:8, border:`1px solid ${G}40`,
                background: status === "open" ? `${G}15` : "transparent",
                color:G, fontFamily:S, fontSize:"0.78rem", fontWeight:600,
                cursor:"pointer" }}>
      {status === "starting" ? "Starting…" : status === "open" ? "Verifying…" : `Verify ${label}`}
    </button>
  );
}
