"use client";
// FILE: components/home/HomeHonestStatusStrip.tsx
// Founder-level status under hero — honest, confident, not defensive.

import Link from "next/link";
import {
  HOMEPAGE_STATUS_LEAD,
  HOMEPAGE_STATUS_ROLLOUT,
  HOMEPAGE_STATUS_PROOF,
  DEEP_DIVE_LINKS,
} from "@/lib/currentStatus";
import { mainnetReadinessProgress } from "@/lib/mainnetReadiness";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function HomeHonestStatusStrip() {
  const { done, total } = mainnetReadinessProgress();

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
          border: "1px solid rgba(16,185,129,0.22)",
          background: "linear-gradient(155deg, rgba(16,185,129,0.06) 0%, var(--surface-raised) 100%)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.55rem" }}>
          <div className="abx-eyebrow-violet" style={{ margin: 0 }}>
            Live in production · staged mainnet rollout
          </div>
          <span style={{
            fontFamily: MONO, fontSize: "0.48rem", fontWeight: 700, letterSpacing: "0.08em",
            color: "#10B981", padding: "0.2rem 0.5rem", borderRadius: 999,
            border: "1px solid rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.08)",
          }}>
            {done}/{total} MAINNET GATES
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
          color: "#10B981",
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
