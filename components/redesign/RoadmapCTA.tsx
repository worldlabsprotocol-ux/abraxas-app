"use client";
// FILE: components/redesign/RoadmapCTA.tsx
// Bottom roadmap teaser — links to /roadmap instead of duplicating milestones inline.

import Link from "next/link";
import { motion } from "framer-motion";
import { ROADMAP } from "@/lib/protocolContent";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function RoadmapCTA() {
  const liveCount = ROADMAP.find(p => p.phase === "Live now")?.items.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{
        padding: "1.5rem 1.75rem",
        borderRadius: 18,
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1.25rem",
      }}
    >
      <div>
        <div style={{
          fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
          color: ACCENT, letterSpacing: "0.12em", textTransform: "uppercase",
          marginBottom: "0.4rem",
        }}>
          Protocol progress
        </div>
        <div style={{
          fontFamily: FONT, fontSize: "1.05rem", fontWeight: 700,
          color: "var(--text-primary)", marginBottom: "0.35rem",
        }}>
          {liveCount} milestones live today
        </div>
        <p style={{
          fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
          lineHeight: 1.6, margin: 0, maxWidth: 420,
        }}>
          Full roadmap with honest status labels. What shipped, what is in progress,
          and what is next.
        </p>
      </div>
      <Link href="/roadmap" style={{
        padding: "0.75rem 1.5rem", borderRadius: 999,
        background: ACCENT, color: "#04130C",
        fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
        textDecoration: "none", whiteSpace: "nowrap",
        boxShadow: "0 0 24px rgba(16,185,129,0.25)",
      }}>
        View full roadmap →
      </Link>
    </motion.div>
  );
}
