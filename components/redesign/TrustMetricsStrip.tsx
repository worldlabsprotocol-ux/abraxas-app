"use client";
// FILE: components/redesign/TrustMetricsStrip.tsx
// Design-partner metrics — honest framing, no conflicting signals.

import { useEffect, useState } from "react";
import Link from "next/link";
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
  active_credentials?: number;
  captured_cielo_bookings?: number;
  cielo_revenue_label?: string;
}

const FALLBACK: PublicMetrics = {
  verified_assets: 1,
  attested_value_label: "$1.1M+",
  zklogin_wallets: 0,
  on_chain_passports: 0,
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
    {
      value: m.attested_value_label,
      label: "Attested on registry",
      sub: "Cielo appraisal · L3 — not a platform total",
      accent: true,
    },
    {
      value: String(m.verified_assets),
      label: "Verified assets live",
      sub: "Design partner phase · more onboarding",
    },
    {
      value: m.cielo_revenue_label ?? "Live on Sui",
      label: "Featured stay rail",
      sub: m.captured_cielo_bookings
        ? `${m.captured_cielo_bookings} captured booking${m.captured_cielo_bookings === 1 ? "" : "s"}`
        : "Apple Pay + USDC · genesis pilot",
      accent: true,
    },
    {
      value: String(m.zklogin_wallets),
      label: "Passport accounts",
      sub: "Google zkLogin wallets registered",
    },
  ];

  return (
    <div>
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem 0.75rem",
        marginBottom: "0.75rem",
      }}>
        <span style={{
          fontFamily: FONT, fontSize: "0.58rem", fontWeight: 800,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "#3B82F6", padding: "0.25rem 0.55rem", borderRadius: 6,
          background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)",
        }}>
          Design partner metrics
        </span>
        <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          Live from Supabase — zeros mean early, not fabricated.{" "}
          <Link href="/metrics" style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>
            Full dashboard →
          </Link>
        </span>
      </div>

      <motion.div
        variants={staggerContainer(0.06, 0.04)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
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
              color: metric.accent ? ACCENT : "var(--text-primary)",
              lineHeight: 1.05,
            }}>
              <AnimatedCounter value={metric.value} />
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-primary)", marginTop: 4 }}>
              {metric.label}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", marginTop: 2, lineHeight: 1.45 }}>
              {metric.sub}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
