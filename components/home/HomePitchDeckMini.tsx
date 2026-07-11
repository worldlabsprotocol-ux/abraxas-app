"use client";
// FILE: components/home/HomePitchDeckMini.tsx
// Compact pitch deck beside homepage hero — same footprint as mobile deck view.

import { useState } from "react";
import Link from "next/link";
import { PITCH_DECK } from "@/lib/pitchDeck";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomePitchDeckMini() {
  const [idx, setIdx] = useState(0);
  const slide = PITCH_DECK[idx];
  const total = PITCH_DECK.length;

  return (
    <aside
      aria-label="Abraxas story deck"
      style={{
        width: "100%",
        maxWidth: 360,
        justifySelf: "end",
      }}
    >
      <div style={{
        fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.45rem",
      }}>
        The story · {idx + 1}/{total}
      </div>

      <div style={{
        minHeight: 220,
        padding: "1.1rem 1.15rem",
        borderRadius: 16,
        background: "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}>
        <h2 style={{
          fontFamily: FONT,
          fontSize: "clamp(0.95rem, 2.2vw, 1.12rem)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
          margin: "0 0 0.65rem",
          lineHeight: 1.2,
        }}>
          {slide.title}
        </h2>

        {slide.highlight && (
          <p style={{
            fontFamily: FONT,
            fontSize: "0.72rem",
            fontWeight: 600,
            color: ACCENT,
            margin: "0 0 0.55rem",
            lineHeight: 1.55,
          }}>
            {slide.highlight}
          </p>
        )}

        <ul style={{ margin: 0, paddingLeft: "1rem" }}>
          {slide.bullets.map(b => (
            <li key={b} style={{
              fontFamily: FONT,
              fontSize: "0.72rem",
              color: "var(--text-secondary)",
              lineHeight: 1.55,
              marginBottom: "0.35rem",
            }}>
              {b}
            </li>
          ))}
        </ul>

        {slide.link && (
          <Link href={slide.link.href} style={{
            marginTop: "0.65rem",
            fontFamily: FONT,
            fontSize: "0.68rem",
            fontWeight: 700,
            color: ACCENT,
            textDecoration: "none",
          }}>
            {slide.link.label} →
          </Link>
        )}
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.5rem",
        marginTop: "0.55rem",
      }}>
        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
          {PITCH_DECK.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={s.title}
              style={{
                width: i === idx ? 18 : 8,
                height: 6,
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                background: i === idx ? ACCENT : "var(--border)",
                transition: "width 0.2s ease",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <button
            type="button"
            disabled={idx === 0}
            onClick={() => setIdx(i => i - 1)}
            aria-label="Previous slide"
            style={navBtn(idx === 0)}
          >
            ←
          </button>
          <button
            type="button"
            disabled={idx === total - 1}
            onClick={() => setIdx(i => i + 1)}
            aria-label="Next slide"
            style={navBtn(idx === total - 1)}
          >
            →
          </button>
        </div>
      </div>
    </aside>
  );
}

function navBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    fontFamily: FONT,
    fontSize: "0.82rem",
    fontWeight: 600,
    color: disabled ? "var(--text-muted)" : "var(--text-primary)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
  };
}
