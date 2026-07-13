"use client";
// FILE: components/home/HomeLiveTodayStrip.tsx
// Verifiable facts only — no invented traction.

import { partnersActiveCount } from "@/lib/partnerStatus";
import { CPG_PRICING, formatUsd } from "@/lib/cpgLandCaseStudy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const partnerCount = partnersActiveCount();

const LIVE_FACTS = [
  { label: "Registry attested scope", value: "$2.7M+ · Cielo + Grady 270" },
  { label: "Cielo Sunrise", value: "$1.1M appraised · live STR" },
  { label: "Grady County 270", value: `${formatUsd(CPG_PRICING.fullProject)} · land listing` },
  { label: "Active partners", value: `${partnerCount} onboarded` },
] as const;

export function HomeLiveTodayStrip() {
  return (
    <section aria-label="What is live today" style={{
      margin: "0 0 clamp(1.25rem, 3vw, 2rem)",
      padding: "0.85rem 1rem",
      borderRadius: 14,
      border: "1px solid var(--border-strong)",
      background: "var(--surface-raised)",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.65rem",
      }}>
        What&apos;s live today
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "0.65rem",
      }}>
        {LIVE_FACTS.map(f => (
          <div key={f.label}>
            <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", marginBottom: 2 }}>
              {f.label}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.35 }}>
              {f.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
