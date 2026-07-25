"use client";
// FILE: components/blog/RwaThesisFigures.tsx
// Figure blocks for the RWA tokenization thesis — stats, steps, questions, live proof.

import Link from "next/link";
import { COSMIC_PALETTE } from "@/lib/demoDesignSystem";
import {
  RWA_INSTITUTION_QUESTIONS,
  RWA_THESIS_MARKET_STATS,
  RWA_TOKENIZATION_STEPS,
} from "@/lib/rwaTokenizationThesis";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function ThesisMarketStatsFigure() {
  return (
    <figure style={{ margin: "1.75rem 0" }}>
      <figcaption style={{
        fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: COSMIC_PALETTE.gold, marginBottom: "0.65rem",
      }}>
        Market context
      </figcaption>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        {RWA_THESIS_MARKET_STATS.map(s => (
          <div key={s.label} className="abx-cosmic-card" style={{ padding: "14px 12px", borderRadius: 14, textAlign: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: COSMIC_PALETTE.textMuted, letterSpacing: "0.08em" }}>{s.label}</div>
            <div style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 900, color: COSMIC_PALETTE.gold, margin: "4px 0" }}>{s.value}</div>
            <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: COSMIC_PALETTE.textMuted }}>{s.detail}</div>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function ThesisStepsFigure() {
  return (
    <figure style={{ margin: "1.75rem 0" }}>
      <figcaption style={{
        fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: COSMIC_PALETTE.gold, marginBottom: "0.65rem",
      }}>
        Institutional steps
      </figcaption>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
        {RWA_TOKENIZATION_STEPS.map(s => (
          <div key={s.step} style={{ padding: "10px 8px", borderRadius: 12, border: `1px solid ${COSMIC_PALETTE.gold}33`, background: "rgba(0,0,0,0.25)" }}>
            <div style={{ fontFamily: MONO, fontSize: "0.52rem", fontWeight: 800, color: COSMIC_PALETTE.gold }}>{s.step}</div>
            <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 4, lineHeight: 1.25 }}>{s.title}</div>
            <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.45 }}>{s.body}</div>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function ThesisQuestionsFigure() {
  return (
    <figure style={{ margin: "1.75rem 0" }}>
      <figcaption style={{
        fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: COSMIC_PALETTE.rose, marginBottom: "0.65rem",
      }}>
        Diligence every counterparty still asks
      </figcaption>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {RWA_INSTITUTION_QUESTIONS.map(q => (
          <div key={q} style={{
            fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
            padding: "10px 14px", borderRadius: 10, borderLeft: `3px solid ${COSMIC_PALETTE.rose}`, background: "rgba(244,114,182,0.06)",
          }}>
            {q}
          </div>
        ))}
      </div>
    </figure>
  );
}

export function ThesisLiveProofFigure() {
  return (
    <figure style={{ margin: "1.75rem 0" }}>
      <figcaption style={{
        fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: COSMIC_PALETTE.emerald, marginBottom: "0.65rem",
      }}>
        Live on Abraxas
      </figcaption>
      <div className="abx-cosmic-card" style={{
        padding: "1.1rem 1.25rem", borderRadius: 16,
        border: `1px solid ${COSMIC_PALETTE.emerald}44`, background: `linear-gradient(135deg, ${COSMIC_PALETTE.emerald}10, transparent)`,
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {[
            { name: "Cielo Sunrise", desc: "Hotel · appraised · live bookings", href: "/flagship" },
            { name: "Chickasaw", desc: "270 acre land · verified records", href: "/verify" },
          ].map(r => (
            <Link key={r.name} href={r.href} style={{
              flex: "1 1 180px", padding: "12px 14px", borderRadius: 12,
              border: `1px solid ${COSMIC_PALETTE.emerald}44`, background: "rgba(0,0,0,0.3)", textDecoration: "none",
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>{r.name}</div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 4 }}>{r.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </figure>
  );
}
