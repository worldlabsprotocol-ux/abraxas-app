"use client";
// FILE: components/redesign/ThreeDoorsSection.tsx
// Core infrastructure entry points: Passport · Verify Asset · Public Verifier.

import { motion } from "framer-motion";
import Link from "next/link";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const DOORS = [
  {
    n: "01",
    title: "Abraxas Passport",
    subtitle: "Reusable identity primitives",
    body: "Mint a portable compliance container. Sign in with Google via zkLogin — no seed phrase. Verify once and reuse across Abraxas today, and integrated partners as they come online.",
    href: "/passport",
    cta: "Create reusable passport →",
  },
  {
    n: "02",
    title: "Verify an asset",
    subtitle: "Institutional compliance engine",
    body: "Streamline real estate, IP, or physical assets through the deterministic 10-stage V5 pipeline. From Wyoming LLC containers to independent title review — bind physical assets to on-chain extensions.",
    href: "/build",
    cta: "Initiate V5 pipeline →",
  },
  {
    n: "03",
    title: "Public verifier",
    subtitle: "Zero-trust immutable audit",
    body: "Open infrastructure for relying parties. Instantly authenticate the active status, assurance level, and cryptographic signatures of any Passport DID or verified asset hash.",
    href: "/verify",
    cta: "Launch public verifier →",
  },
] as const;

export function ThreeDoorsSection() {
  return (
    <section>
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.5rem",
        }}>
          Three doors
        </div>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.05,
          color: "var(--text-primary)", margin: 0, maxWidth: 560,
        }}>
          Know what&apos;s real before you trust it.
        </h2>
      </div>

      <motion.div
        variants={staggerContainer(0.08, 0.05)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "1rem",
        }}
      >
        {DOORS.map(door => (
          <motion.div key={door.n} variants={staggerItem}>
            <Link href={door.href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
              <div style={{
                height: "100%", padding: "1.35rem 1.25rem",
                borderRadius: 16, border: "1px solid var(--border-strong)",
                background: "var(--surface-raised)",
                boxShadow: "var(--shadow-card)",
                transition: "border-color 0.2s",
              }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", fontWeight: 700, color: ACCENT, marginBottom: "0.5rem" }}>
                  {door.n} // {door.title}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.65rem" }}>
                  {door.subtitle}
                </div>
                <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
                  {door.body}
                </p>
                <span style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: ACCENT }}>
                  {door.cta}
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
