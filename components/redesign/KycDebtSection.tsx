"use client";
// FILE: components/redesign/KycDebtSection.tsx

import Link from "next/link";
import { KYC_DEBT_HEADLINE, KYC_BARRIERS, ABRAXAS_SOLUTION_STEPS } from "@/lib/kycThesis";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function KycDebtSection() {
  return (
    <section aria-labelledby="kyc-debt-heading">
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.5rem",
        }}>
          The problem
        </div>
        <h2 id="kyc-debt-heading" style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.08,
          color: "var(--text-primary)", margin: "0 0 0.75rem", maxWidth: 720,
        }}>
          {KYC_DEBT_HEADLINE}
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.7, maxWidth: 640, margin: 0,
        }}>
          Every RWA platform re-runs the same checks. Abraxas issues portable proof once — partners verify cryptographically, not by re-collecting documents.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "0.75rem",
        marginBottom: "1.5rem",
      }}>
        {KYC_BARRIERS.map(b => (
          <div key={b.title} style={{
            padding: "1rem", borderRadius: 14,
            background: "var(--surface)", border: "1px solid var(--border)",
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
        marginBottom: "1rem",
      }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.85rem",
        }}>
          How Abraxas solves it
        </div>
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/docs/why-verification" size="sm">Full technical explanation →</Btn>
        <Btn href="/docs/chain" variant="ghost" size="sm">Hybrid architecture</Btn>
        <Link href="/docs/credential-portability" style={{
          fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, alignSelf: "center",
          textDecoration: "none", fontWeight: 600,
        }}>
          Integrator API →
        </Link>
      </div>
    </section>
  );
}
