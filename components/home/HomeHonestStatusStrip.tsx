"use client";
// FILE: components/home/HomeHonestStatusStrip.tsx
// Founder-level status under hero — institutional gold/violet, live gate telemetry.

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  HOMEPAGE_STATUS_LEAD,
  HOMEPAGE_STATUS_ROLLOUT,
  HOMEPAGE_STATUS_PROOF,
  DEEP_DIVE_LINKS,
} from "@/lib/currentStatus";
import { mainnetReadinessProgress } from "@/lib/mainnetReadiness";
import type { MainnetMilestone } from "@/lib/mainnetReadiness";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function HomeHonestStatusStrip() {
  const staticProgress = mainnetReadinessProgress();
  const [done, setDone] = useState(staticProgress.done);
  const [total] = useState(staticProgress.total);
  const [liveGates, setLiveGates] = useState<MainnetMilestone[] | null>(null);

  useEffect(() => {
    fetch("/api/mainnet/readiness")
      .then(r => r.json())
      .then(data => {
        if (typeof data.done === "number") setDone(data.done);
        if (Array.isArray(data.milestones)) setLiveGates(data.milestones);
      })
      .catch(() => {
        /* static fallback */
      });
  }, []);

  const rpMet = liveGates?.find(m => m.id === "unaffiliated-rp")?.done;

  return (
    <section
      id="current-status"
      aria-label="Current product status"
      style={{
        padding: "0 0 clamp(0.75rem, 2vw, 1.25rem)",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <div
        className="abx-glass-panel"
        style={{
          padding: "clamp(0.9rem, 2.5vw, 1.15rem) clamp(1rem, 3vw, 1.25rem)",
          borderRadius: 16,
          border: "1px solid var(--border-strong)",
          background: "linear-gradient(155deg, rgba(232,197,71,0.08) 0%, var(--surface-raised) 100%)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.55rem" }}>
          <div className="abx-eyebrow-violet" style={{ margin: 0 }}>
            Live in production · staged mainnet rollout
          </div>
          <span style={{
            fontFamily: MONO, fontSize: "0.48rem", fontWeight: 700, letterSpacing: "0.08em",
            color: "var(--accent)", padding: "0.2rem 0.5rem", borderRadius: 999,
            border: "1px solid var(--accent-border)", background: "var(--accent-faint)",
          }}>
            {done}/{total} MAINNET GATES{rpMet ? " · RP LIVE" : ""}
          </span>
        </div>

        <p style={{
          fontFamily: FONT,
          fontSize: "clamp(0.82rem, 2vw, 0.9rem)",
          fontWeight: 600,
          color: "var(--text-primary)",
          lineHeight: 1.55,
          margin: "0 0 0.4rem",
          maxWidth: 680,
        }}>
          {HOMEPAGE_STATUS_LEAD}
        </p>
        <p style={{
          fontFamily: FONT,
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
          lineHeight: 1.65,
          margin: "0 0 0.45rem",
          maxWidth: 680,
        }}>
          {HOMEPAGE_STATUS_ROLLOUT}
        </p>
        <p style={{
          fontFamily: FONT,
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "var(--accent-pale, var(--accent))",
          margin: "0 0 0.65rem",
        }}>
          {HOMEPAGE_STATUS_PROOF}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem 0.85rem" }}>
          {DEEP_DIVE_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontFamily: FONT,
                fontSize: "0.74rem",
                fontWeight: 700,
                color: "var(--accent)",
                textDecoration: "none",
              }}
            >
              {link.label} →
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
