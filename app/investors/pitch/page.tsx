"use client";
// FILE: app/investors/pitch/page.tsx
// Web pitch deck. 12 slides for VC meetings.

import { useState } from "react";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PITCH_DECK } from "@/lib/pitchDeck";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export default function PitchDeckPage() {
  const [idx, setIdx] = useState(0);
  const slide = PITCH_DECK[idx];
  const total = PITCH_DECK.length;

  return (
    <RedesignPage maxWidth={820}>
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.62rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Pitch deck · Slide {idx + 1} / {total}
          </div>
          <h1 style={{ fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800, margin: "0.35rem 0 0", color: "var(--text-primary)" }}>
            Abraxas Protocol
          </h1>
        </div>
        <Btn href="/investors" variant="secondary" size="sm">Data room</Btn>
      </div>

      <div style={{
        minHeight: 360, padding: "2rem 1.75rem", borderRadius: 20,
        background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
        boxShadow: "var(--shadow-glow)", marginBottom: "1.25rem",
        display: "flex", flexDirection: "column", justifyContent: "center",
      }}>
        <h2 style={{
          fontFamily: FONT, fontSize: "clamp(1.35rem, 4vw, 1.85rem)", fontWeight: 800,
          letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 1.25rem",
        }}>
          {slide.title}
        </h2>
        {slide.highlight && (
          <p style={{
            fontFamily: FONT, fontSize: "0.92rem", fontWeight: 600, color: ACCENT,
            margin: "0 0 1rem", lineHeight: 1.6,
          }}>
            {slide.highlight}
          </p>
        )}
        <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
          {slide.bullets.map(b => (
            <li key={b} style={{
              fontFamily: FONT, fontSize: "0.92rem", color: "var(--text-secondary)",
              lineHeight: 1.75, marginBottom: "0.5rem",
            }}>
              {b}
            </li>
          ))}
        </ul>
        {slide.link && (
          <Link href={slide.link.href} style={{
            marginTop: "1.25rem", fontFamily: FONT, fontSize: "0.82rem",
            fontWeight: 700, color: ACCENT, textDecoration: "none",
          }}>
            {slide.link.label} →
          </Link>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {PITCH_DECK.map((s, i) => (
          <button key={s.id} type="button" onClick={() => setIdx(i)} style={{
            width: 28, height: 6, borderRadius: 999, border: "none", cursor: "pointer",
            background: i === idx ? ACCENT : "var(--border)",
          }} aria-label={s.title} />
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        <button type="button" disabled={idx === 0} onClick={() => setIdx(i => i - 1)} style={navBtn(idx === 0)}>
          ← Previous
        </button>
        <button type="button" disabled={idx === total - 1} onClick={() => setIdx(i => i + 1)} style={navBtn(idx === total - 1)}>
          Next →
        </button>
        <Btn href="/case-studies/cielo" variant="ghost" size="sm">Cielo proof</Btn>
        <Btn href="/metrics" variant="ghost" size="sm">Live metrics</Btn>
      </div>
    </RedesignPage>
  );
}

function navBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "0.65rem 1.1rem", borderRadius: 999,
    border: "1px solid var(--border)", background: "var(--surface)",
    fontFamily: FONT, fontSize: "0.82rem", fontWeight: 600,
    color: disabled ? "var(--text-muted)" : "var(--text-primary)",
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
  };
}
