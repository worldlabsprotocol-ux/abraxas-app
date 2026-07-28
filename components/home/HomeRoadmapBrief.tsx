"use client";
// FILE: components/home/HomeRoadmapBrief.tsx
// Roadmap entry point on the homepage.

import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

const HIGHLIGHTS = [
  { label: "Live", detail: "zkLogin Passport, Abraxas Verify, credential issuance, admin review" },
  { label: "In progress", detail: "Mainnet deployment, expanded relying partners" },
] as const;

export function HomeRoadmapBrief() {
  return (
    <section aria-labelledby="home-roadmap-heading" id="roadmap">
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
        Roadmap
      </div>
      <h2 id="home-roadmap-heading" style={{
        fontFamily: FONT, fontSize: "clamp(1.15rem, 3vw, 1.45rem)", fontWeight: 800,
        letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 0.75rem",
      }}>
        What&apos;s live and what&apos;s next
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1rem" }}>
        {HIGHLIGHTS.map((item) => (
          <div
            key={item.label}
            style={{
              padding: "0.85rem 1rem", borderRadius: 12,
              background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: "var(--accent)", marginBottom: 4 }}>
              {item.label}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
              {item.detail}
            </p>
          </div>
        ))}
      </div>
      <Btn href="/roadmap" variant="secondary" size="sm">View full roadmap</Btn>
    </section>
  );
}
