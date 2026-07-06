"use client";
// FILE: components/redesign/EcosystemShowcases.tsx

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
    image: "/assets/worldwearables/1212.jpg",
  },
  {
    title: "Wyoming LLC engine",
    desc: "Entity formation bound to verified ownership and the asset pipeline.",
    href: "/apps/wyoming",
    tag: "Formation flow",
    image: "/assets/worldwearables/jan26.jpg",
  },
  {
    title: "Genesis hospitality pilot",
    desc: "End-to-end verified stay with Apple Pay booking — one design-partner asset.",
    href: "/flagship",
    tag: "Live pilot",
    image: "/assets/cielo/08.jpg",
    objectPosition: "center 35%",
  },
] as const;

export function EcosystemShowcases() {
  return (
    <section style={{ paddingTop: "0.5rem" }}>
      <div style={{ marginBottom: "1.25rem" }}>
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
        gap: "1rem",
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
                <div style={{ position: "relative", height: 148, background: "#06090B" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.image}
                    alt=""
                    style={{
                      width: "100%", height: "100%", objectFit: "cover", display: "block",
                      objectPosition: "objectPosition" in s ? s.objectPosition : "center",
                    }}
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
                <div style={{ padding: "1.05rem 1.15rem" }}>
                  <div style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                    {s.title}
                  </div>
                  <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.65, margin: 0 }}>
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
