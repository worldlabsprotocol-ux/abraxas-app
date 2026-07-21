"use client";
// FILE: components/mainnet/MainnetScoreboard.tsx
// Public mainnet gate tracker — compact teaser or full scoreboard.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { COSMIC_PALETTE, DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";
import {
  MAINNET_READINESS_HEADLINE,
  MAINNET_READINESS_SUBHEAD,
  MAINNET_READINESS_MILESTONES,
  mainnetReadinessProgress,
  type MainnetMilestone,
} from "@/lib/mainnetReadiness";
import type { E2eVerificationCheckResult } from "@/lib/authenticationProof/runE2eVerificationCheck";
import type { VerificationLayerStatus } from "@/lib/authenticationProof/verificationLayerStatus";

const FONT = DEMO_TYPOGRAPHY.fontSans;
const MONO = DEMO_TYPOGRAPHY.fontMono;

const STATUS_COLOR: Record<string, string> = {
  live: COSMIC_PALETTE.emerald,
  partial: COSMIC_PALETTE.gold,
  not_configured: COSMIC_PALETTE.rose,
};

type Variant = "compact" | "full";

export function MainnetScoreboard({ variant = "full" }: { variant?: Variant }) {
  const staticProgress = mainnetReadinessProgress();
  const [milestones, setMilestones] = useState<MainnetMilestone[]>(MAINNET_READINESS_MILESTONES);
  const [done, setDone] = useState(staticProgress.done);
  const [total] = useState(staticProgress.total);
  const [e2e, setE2e] = useState<E2eVerificationCheckResult | null>(null);
  const [verificationLayer, setVerificationLayer] = useState<VerificationLayerStatus | null>(null);

  useEffect(() => {
    fetch("/api/mainnet/readiness")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.milestones)) setMilestones(data.milestones);
        if (typeof data.done === "number") setDone(data.done);
        if (data.telemetry?.authenticationProof?.verificationLayer) {
          setVerificationLayer(data.telemetry.authenticationProof.verificationLayer);
        }
      })
      .catch(() => {});

    if (variant === "full") {
      fetch("/api/verify/e2e")
        .then((r) => r.json())
        .then((data) => setE2e(data as E2eVerificationCheckResult))
        .catch(() => {});
    }
  }, [variant]);

  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const openGates = milestones.filter((m) => !m.done);
  const nextGate = openGates[0];

  if (variant === "compact") {
    return (
      <section
        id="mainnet-readiness"
        aria-labelledby="mainnet-teaser-heading"
        className="abx-home-section"
        style={{ paddingTop: 0, paddingBottom: "clamp(1.5rem, 4vw, 2rem)" }}
      >
        <Link
          href="/mainnet"
          style={{
            display: "block",
            textDecoration: "none",
            color: "inherit",
            borderRadius: 18,
            border: `1px solid ${COSMIC_PALETTE.gold}33`,
            background: `${COSMIC_PALETTE.gold}08`,
            padding: "1rem 1.15rem",
            transition: "border-color 0.2s",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="abx-eyebrow-violet" style={{ marginBottom: 6 }}>
                Mainnet readiness
              </div>
              <h2
                id="mainnet-teaser-heading"
                style={{
                  fontFamily: FONT,
                  fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  margin: "0 0 6px",
                }}
              >
                {done}/{total} gates complete · {percent}%
              </h2>
              {nextGate && (
                <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                  Next: {nextGate.label}
                </p>
              )}
            </div>
            <div style={{ flexShrink: 0 }}>
              <div style={{ height: 6, width: 140, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 8 }}>
                <div
                  style={{
                    width: `${percent}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${COSMIC_PALETTE.gold}, ${COSMIC_PALETTE.violet})`,
                  }}
                />
              </div>
              <span style={{ fontFamily: MONO, fontSize: "0.68rem", fontWeight: 700, color: COSMIC_PALETTE.gold }}>
                View scoreboard →
              </span>
            </div>
          </div>
        </Link>
      </section>
    );
  }

  return (
    <div
      className="abx-cosmic-card"
      style={{
        padding: "clamp(1.1rem, 2.5vw, 1.5rem)",
        borderRadius: 20,
      }}
    >
      <div style={{ marginBottom: "clamp(1rem, 2.5vw, 1.25rem)" }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.45rem" }}>
          Mainnet push · verification E2E
        </div>
        <h2
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.25rem, 3.2vw, 1.65rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: "var(--text-primary)",
            margin: "0 0 0.5rem",
            lineHeight: 1.15,
          }}
        >
          {MAINNET_READINESS_HEADLINE}
        </h2>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.86rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            maxWidth: 640,
            margin: 0,
          }}
        >
          {MAINNET_READINESS_SUBHEAD}
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: "0.72rem",
            fontWeight: 800,
            letterSpacing: "0.1em",
            color: COSMIC_PALETTE.gold,
            padding: "6px 14px",
            borderRadius: 999,
            border: `1px solid ${COSMIC_PALETTE.gold}44`,
            background: `${COSMIC_PALETTE.gold}12`,
          }}
        >
          {done}/{total} MAINNET GATES
        </span>
        <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: COSMIC_PALETTE.textMuted }}>
          {percent}% toward full mainnet
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 20 }}>
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${COSMIC_PALETTE.gold}, ${COSMIC_PALETTE.violet})`,
            transition: "width 0.5s ease",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "1.25rem",
        }}
      >
        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.1em", color: COSMIC_PALETTE.textMuted, marginBottom: 10 }}>
            SEVEN GATES
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {milestones.map((m, i) => (
              <Link
                key={m.id}
                href={m.href}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: `1px solid ${m.done ? `${COSMIC_PALETTE.emerald}44` : "var(--border-strong)"}`,
                  background: m.done ? `${COSMIC_PALETTE.emerald}08` : "rgba(0,0,0,0.2)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <span style={{ color: m.done ? COSMIC_PALETTE.emerald : COSMIC_PALETTE.textMuted, fontWeight: 800 }}>
                  {m.done ? "✓" : "○"}
                </span>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.25 }}>
                    {m.label}
                  </div>
                  {!m.done && (
                    <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.45 }}>
                      {m.description}
                    </div>
                  )}
                </div>
                <span style={{ fontFamily: MONO, fontSize: "0.55rem", color: COSMIC_PALETTE.textMuted, alignSelf: "center" }}>
                  {i + 1}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.1em", color: COSMIC_PALETTE.textMuted, marginBottom: 10 }}>
            VERIFICATION E2E PATH
          </div>
          {e2e && (
            <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0 0 10px", lineHeight: 1.5 }}>
              {e2e.summary}
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {(e2e?.steps ?? []).map((step) => (
              <div
                key={step.id}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: `1px solid ${step.passed ? `${COSMIC_PALETTE.emerald}33` : `${COSMIC_PALETTE.rose}33`}`,
                  background: "rgba(0,0,0,0.2)",
                }}
              >
                <span style={{ color: step.passed ? COSMIC_PALETTE.emerald : COSMIC_PALETTE.rose, fontWeight: 800, flexShrink: 0 }}>
                  {step.passed ? "✓" : "○"}
                </span>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)" }}>{step.label}</div>
                  <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: COSMIC_PALETTE.textMuted, marginTop: 2 }}>{step.detail}</div>
                </div>
              </div>
            ))}
          </div>
          {verificationLayer && (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <div style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.1em", color: COSMIC_PALETTE.textMuted }}>
                  VERIFICATION LAYER ({verificationLayer.items.filter((i) => i.status === "live").length}/{verificationLayer.items.length} live)
                </div>
                <Link href="/verification" style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
                  Full scoreboard →
                </Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {verificationLayer.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      fontFamily: FONT,
                      fontSize: "0.68rem",
                      color: STATUS_COLOR[item.status] ?? COSMIC_PALETTE.textMuted,
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${STATUS_COLOR[item.status] ?? COSMIC_PALETTE.textMuted}33`,
                      background: "rgba(0,0,0,0.15)",
                    }}
                  >
                    <span style={{ fontWeight: 800 }}>{item.status === "live" ? "●" : "○"} </span>
                    {item.label}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {nextGate && (
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            borderRadius: 12,
            border: `1px solid ${COSMIC_PALETTE.gold}33`,
            background: `${COSMIC_PALETTE.gold}08`,
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.08em", color: COSMIC_PALETTE.gold, marginBottom: 6 }}>
            NEXT TO UNLOCK MAINNET
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {nextGate.label}
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
            {nextGate.description}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-strong)" }}>
        <Btn href="/roadmap#mainnet-readiness" size="sm">
          Full roadmap →
        </Btn>
        <Btn href="/api/verify/e2e" variant="secondary" size="sm">
          E2E check (JSON) →
        </Btn>
        <Btn href="/integrate" variant="ghost" size="sm">
          Integrate →
        </Btn>
        <Link href="/verify" style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", alignSelf: "center", textDecoration: "none" }}>
          Verify records →
        </Link>
      </div>
    </div>
  );
}
