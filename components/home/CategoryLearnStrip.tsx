"use client";
// FILE: components/home/CategoryLearnStrip.tsx

import Link from "next/link";
import { CATEGORY_POSITIONING } from "@/lib/categoryInfrastructure";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

const LINKS = [
  { label: "Trust infrastructure", href: "/learn/trust-infrastructure" },
  { label: "Why tokenization isn't enough", href: "/learn/why-tokenization-isnt-enough" },
  { label: "Solutions", href: "/solutions" },
  { label: "For builders", href: "/developers" },
];

export function CategoryLearnStrip() {
  return (
    <section aria-label="Trust infrastructure" style={{ padding: "0 0 0.75rem" }}>
      <div style={{
        padding: "0.85rem 1rem",
        borderRadius: 14,
        border: "1px solid var(--border-strong)",
        background: "var(--surface-raised)",
      }}>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.35rem" }}>
          {CATEGORY_POSITIONING.category}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 0.55rem" }}>
          {CATEGORY_POSITIONING.aeoDefinition.slice(0, 120)}…
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 0.75rem" }}>
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "#10B981", textDecoration: "none" }}>
              {l.label} →
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
