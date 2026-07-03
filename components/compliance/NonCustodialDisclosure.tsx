"use client";
// FILE: components/compliance/NonCustodialDisclosure.tsx
// Plain-language settlement disclosure for booking and payment flows.

import { useState } from "react";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

interface Props {
  variant?: "inline" | "compact" | "modal";
  /** Shown when routing still uses a protocol settlement address during escrow migration */
  settlementNote?: string;
}

export function NonCustodialDisclosure({ variant = "inline", settlementNote }: Props) {
  const [open, setOpen] = useState(false);

  const body = (
    <>
      <p style={{ margin: "0 0 0.75rem", fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
        Abraxas operates as a <strong style={{ color: "var(--text-primary)" }}>verification and attestation registry</strong>, not a custodian or counterparty to your transaction.
      </p>
      <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
        <li>Capital routes to <strong>asset-specific settlement containers</strong> — not a commingled corporate treasury for investor funds.</li>
        <li>Funds remain locked until booking or deal conditions are verified on-chain or by attested workflow.</li>
        <li>Abraxas verifies state; it does not take discretionary custody of your capital.</li>
      </ul>
      {settlementNote && (
        <p style={{ margin: "0.75rem 0 0", fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
          {settlementNote}
        </p>
      )}
    </>
  );

  if (variant === "compact") {
    return (
      <div style={{
        padding: "0.65rem 0.85rem", borderRadius: 10,
        background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.65rem", fontWeight: 700, color: ACCENT, marginBottom: 4 }}>
          Non-custodial settlement
        </div>
        <p style={{ margin: 0, fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          Abraxas attests — it does not hold investor capital.{" "}
          <button type="button" onClick={() => setOpen(o => !o)}
            style={{ background: "none", border: "none", padding: 0, color: ACCENT, cursor: "pointer", fontFamily: FONT, fontSize: "0.68rem", fontWeight: 600 }}>
            {open ? "Hide details" : "How funds move →"}
          </button>
        </p>
        {open && <div style={{ marginTop: "0.65rem" }}>{body}</div>}
      </div>
    );
  }

  return (
    <div style={{
      padding: variant === "modal" ? "1rem 1.15rem" : "0.85rem 1rem",
      borderRadius: 12,
      background: "var(--surface)",
      border: "1px solid var(--border)",
    }}>
      <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: ACCENT, marginBottom: "0.5rem" }}>
        Non-custodial protocol settlement
      </div>
      {body}
    </div>
  );
}
