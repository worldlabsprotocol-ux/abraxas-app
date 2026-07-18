"use client";
// FILE: components/roadmap/MainnetReadinessPanel.tsx

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  MAINNET_READINESS_MILESTONES,
  MAINNET_READINESS_HEADLINE,
  mainnetReadinessProgress,
  type MainnetMilestone,
} from "@/lib/mainnetReadiness";
import { CURRENT_STATUS_LIVE } from "@/lib/currentStatus";
import { CurrentStatusModule } from "@/components/status/CurrentStatusModule";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "var(--accent)";

export function MainnetReadinessPanel() {
  const staticProgress = mainnetReadinessProgress();
  const [milestones, setMilestones] = useState<MainnetMilestone[]>(MAINNET_READINESS_MILESTONES);
  const [done, setDone] = useState(staticProgress.done);
  const total = staticProgress.total;

  useEffect(() => {
    fetch("/api/mainnet/readiness")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.milestones)) setMilestones(data.milestones);
        if (typeof data.done === "number") setDone(data.done);
      })
      .catch(() => {
        /* static fallback */
      });
  }, []);

  return (
    <section id="mainnet-readiness" aria-labelledby="mainnet-readiness-heading">
      <div style={{ marginBottom: "1.25rem" }}>
        <CurrentStatusModule id="roadmap-status" variant="full" />
      </div>

      <div
        className="abx-glass-panel"
        style={{
          marginBottom: "1.25rem",
          padding: "clamp(1.15rem, 3vw, 1.5rem)",
          borderRadius: 18,
          border: "1px solid var(--border-strong)",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.4rem" }}>
          Full checklist · {done}/{total} gates complete
        </div>
        <h2
          id="mainnet-readiness-heading"
          style={{
            fontFamily: FONT,
            fontSize: "var(--fs-h2)",
            fontWeight: 800,
            color: "var(--text-primary)",
            margin: "0 0 1rem",
            letterSpacing: "-0.02em",
          }}
        >
          {MAINNET_READINESS_HEADLINE}
        </h2>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" }}>
          {CURRENT_STATUS_LIVE.map(item => (
            <span
              key={item.id}
              style={{
                padding: "0.35rem 0.7rem",
                borderRadius: 999,
                fontFamily: FONT,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: ACCENT,
                background: "rgba(232,197,71,0.1)",
                border: "1px solid rgba(232,197,71,0.28)",
              }}
            >
              ✓ {item.label}
            </span>
          ))}
        </div>

        <div style={{ display: "grid", gap: "0.45rem" }}>
          {milestones.map(m => (
            <Link
              key={m.id}
              href={m.href}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "0.65rem",
                padding: "0.75rem 0.85rem",
                borderRadius: 12,
                border: `1px solid ${m.done ? "rgba(232,197,71,0.35)" : "var(--border)"}`,
                background: m.done ? "rgba(232,197,71,0.06)" : "var(--surface)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span style={{ fontFamily: FONT, fontSize: "0.9rem", color: m.done ? ACCENT : "var(--text-muted)" }}>
                {m.done ? "✓" : "○"}
              </span>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {m.label}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                  {m.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
