"use client";
// FILE: components/passport/PassportTierCapabilities.tsx
// Locked/unlocked capability list per passport tier.

import {
  resolvePassportTier,
  tierCapabilities,
  TIER_DESCRIPTIONS,
  TIER_LABELS,
  type PassportTierInput,
} from "@/lib/passport/passportTiers";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const MUTED = "var(--text-muted)";

export function PassportTierCapabilities({ input }: { input: PassportTierInput }) {
  const tier = resolvePassportTier(input);
  const caps = tierCapabilities(input);

  return (
    <div style={{
      marginTop: "1.25rem",
      paddingTop: "1.25rem",
      borderTop: "1px solid var(--border)",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: MUTED, marginBottom: "0.45rem",
      }}>
        Passport tier · {TIER_LABELS[tier]}
      </div>
      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)",
        lineHeight: 1.6, margin: "0 0 0.75rem",
      }}>
        {TIER_DESCRIPTIONS[tier]}
      </p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.4rem" }}>
        {caps.map(cap => (
          <li key={cap.label} style={{
            display: "flex", alignItems: "flex-start", gap: "0.5rem",
            fontFamily: FONT, fontSize: "0.72rem", lineHeight: 1.55,
            color: cap.unlocked ? "var(--text-primary)" : "var(--text-muted)",
          }}>
            <span style={{ flexShrink: 0, fontWeight: 800, color: cap.unlocked ? ACCENT : MUTED }}>
              {cap.unlocked ? "✓" : "○"}
            </span>
            <span>
              {cap.label}
              {!cap.unlocked && (
                <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: MUTED, marginLeft: 6 }}>
                  · Tier {cap.tierRequired}+
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
