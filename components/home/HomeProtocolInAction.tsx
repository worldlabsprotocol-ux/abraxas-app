"use client";
// FILE: components/home/HomeProtocolInAction.tsx
// Protocol in Action — three proofs + Passport connector (not a partner list).

import Link from "next/link";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  PROTOCOL_IN_ACTION_PROOFS,
  PROTOCOL_PASSPORT_CONNECTOR,
  type ProtocolProof,
} from "@/lib/home/ecosystemContent";

const FONT = ABRAXAS_FONT_SANS;
const ACCENT = "#10B981";

function ProofCard({ proof }: { proof: ProtocolProof }) {
  return (
    <Link
      href={proof.href}
      style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}
    >
      <article
        style={{
          height: "100%",
          padding: "1rem 1.05rem",
          borderRadius: 12,
          background: "var(--surface-raised)",
          border: "1px solid var(--border-strong)",
        }}
      >
        <div style={{
          fontFamily: FONT, fontSize: "0.62rem", fontWeight: 800,
          letterSpacing: "0.08em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.5rem",
        }}>
          {proof.category}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.35rem" }}>
          <span style={{ fontSize: "1.1rem" }} aria-hidden>{proof.icon}</span>
          <h3 style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            {proof.title}
          </h3>
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-primary)", margin: "0 0 0.35rem", fontWeight: 600 }}>
          {proof.summary}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          {proof.demonstrates}
        </p>
      </article>
    </Link>
  );
}

export function HomeProtocolInAction() {
  const passport = PROTOCOL_PASSPORT_CONNECTOR;

  return (
    <section aria-labelledby="home-protocol-in-action-heading" id="ecosystem">
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
        Abraxas in three proofs
      </div>
      <h2
        id="home-protocol-in-action-heading"
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.15rem, 3vw, 1.45rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 0.5rem",
        }}
      >
        Protocol in action
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 680,
      }}>
        Real implementations — not hypothetical examples. Each partner demonstrates a different
        capability of reusable trust infrastructure.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
        {PROTOCOL_IN_ACTION_PROOFS.map((proof) => (
          <ProofCard key={proof.id} proof={proof} />
        ))}
      </div>

      <Link
        href={passport.href}
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
      >
        <article
          style={{
            padding: "1rem 1.15rem",
            borderRadius: 12,
            background: `linear-gradient(135deg, ${ACCENT}10 0%, rgba(167,139,250,0.06) 100%)`,
            border: `1px solid ${ACCENT}33`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "1.15rem" }} aria-hidden>{passport.icon}</span>
            <h3 style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              {passport.title}
            </h3>
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-primary)", margin: "0 0 0.25rem", fontWeight: 600 }}>
            {passport.summary}
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
            {passport.demonstrates}
          </p>
        </article>
      </Link>
    </section>
  );
}
