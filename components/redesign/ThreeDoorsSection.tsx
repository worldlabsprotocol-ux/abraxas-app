"use client";
// FILE: components/redesign/ThreeDoorsSection.tsx
// Passport + public checker — text-first cards, no hero photos.

import { motion } from "framer-motion";
import Link from "next/link";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const DOORS = [
  {
    n: "01",
    title: "Your Passport",
    subtitle: "Sign in once · verify when needed",
    body: "Sign in with Google — no seed phrase. Add an ID check only when a deal requires it. Partners verify without seeing your documents.",
    href: "/passport",
    cta: "Create my passport →",
    accent: ACCENT,
  },
  {
    n: "02",
    title: "Check what's real",
    subtitle: "Public proof checker",
    body: "Paste any asset ID or credential hash. See if it is valid, expired, or revoked with assurance levels L1 to L4.",
    href: "/verify",
    cta: "Run public checker →",
    accent: "#3B82F6",
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
          Two things we do
        </div>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.05,
          color: "var(--text-primary)", margin: "0 0 0.5rem", maxWidth: 560,
        }}>
          Know what&apos;s real before you trust it.
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.65, margin: 0, maxWidth: 620,
        }}>
          Verified assets are listed in the registry below. Want to submit your own?{" "}
          <Link href="/build" style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>
            Submit here →
          </Link>
        </p>
      </div>

      <motion.div
        variants={staggerContainer(0.08, 0.05)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: "1rem",
        }}
      >
        {DOORS.map(door => (
          <motion.div key={door.n} variants={staggerItem}>
            <Link href={door.href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
              <div style={{
                height: "100%", borderRadius: 16, overflow: "hidden",
                border: "1px solid var(--border-strong)",
                background: "var(--surface-raised)",
              }}>
                <div style={{
                  position: "relative", height: 72, padding: "0 1.2rem",
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  background: `linear-gradient(135deg, ${door.accent}18 0%, transparent 70%)`,
                  borderBottom: "1px solid var(--border)",
                }}>
                  <span style={{
                    fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: door.accent,
                    width: 32, height: 32, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: `${door.accent}15`, border: `1px solid ${door.accent}44`,
                  }}>
                    {door.n}
                  </span>
                  <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {door.subtitle}
                  </div>
                </div>
                <div style={{ padding: "1.15rem 1.2rem" }}>
                  <div style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                    {door.title}
                  </div>
                  <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
                    {door.body}
                  </p>
                  <span style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: ACCENT }}>
                    {door.cta}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
