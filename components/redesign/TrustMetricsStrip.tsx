"use client";
// FILE: components/redesign/TrustMetricsStrip.tsx
// Live protocol metrics from /api/metrics/public.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";
import { AnimatedCounter } from "@/lib/motion/AnimatedCounter";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

interface PublicMetrics {
  verified_assets: number;
  attested_value_label: string;
  zklogin_wallets: number;
  on_chain_passports: number;
  passport_stamps: number;
  credential_standard: string;
  sponsor_configured: boolean;
  captured_cielo_bookings?: number;
  cielo_revenue_label?: string;
}

const FALLBACK: PublicMetrics = {
  verified_assets: 1,
  attested_value_label: "$1.1M+",
  zklogin_wallets: 0,
  on_chain_passports: 0,
  passport_stamps: 10,
  credential_standard: "W3C VC",
  sponsor_configured: false,
  captured_cielo_bookings: 0,
  cielo_revenue_label: "Live on Sui",
};

export function TrustMetricsStrip() {
  const [m, setM] = useState<PublicMetrics>(FALLBACK);

  useEffect(() => {
    fetch("/api/metrics/public")
      .then(r => r.json())
      .then(d => setM((d.metrics ?? FALLBACK) as PublicMetrics))
      .catch(() => setM(FALLBACK));
  }, []);

  const METRICS = [
    { value: String(m.verified_assets), label: "Verified assets", sub: "Live on Abraxas" },
    {
      value: m.cielo_revenue_label ?? "Live on Sui",
      label: "Cielo on Sui",
      sub: m.captured_cielo_bookings
        ? `${m.captured_cielo_bookings} captured stay${m.captured_cielo_bookings === 1 ? "" : "s"}`
        : "USDC revenue loop",
    },
    { value: m.attested_value_label, label: "Value attested", sub: "Cielo appraisal" },
    {
      value: String(m.passport_stamps),
      label: "Passport stamps",
      sub: m.sponsor_configured ? "Sponsor live" : "Verification depth",
    },
  ];

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
      {METRICS.map(metric => (
        <motion.div key={metric.label} variants={staggerItem}
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
            color: metric.label.includes("attested") || metric.label.includes("Cielo") ? ACCENT : "var(--text-primary)",
            lineHeight: 1.05,
          }}>
            <AnimatedCounter value={metric.value} />
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-primary)", marginTop: 4 }}>
            {metric.label}
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", marginTop: 2 }}>
            {metric.sub}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
