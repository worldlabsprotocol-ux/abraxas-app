"use client";
// FILE: components/home/HomeTrustTransferStrip.tsx
// Trust transfer messaging. portable cryptographic proof.

import { TRUST_TRANSFER_HEADLINE, TRUST_TRANSFER_SUBLINE, COUNTERPARTY_TRUST_BLURB } from "@/lib/trustTransfer";
import { BLOCKCHAIN_VS_COINS_LINE } from "@/lib/intersectionThesis";

import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function HomeTrustTransferStrip() {
  return (
    <section
      id="trust-transfer"
      aria-labelledby="trust-transfer-heading"
      style={{
        padding: "clamp(1rem, 3vw, 1.5rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <div
        className="abx-glass-panel"
        style={{
          padding: "clamp(1rem, 3vw, 1.25rem)",
          borderRadius: 14,
          border: "1px solid rgba(16,185,129,0.25)",
          background: "linear-gradient(155deg, rgba(16,185,129,0.06) 0%, var(--surface-raised) 100%)",
        }}
      >
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.45rem" }}>
          Trust transfer · not reputation
        </div>
        <h2
          id="trust-transfer-heading"
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.05rem, 2.8vw, 1.25rem)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            lineHeight: 1.25,
            color: "var(--text-primary)",
            margin: "0 0 0.5rem",
            maxWidth: 620,
          }}
        >
          {TRUST_TRANSFER_HEADLINE}
        </h2>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            margin: "0 0 0.45rem",
            maxWidth: 640,
          }}
        >
          {TRUST_TRANSFER_SUBLINE}
        </p>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            lineHeight: 1.6,
            margin: "0 0 0.45rem",
            maxWidth: 640,
            fontStyle: "italic",
          }}
        >
          {BLOCKCHAIN_VS_COINS_LINE}
        </p>
        <p
          style={{
            fontFamily: MONO,
            fontSize: "0.58rem",
            letterSpacing: "0.06em",
            color: "#10B981",
            margin: 0,
          }}
        >
          {COUNTERPARTY_TRUST_BLURB}
        </p>
      </div>
    </section>
  );
}
