"use client";
// FILE: components/redesign/ThreeDoorsSection.tsx
// Simplified: Passport + public checker. Assets live on Home via photos.

import { motion } from "framer-motion";
import Link from "next/link";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";

import { CIELO_PORCH_IMAGE } from "@/lib/data/cieloMedia";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const DOORS = [
  {
    n: "01",
    title: "Your Passport",
    subtitle: "Sign in once · verify when needed",
    body: "Google sign-in creates your wallet (zkLogin). Add an optional ID check when a deal requires it. Your proof is reusable — partners check it without seeing your documents.",
    href: "/passport",
    cta: "Create my passport →",
    image: CIELO_PORCH_IMAGE.src,
  },
  {
    n: "02",
    title: "Check what's real",
    subtitle: "Public proof checker",
    body: "Paste any asset ID or credential hash. See if it's valid, expired, or revoked — with assurance levels L1–L4. Built for lenders, buyers, and anyone who needs to trust a claim.",
    href: "/verify",
    cta: "Run public checker →",
    image: "/assets/smyrna/011.webp",
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
          Verified properties and assets are on this page below — click any photo to explore.
          Want to submit your own asset?{" "}
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
                <div style={{ position: "relative", height: 140 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={door.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,9,11,0.7) 0%, transparent 60%)" }} />
                  <span style={{
                    position: "absolute", top: 12, left: 12,
                    fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: "#fff",
                    padding: "0.2rem 0.45rem", borderRadius: 999,
                    background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)",
                  }}>
                    {door.n}
                  </span>
                </div>
                <div style={{ padding: "1.15rem 1.2rem" }}>
                  <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
                    {door.subtitle}
                  </div>
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
