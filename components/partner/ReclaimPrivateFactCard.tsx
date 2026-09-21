"use client";
// FILE: components/partner/ReclaimPrivateFactCard.tsx
// Holder card for the configured Reclaim route. No provider internals.

import { useEffect, useRef, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { RECLAIM_HOLDER_COPY } from "@/lib/reclaimAttestation/contract";

type CardState = "idle" | "loading" | "open" | "approved" | "cancelled" | "expired" | "invalid" | "unavailable";

export function ReclaimPrivateFactCard(props: {
  verifyRequestId: string;
  onApproved?: () => void;
}) {
  const [state, setState] = useState<CardState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionRef, setSessionRef] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<{ close: () => void } | null>(null);

  useEffect(() => {
    if (!sessionRef || state !== "open") return undefined;
    const timer = window.setInterval(() => {
      void (async () => {
        const res = await fetch(`/api/reclaim/session?session_ref=${encodeURIComponent(sessionRef)}`, {
          credentials: "include",
        });
        const data = await res.json() as { status?: string };
        if (data.status === "accepted") {
          handleRef.current?.close();
          setState("approved");
          props.onApproved?.();
        }
        if (data.status === "expired") setState("expired");
        if (data.status === "invalid") setState("invalid");
        if (data.status === "cancelled") setState("cancelled");
      })();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [sessionRef, state, props]);

  async function start() {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/reclaim/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verify_request: props.verifyRequestId }),
      });
      const data = await res.json() as { request_config?: string; session_ref?: string; code?: string };
      if (!res.ok || !data.request_config || !data.session_ref) {
        setState(data.code === "reclaim_expired" ? "expired" : "unavailable");
        setError("This private check is not available right now. Try again or choose another method.");
        return;
      }
      setSessionRef(data.session_ref);
      const { ReclaimProofRequest } = await import("@reclaimprotocol/js-sdk");
      const request = await ReclaimProofRequest.fromJsonString(data.request_config);
      setState("open");
      await new Promise((resolve) => window.setTimeout(resolve, 40));
      handleRef.current = await request.triggerReclaimFlow({
        target: containerRef.current ?? undefined,
      });
    } catch {
      setState("unavailable");
      setError("This private check could not start. Try again.");
    }
  }

  async function cancel() {
    handleRef.current?.close();
    if (sessionRef) {
      await fetch(`/api/reclaim/session?session_ref=${encodeURIComponent(sessionRef)}`, {
        method: "DELETE",
        credentials: "include",
      });
    }
    setState("cancelled");
  }

  const nextAction = state === "approved"
    ? "Continue to consent. Sharing still requires your approval."
    : state === "cancelled" || state === "expired" || state === "invalid" || state === "unavailable"
      ? "Try again, or choose another approved method."
      : null;

  return (
    <section aria-labelledby="reclaim-private-fact-heading" style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <h3 id="reclaim-private-fact-heading" style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
        {RECLAIM_HOLDER_COPY}
      </h3>
      <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.55 }}>
        Abraxas checks one required fact privately. The partner never receives the source details.
      </p>
      {state === "loading" && (
        <StatusBanner tone="pending" title="Starting private check">
          Preparing a short-lived verification session.
        </StatusBanner>
      )}
      {state === "approved" && (
        <StatusBanner tone="success" title="Private check approved">
          Continue through consent. This step does not share a result by itself.
        </StatusBanner>
      )}
      {(state === "cancelled" || state === "expired" || state === "invalid" || state === "unavailable") && (
        <StatusBanner tone="info" title={state === "expired" ? "Session expired" : state === "cancelled" ? "Cancelled" : "Could not complete"}>
          {nextAction}
        </StatusBanner>
      )}
      {state !== "approved" && state !== "open" && (
        <Btn onClick={() => void start()} disabled={state === "loading"}>
          {state === "loading" ? "Starting…" : state === "idle" ? "Start private check" : "Try again"}
        </Btn>
      )}
      {state === "open" && (
        <>
          <div ref={containerRef} style={{ minHeight: 420, borderRadius: 10, border: "1px solid var(--border)" }} />
          <Btn variant="secondary" onClick={() => void cancel()}>Cancel</Btn>
        </>
      )}
      {error && <p role="alert" style={{ margin: 0, color: "var(--text-secondary)" }}>{error}</p>}
    </section>
  );
}
