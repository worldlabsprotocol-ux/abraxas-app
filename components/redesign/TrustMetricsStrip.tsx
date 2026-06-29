"use client";
// FILE: components/redesign/TrustMetricsStrip.tsx
// Compact credibility strip between hero and asset grid.

import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";
import { AnimatedCounter } from "@/lib/motion/AnimatedCounter";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const METRICS = [
  { value: "6", label: "Verified assets", sub: "Live on Abraxas" },
  { value: "~$2M", label: "Value attested", sub: "Real appraisals" },
  { value: "W3C", label: "Credential standard", sub: "Portable proof" },
  { value: "10", label: "Passport stamps", sub: "Verification depth" },
];

export function TrustMetricsStrip() {
  return (
    <motion.div
      variants={staggerContainer(0.06, 0.04)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "0.75rem",
        marginBottom: "var(--section-gap, 2.5rem)",
      }}
    >
      {METRICS.map(m => (
        <motion.div key={m.label} variants={staggerItem}
          style={{
            padding: "1rem 1.15rem",
            borderRadius: 14,
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
          }}>
          <div style={{
            fontFamily: "'Space Grotesk','Inter',sans-serif",
            fontSize: "1.45rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: m.label.includes("attested") ? ACCENT : "var(--text-primary)",
            lineHeight: 1.05,
          }}>
            <AnimatedCounter value={m.value} />
          </div>
          <div style={{
            fontFamily: FONT,
            fontSize: "0.72rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginTop: 4,
          }}>
            {m.label}
          </div>
          <div style={{
            fontFamily: FONT,
            fontSize: "0.62rem",
            color: "var(--text-muted)",
            marginTop: 2,
          }}>
            {m.sub}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
