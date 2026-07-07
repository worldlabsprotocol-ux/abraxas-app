"use client";
// FILE: components/redesign/EcosystemShowcases.tsx
// Text-first vertical showcases — no photo headers.

import Link from "next/link";
import { motion } from "framer-motion";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const SHOWCASES = [
  {
    title: "Music royalty audit",
    desc: "Split-sheet gaps, distribution leakage, and catalog provenance for media owners.",
    href: "/apps/music",
    tag: "Intake live",
    accent: "#8B5CF6",
  },
  {
    title: "Wyoming LLC engine",
    desc: "Entity formation bound to verified ownership and the asset pipeline.",
    href: "/apps/wyoming",
    tag: "Formation flow",
    accent: "#3B82F6",
  },
  {
    title: "Genesis hospitality pilot",
    desc: "End-to-end verified stay with Apple Pay booking — one design-partner asset.",
    href: "/flagship",
    tag: "Live pilot",
    accent: ACCENT,
  },
] as const;

export function EcosystemShowcases() {
  return (
    <section style={{ paddingTop: "0.75rem" }}>
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.5rem",
        }}>
          Infrastructure in action
        </div>
        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.75, maxWidth: 640, margin: 0,
        }}>
          Vertical apps built on Abraxas verification — each with real intake, assets, or revenue loops.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
        gap: "0.85rem",
      }}>
        {SHOWCASES.map((s, i) => (
          <motion.div
            key={s.href}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
          >
            <Link href={s.href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
              <div style={{
                borderRadius: 14, padding: "1.05rem 1.15rem", height: "100%",
                border: "1px solid var(--border-strong)",
                background: "var(--surface-raised)",
                borderTop: `3px solid ${s.accent}`,
              }}>
                <span style={{
                  fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
                  padding: "0.2rem 0.45rem", borderRadius: 999,
                  color: s.accent, border: `1px solid ${s.accent}44`,
                  background: `${s.accent}12`, display: "inline-block", marginBottom: "0.65rem",
                }}>
                  {s.tag}
                </span>
                <div style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                  {s.title}
                </div>
                <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.65, margin: 0 }}>
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
