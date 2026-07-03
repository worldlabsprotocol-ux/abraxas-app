"use client";
// FILE: components/redesign/EcosystemShowcases.tsx
// Proof-of-capability verticals — not competing homepage identities.

import Link from "next/link";
import { motion } from "framer-motion";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const SHOWCASES = [
  {
    title: "Genesis asset pilot",
    desc: "Live operational tracking of Cielo Sunrise — a $1.1M verified hospitality asset with stablecoin booking.",
    href: "/apps/cielo-sunrise",
    tag: "Live",
  },
  {
    title: "Music royalty audit",
    desc: "Provenance gaps, split-sheet tracking, and distribution leakage for media catalog owners.",
    href: "/apps/music",
    tag: "Intake live",
  },
  {
    title: "Wyoming LLC engine",
    desc: "Programmatic corporate formation bound directly to on-chain asset mints.",
    href: "/apps/wyoming",
    tag: "Formation flow",
  },
] as const;

export function EcosystemShowcases() {
  return (
    <section>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.5rem",
        }}>
          Infrastructure in action
        </div>
        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.7, maxWidth: 640, margin: 0,
        }}>
          Abraxas verification architecture powers specialized enterprise applications.
          These are production proof points — not separate product lines.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
        gap: "0.875rem",
      }}>
        {SHOWCASES.map((s, i) => (
          <motion.div
            key={s.href}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
          >
            <Link href={s.href} style={{ textDecoration: "none", display: "block" }}>
              <div style={{
                padding: "1.1rem 1.15rem", borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <div style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {s.title}
                  </div>
                  <span style={{
                    fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
                    padding: "0.2rem 0.45rem", borderRadius: 999,
                    background: "rgba(16,185,129,0.12)", color: ACCENT,
                    border: "1px solid rgba(16,185,129,0.25)", flexShrink: 0,
                  }}>
                    {s.tag}
                  </span>
                </div>
                <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
                  {s.desc}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
