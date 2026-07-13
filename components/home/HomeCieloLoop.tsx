"use client";
// FILE: components/home/HomeCieloLoop.tsx
// Compact proof card — detail lives on case study page.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function HomeCieloLoop() {
  return (
    <section style={{
      padding: "clamp(1.5rem, 4vw, 2rem) 0",
      borderTop: "1px solid var(--border-strong)",
    }} aria-labelledby="cielo-loop-heading">
      <div style={{
        padding: "1.15rem 1.25rem", borderRadius: 16,
        background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
        display: "grid", gap: "0.75rem",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "center",
      }}>
        <div>
          <h2 id="cielo-loop-heading" style={{
            fontFamily: FONT, fontSize: "1rem", fontWeight: 800,
            letterSpacing: "-0.02em", color: "var(--text-primary)",
            margin: "0 0 0.35rem",
          }}>
            Live proof: Cielo verified rate
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
            lineHeight: 1.6, margin: 0, maxWidth: 520,
          }}>
            A real hospitality asset with Passport, wallet, consent, and a verified guest rate — the first end-to-end loop.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "flex-start" }}>
          <Btn href="/cielo/verified-rate" size="sm">Try it →</Btn>
          <Link href="/case-studies/cielo" style={{
            fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textDecoration: "none",
          }}>
            See how it works →
          </Link>
        </div>
      </div>
    </section>
  );
}
