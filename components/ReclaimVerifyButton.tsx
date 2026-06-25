"use client";
// FILE: components/ReclaimVerifyButton.tsx
// Triggers a Reclaim Protocol verification flow for a given provider
// (linkedin, twitter, github, gmail). Uses the embedded iframe mode
// instead of the default new-tab "portal" mode.
//
// Why: triggerReclaimFlow()'s default mode opens a new tab via
// something like window.open() internally. That only reliably works
// when it happens as the direct, synchronous result of a user click.
// My first version had several awaited steps (a fetch, a dynamic
// import) between the click and that call, which is enough delay for
// most browsers to no longer treat it as user-initiated, so the
// popup blocker silently ate it, nothing visibly happened. Embedding
// it as an iframe in the page avoids that entirely, no new
// window needs permission.

import { useState, useRef } from "react";

const S = "system-ui,-apple-system,sans-serif";
const G = "#10B981";
const BDR = "var(--border)";

interface ReclaimVerifyButtonProps {
  provider: "linkedin" | "twitter" | "github" | "gmail";
  label: string;
  userId?: string;
  onVerified?: () => void;
}

export function ReclaimVerifyButton({ provider, label, userId, onVerified }: ReclaimVerifyButtonProps) {
  const [status, setStatus] = useState<"idle" | "starting" | "open" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<{ close: () => void } | null>(null);

  async function start() {
    setStatus("starting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/reclaim/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, userId }),
      });
      const data = await res.json();
      if (data.error) {
        setStatus("error");
        setErrorMsg(data.error);
        return;
      }

      const { ReclaimProofRequest } = await import("@reclaimprotocol/js-sdk");
      const reclaimProofRequest = await ReclaimProofRequest.fromJsonString(data.configJson);

      setStatus("open");
      // Give the container a moment to actually render before mounting the iframe into it
      await new Promise(r => setTimeout(r, 50));

      const handle = await reclaimProofRequest.triggerReclaimFlow({
        target: containerRef.current ?? undefined,
      });
      handleRef.current = handle;

      // The SDK polls in the background and calls your callback URL on
      // completion server-side, this onVerified is optimistic UI only,
      // confirm real status from your own backend before trusting it.
      onVerified?.();
    } catch (err) {
      setStatus("error");
      setErrorMsg("Could not start verification, try again");
    }
  }

  function cancel() {
    handleRef.current?.close();
    handleRef.current = null;
    setStatus("idle");
  }

  return (
    <div>
      <button onClick={start} disabled={status === "starting" || status === "open"}
        style={{ padding:"0.5rem 1rem", borderRadius:8, border:`1px solid ${G}40`,
                  background: status === "open" ? `${G}15` : "transparent",
                  color:G, fontFamily:S, fontSize:"0.78rem", fontWeight:600,
                  cursor:"pointer" }}>
        {status === "starting" ? "Starting…" : status === "open" ? "Verifying below…" : `Verify ${label}`}
      </button>
      {errorMsg && (
        <div style={{ fontFamily:S, fontSize:"0.7rem", color:"#EF4444", marginTop:"0.4rem" }}>
          {errorMsg}
        </div>
      )}
      {status === "open" && (
        <div style={{ marginTop:"0.75rem" }}>
          <div ref={containerRef}
            style={{ width:"100%", minHeight:480, borderRadius:10,
                      border:`1px solid ${BDR}`, overflow:"hidden" }} />
          <button onClick={cancel}
            style={{ marginTop:"0.5rem", background:"none", border:"none",
                      color:"var(--text-muted)", fontFamily:S, fontSize:"0.7rem",
                      textDecoration:"underline", cursor:"pointer", padding:0 }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
