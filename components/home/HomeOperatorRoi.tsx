"use client";
// FILE: components/home/HomeOperatorRoi.tsx
// Operator business case — without vs with Abraxas (Monday-morning language).

import Link from "next/link";
import { OPERATOR_WITHOUT_ABRAXAS, OPERATOR_WITH_ABRAXAS } from "@/lib/reusableTrust";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";
const RED = "#F87171";

export function HomeOperatorRoi() {
  return (
    <section id="operators" aria-labelledby="operator-roi-heading" style={{
      padding: "clamp(1.25rem, 3vw, 2rem) 0",
      borderTop: "1px solid var(--border-strong)",
    }}>
      <p style={{
        fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: ACCENT, margin: "0 0 0.45rem",
      }}>
        For operators
      </p>
      <h2 id="operator-roi-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
        letterSpacing: "-0.02em", color: "var(--text-primary)",
        margin: "0 0 0.35rem", maxWidth: 560, lineHeight: 1.15,
      }}>
        What changes Monday morning?
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
        lineHeight: 1.65, maxWidth: 520, margin: "0 0 1.15rem",
      }}>
        Hotels, lenders, marketplaces, deal rooms — same pattern: stop re-asking for what you already proved.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
        gap: "1rem",
        marginBottom: "1rem",
      }}>
        <RoiColumn
          title="Without Abraxas"
          tone="muted"
          items={OPERATOR_WITHOUT_ABRAXAS}
          footer="Friction compounds with every new partner."
        />
        <RoiColumn
          title="With Abraxas"
          tone="accent"
          items={OPERATOR_WITH_ABRAXAS}
          footer="Faster approvals · fewer tickets · reusable trust."
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <Btn href="/operators" size="sm">Operator playbook →</Btn>
        <Link href="/operators#roi-calculator" style={{
          fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
          color: ACCENT, textDecoration: "none",
        }}>
          Run the ROI calculator →
        </Link>
      </div>
    </section>
  );
}

function RoiColumn({
  title,
  tone,
  items,
  footer,
}: {
  title: string;
  tone: "muted" | "accent";
  items: readonly string[];
  footer: string;
}) {
  const accent = tone === "accent";
  return (
    <div style={{
      padding: "1rem 1.1rem", borderRadius: 14,
      background: accent ? `${ACCENT}08` : "var(--surface-raised)",
      border: `1px solid ${accent ? `${ACCENT}33` : "var(--border-strong)"}`,
    }}>
      <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.65rem" }}>
        {title}
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.45rem" }}>
        {items.map(item => (
          <li key={item} style={{
            fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.55,
            color: accent ? "var(--text-primary)" : "var(--text-secondary)",
            paddingLeft: "1.1rem", position: "relative",
          }}>
            <span style={{
              position: "absolute", left: 0,
              color: accent ? ACCENT : RED, fontWeight: 800,
            }}>
              {accent ? "✓" : "·"}
            </span>
            {item}
          </li>
        ))}
      </ul>
      <p style={{
        fontFamily: FONT, fontSize: "0.68rem", fontWeight: 600,
        color: accent ? ACCENT : "var(--text-muted)",
        margin: "0.75rem 0 0", lineHeight: 1.5,
      }}>
        {footer}
      </p>
    </div>
  );
}
