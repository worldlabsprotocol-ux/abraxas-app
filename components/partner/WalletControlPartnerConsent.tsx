"use client";
// FILE: components/partner/WalletControlPartnerConsent.tsx
// Opaque vr_* wallet_control consent — partner-flow complete, not verification_requests UUID.

import { useState } from "react";
import type { PartnerFlowHandoffController } from "@/lib/passport/partnerFlowHandoff";
import { holderSafeClientMessage, resolveHolderRecovery } from "@/lib/partner/holderExperience";
import { ProductOutcomeState } from "@/components/product/ProductOutcomeState";
import { HolderRecoveryCard } from "@/components/partner/HolderRecoveryCard";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function WalletControlPartnerConsent({
  partnerName,
  handoff,
  onDeclined,
}: {
  partnerName: string;
  handoff: PartnerFlowHandoffController;
  onDeclined?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (handoff.phase === "failed") {
    return (
      <HolderRecoveryCard
        recovery={resolveHolderRecovery("invalid_binding", partnerName, null)}
      />
    );
  }

  if (handoff.phase === "completed") {
    return null;
  }

  async function approve() {
    if (!handoff.ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await handoff.complete();
    } catch {
      setError(holderSafeClientMessage());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="wallet-control-consent-heading"
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: 14,
        padding: "1rem 1.1rem",
        background: "var(--surface-raised)",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      <div>
        <p
          id="wallet-control-consent-heading"
          style={{ margin: 0, fontFamily: FONT, fontWeight: 800, fontSize: "0.95rem", lineHeight: 1.45 }}
        >
          Review partner authorization
        </p>
        <p style={{ margin: "0.4rem 0 0", fontFamily: FONT, fontSize: "0.84rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
          {partnerName} can receive a wallet-control verification result only if you approve below.
        </p>
      </div>

      <ul
        style={{
          margin: 0,
          paddingLeft: "1.1rem",
          fontFamily: FONT,
          fontSize: "0.8rem",
          lineHeight: 1.55,
          color: "var(--text-secondary)",
        }}
      >
        <li>Shared if approved: wallet control confirmed (policy result only).</li>
        <li>Not shared: private keys, seed phrases, identity documents, or unrelated account data.</li>
      </ul>

      {error ? (
        <ProductOutcomeState kind="error" title="Authorization could not complete" detail={error} />
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <button
          type="button"
          disabled={!handoff.ready || busy || handoff.inFlight}
          onClick={() => void approve()}
          style={{
            padding: "0.6rem 0.9rem",
            borderRadius: 10,
            border: "none",
            background: "#14F195",
            color: "#04110c",
            fontFamily: FONT,
            fontWeight: 700,
            cursor: handoff.ready && !busy ? "pointer" : "not-allowed",
            opacity: handoff.ready && !busy ? 1 : 0.55,
          }}
        >
          {busy || handoff.inFlight ? "Authorizing…" : "Approve and share result"}
        </button>
        <button
          type="button"
          disabled={busy || handoff.inFlight}
          onClick={() => onDeclined?.()}
          style={{
            padding: "0.45rem 0.75rem",
            borderRadius: 8,
            border: "1px solid var(--border-subtle)",
            background: "transparent",
            color: "var(--text-secondary)",
            fontFamily: FONT,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Decline
        </button>
      </div>
    </section>
  );
}
