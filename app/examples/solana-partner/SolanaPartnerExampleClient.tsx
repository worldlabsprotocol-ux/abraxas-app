"use client";
// FILE: app/examples/solana-partner/SolanaPartnerExampleClient.tsx
// Before/after Solana gated action. No wallet, no funds, no receipt in the UI.

import { useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import type { SolanaClientVisibleResult } from "@/lib/partner/solana";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const FIXTURES = [
  { id: "approved", label: "Approved receipt" },
  { id: "denied", label: "Denied receipt" },
  { id: "expired", label: "Expired receipt" },
  { id: "revoked", label: "Revoked receipt" },
  { id: "cross_partner", label: "Cross partner receipt" },
  { id: "altered_policy", label: "Altered policy receipt" },
  { id: "sandbox_only", label: "Sandbox receipt on production" },
] as const;

export function SolanaPartnerExampleClient({ startUrl }: { startUrl: string }) {
  const [gate, setGate] = useState<SolanaClientVisibleResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function evaluate(fixture: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/examples/solana-partner/gate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fixture,
          action: "claim_access",
          environment: fixture === "sandbox_only" ? "production" : "sandbox",
        }),
      });
      const json = (await res.json()) as SolanaClientVisibleResult;
      setGate(json);
    } finally {
      setBusy(false);
    }
  }

  const canClaim = gate?.allowed === true;

  return (
    <>
      <ContentCard title="Before a valid receipt">
        <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
          Claim access stays unavailable until the partner server verifies a signed Abraxas receipt.
          This page never shows a wallet, receipt, signature, or profile.
        </p>
        <button
          type="button"
          disabled={!canClaim || busy}
          style={{
            marginTop: "1rem",
            padding: "0.7rem 1.1rem",
            borderRadius: 10,
            border: "none",
            background: canClaim ? "#10B981" : "#64748b",
            color: "#fff",
            fontFamily: FONT,
            fontWeight: 700,
            cursor: canClaim ? "pointer" : "not-allowed",
          }}
        >
          {canClaim ? "Claim access" : "Claim access unavailable"}
        </button>
      </ContentCard>

      <ContentCard title="Evaluate a receipt on the server">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
          Fixtures call the same Integration Kit verifier. Production mode rejects sandbox only receipts.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
          {FIXTURES.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={busy}
              onClick={() => void evaluate(item.id)}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--surface-inset)",
                color: "var(--text-primary)",
                fontFamily: FONT,
                fontSize: "0.74rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        {gate && (
          <pre style={{ fontFamily: MONO, fontSize: "0.72rem", marginTop: "1rem", padding: "0.85rem", borderRadius: 10, border: "1px solid var(--border)" }}>
            {JSON.stringify(gate, null, 2)}
          </pre>
        )}
      </ContentCard>

      <ContentCard title="Start a live policy request">
        <a href={startUrl} style={{ color: "#10B981", fontFamily: FONT, fontWeight: 700 }}>
          Open hosted Partner Flow →
        </a>
      </ContentCard>
    </>
  );
}
