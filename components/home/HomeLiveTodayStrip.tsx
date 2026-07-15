"use client";
// FILE: components/home/HomeLiveTodayStrip.tsx
// Verifiable facts only — no invented traction.

import { partnersActiveCount } from "@/lib/partnerStatus";
import { CPG_ASSET, CPG_PRICING, formatUsd } from "@/lib/cpgLandCaseStudy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function HomeLiveTodayStrip() {
  const partnerCount = partnersActiveCount();

  const liveFacts = [
    { label: "Registry attested scope", value: `$2.7M+ · Cielo + ${CPG_ASSET.name}`, accent: "var(--accent)" },
    { label: "Cielo Sunrise", value: "$1.1M appraised · live STR", accent: "var(--accent-2)" },
    { label: CPG_ASSET.name, value: `${formatUsd(CPG_PRICING.fullProject)} · land listing`, accent: "var(--accent)" },
    { label: "Active partners", value: `${partnerCount} onboarded`, accent: "var(--accent-2)" },
  ];

  return (
    <section aria-label="What is live today" className="abx-glass-panel" style={{
      margin: "0 0 clamp(1.25rem, 3vw, 2rem)",
      padding: "0.85rem 1rem",
      borderRadius: 14,
    }}>
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.65rem" }}>
        What&apos;s live today
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "0.65rem",
      }}>
        {liveFacts.map(f => (
          <div key={f.label}>
            <div style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-secondary)", marginBottom: 2 }}>
              {f.label}
            </div>
            <div style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
              color: f.accent, lineHeight: 1.35,
            }}>
              {f.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
