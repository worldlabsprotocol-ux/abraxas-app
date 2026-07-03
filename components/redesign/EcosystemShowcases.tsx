"use client";
// FILE: components/redesign/EcosystemShowcases.tsx
// Proof-of-capability verticals with real imagery — not text-only cards.

import Link from "next/link";
import { motion } from "framer-motion";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const SHOWCASES = [
  {
    title: "Genesis asset pilot",
    desc: "Cielo Sunrise — $1.1M verified hospitality with stablecoin booking and live calendar.",
    href: "/apps/cielo-sunrise",
    tag: "Live",
    image: "/assets/cielo/06.jpg",
  },
  {
    title: "Music royalty audit",
    desc: "Split-sheet gaps, distribution leakage, and catalog provenance for media owners.",
    href: "/apps/music",
    tag: "Intake live",
    image: "/assets/worldwearables/1212.jpg",
  },
  {
    title: "Wyoming LLC engine",
    desc: "Corporate formation bound to on-chain asset mints and V5 pipeline.",
    href: "/apps/wyoming",
    tag: "Formation flow",
    image: "/assets/worldwearables/jan26.jpg",
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
          Production apps built on Abraxas verification — each with real intake, assets, or revenue loops.
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
            <Link href={s.href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
              <div style={{
                borderRadius: 16, overflow: "hidden", height: "100%",
                border: "1px solid var(--border-strong)",
                background: "var(--surface-raised)",
              }}>
                <div style={{ position: "relative", height: 140 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.image}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(to top, rgba(6,9,11,0.9) 0%, transparent 60%)",
                  }} />
                  <span style={{
                    position: "absolute", top: 10, right: 10,
                    fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
                    padding: "0.2rem 0.45rem", borderRadius: 999,
                    background: "rgba(0,0,0,0.55)", color: ACCENT,
                    border: "1px solid rgba(16,185,129,0.35)",
                  }}>
                    {s.tag}
                  </span>
                </div>
                <div style={{ padding: "1rem 1.1rem" }}>
                  <div style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                    {s.title}
                  </div>
                  <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
