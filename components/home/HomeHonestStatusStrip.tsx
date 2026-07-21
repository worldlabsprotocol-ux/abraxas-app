"use client";
// FILE: components/home/HomeHonestStatusStrip.tsx
// Production status — elite slideshow + compact links.

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEEP_DIVE_LINKS } from "@/lib/currentStatus";
import { mainnetReadinessProgress } from "@/lib/mainnetReadiness";
import type { MainnetMilestone } from "@/lib/mainnetReadiness";
import { EliteConceptDemo } from "@/components/home/ConceptDemoVideo";
import { EliteSectionLead } from "@/components/home/elite/EliteSectionLead";
import { STATUS_ELITE_DEMO } from "@/lib/eliteDemoSlides";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function HomeHonestStatusStrip() {
  const staticProgress = mainnetReadinessProgress();
  const [done, setDone] = useState(staticProgress.done);
  const [total] = useState(staticProgress.total);

  useEffect(() => {
    fetch("/api/mainnet/readiness")
      .then(r => r.json())
      .then(data => {
        if (typeof data.done === "number") setDone(data.done);
      })
      .catch(() => {});
  }, []);

  return (
    <section
      id="current-status"
      aria-label="Current product status"
      style={{
        padding: "0 0 clamp(0.75rem, 2vw, 1.25rem)",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <EliteSectionLead eyebrow="Production" title="Live · staged rollout" />

      <EliteConceptDemo config={STATUS_ELITE_DEMO} id="production-status-demo" compact />

      <div
        className="abx-cosmic-card"
        style={{
          padding: "0.75rem 1rem",
          borderRadius: 14,
          marginTop: "0.65rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.55rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{
          fontFamily: MONO, fontSize: "0.48rem", fontWeight: 700, letterSpacing: "0.08em",
          color: "var(--cosmic-cyan, var(--accent))",
          padding: "0.2rem 0.5rem", borderRadius: 999,
          border: "1px solid var(--accent-border)", background: "var(--accent-faint)",
        }}>
          {done}/{total} MAINNET GATES
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem 0.75rem" }}>
          {DEEP_DIVE_LINKS.slice(0, 4).map(link => (
            <Link key={link.href} href={link.href} style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
              {link.label} →
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
