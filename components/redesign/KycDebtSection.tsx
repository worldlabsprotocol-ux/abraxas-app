"use client";
// FILE: components/redesign/KycDebtSection.tsx
// Homepage opener: plain language → problem → how Abraxas solves it.

import Link from "next/link";
import {
  PLAIN_LANGUAGE_OPENER,
  KYC_DEBT_HEADLINE,
  KYC_BARRIERS,
  ABRAXAS_SOLUTION_STEPS,
} from "@/lib/kycThesis";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function KycDebtSection() {
  return (
    <section id="problem" aria-labelledby="kyc-debt-heading" style={{
      paddingTop: "clamp(1.5rem, 4vw, 2.5rem)",
      paddingBottom: "0.5rem",
    }}>
      <div style={{
        padding: "1.1rem 1.25rem", borderRadius: 16, marginBottom: "1.75rem",
        background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.28)",
      }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.45rem",
        }}>
          What Abraxas is
        </div>
        <p style={{
          fontFamily: FONT, fontSize: "clamp(0.95rem, 2vw, 1.05rem)", fontWeight: 600,
          color: "var(--text-primary)", lineHeight: 1.65, margin: 0, maxWidth: 720,
        }}>
          {PLAIN_LANGUAGE_OPENER}
        </p>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.5rem",
        }}>
          The problem
        </div>
        <h1 id="kyc-debt-heading" style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.08,
          color: "var(--text-primary)", margin: "0 0 0.75rem", maxWidth: 720,
        }}>
          {KYC_DEBT_HEADLINE}
        </h1>
        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.7, maxWidth: 640, margin: 0,
        }}>
          Every marketplace, lender, and protocol re-runs the same identity and asset checks.
          That slows deals, leaks data, and blocks portable trust.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "0.75rem",
        marginBottom: "1.75rem",
      }}>
        {KYC_BARRIERS.slice(0, 4).map(b => (
          <div key={b.title} style={{
            padding: "1rem", borderRadius: 14,
            background: "var(--surface-inset)", border: "1px solid var(--border)",
          }}>
            <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
              {b.title}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {b.body}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: "1.25rem", borderRadius: 18,
        background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
        marginBottom: "1.25rem",
      }} id="solution">
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.35rem",
        }}>
          How Abraxas solves it
        </div>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
          letterSpacing: "-0.02em", color: "var(--text-primary)",
          margin: "0 0 0.85rem", maxWidth: 560,
        }}>
          Verify once. Transact everywhere.
        </h2>
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {ABRAXAS_SOLUTION_STEPS.map(s => (
            <div key={s.step} style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.75rem",
              alignItems: "start",
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", background: `${ACCENT}18`,
                border: `1px solid ${ACCENT}44`, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FONT, fontSize: "0.68rem", fontWeight: 800, color: ACCENT, flexShrink: 0,
              }}>
                {s.step}
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>
                  {s.title}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {s.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "0.5rem" }}>
        <Btn href="/passport" size="lg">Create my Passport →</Btn>
        <Btn href="/verify" variant="secondary" size="lg">Test verification</Btn>
        <Btn href="#registry" variant="tertiary" size="lg">Browse registry</Btn>
      </div>
      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
        margin: "0 0 1rem", maxWidth: 520, lineHeight: 1.55,
      }}>
        Sign in with Google · no seed phrase · ID check only when a partner policy requires it
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/docs/why-verification" size="sm" variant="ghost">Technical deep dive →</Btn>
        <Link href="/integrations" style={{
          fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, alignSelf: "center",
          textDecoration: "none", fontWeight: 600,
        }}>
          Partner integrations →
        </Link>
      </div>
    </section>
  );
}
