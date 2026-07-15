"use client";
// FILE: components/passport/PassportTrustTransferPanel.tsx
// How others verify this — trust transfer UX (Qozeem unlock).

import Link from "next/link";
import {
  TRUST_TRANSFER_ANSWER,
  VERIFICATION_CHAIN_STEPS,
  HOW_OTHERS_VERIFY_POINTS,
} from "@/lib/trustTransfer";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function PassportTrustTransferPanel({ hasCredential }: { hasCredential?: boolean }) {
  return (
    <section
      aria-labelledby="trust-transfer-heading"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
        borderRadius: 16,
        padding: "1.15rem 1.25rem",
        marginBottom: "1.25rem",
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: "0.52rem",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--accent)",
          marginBottom: "0.4rem",
        }}
      >
        Trust transfer
      </div>
      <h2
        id="trust-transfer-heading"
        style={{
          fontFamily: FONT,
          fontSize: "1.05rem",
          fontWeight: 800,
          color: "var(--text-primary)",
          margin: "0 0 0.45rem",
          letterSpacing: "-0.02em",
        }}
      >
        How others verify this
      </h2>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.82rem",
          color: "var(--text-secondary)",
          lineHeight: 1.65,
          margin: "0 0 1rem",
          maxWidth: 560,
        }}
      >
        {hasCredential
          ? TRUST_TRANSFER_ANSWER
          : "After you verify once, partners verify your credential cryptographically — they don't need to know you or re-run KYC."}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
          gap: "0.45rem",
          marginBottom: "1rem",
        }}
      >
        {VERIFICATION_CHAIN_STEPS.map(s => (
          <div
            key={s.step}
            style={{
              padding: "0.65rem 0.75rem",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: "0.48rem", color: ACCENT, marginBottom: 4 }}>{s.step}</div>
            <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>
              {s.title}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              {s.body}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.45rem" }}>
        Relying party verify paths
      </div>
      <ul style={{ margin: "0 0 0.85rem", paddingLeft: "1.1rem", fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
        {HOW_OTHERS_VERIFY_POINTS.map(p => (
          <li key={p} style={{ marginBottom: 4 }}>{p}</li>
        ))}
      </ul>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Link
          href="/docs/credential-portability"
          style={{
            fontFamily: FONT,
            fontSize: "0.76rem",
            fontWeight: 700,
            color: ACCENT,
            textDecoration: "none",
          }}
        >
          Credential portability →
        </Link>
        <Link
          href="/integrate#counterparty-trust"
          style={{
            fontFamily: FONT,
            fontSize: "0.76rem",
            fontWeight: 700,
            color: "var(--text-muted)",
            textDecoration: "none",
          }}
        >
          Why counterparties trust it →
        </Link>
      </div>
    </section>
  );
}
