"use client";
// FILE: components/redesign/VisualProofSection.tsx
// Bridges backend depth → frontend feel: real photos, live metrics, verifier link.
// The homepage felt "thin" because infrastructure copy replaced visual proof — this restores it.

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FeaturedFlagship } from "./FeaturedFlagship";
import { EXPLORE_ASSETS } from "@/lib/data/exploreAssets";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

interface LiveMetrics {
  verified_assets: number;
  captured_cielo_bookings?: number;
  on_chain_passports: number;
  passport_stamps: number;
}

export function VisualProofSection() {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);

  useEffect(() => {
    fetch("/api/metrics/public")
      .then(r => r.json())
      .then(d => setMetrics(d.metrics ?? null))
      .catch(() => setMetrics(null));
  }, []);

  const thumbs = EXPLORE_ASSETS.filter(a => a.image).slice(0, 4);

  return (
    <section>
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.5rem",
        }}>
          Live proof
        </div>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.05,
          color: "var(--text-primary)", margin: "0 0 0.5rem", maxWidth: 560,
        }}>
          Real assets. Real photos. Real rails.
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.7, maxWidth: 620, margin: 0,
        }}>
          Infrastructure is the thesis — but investors and guests trust what they can see.
          Below is the same data the backend serves: verified properties, live booking, on-chain verification.
        </p>
      </div>

      {/* Live backend pulse */}
      {metrics && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex", flexWrap: "wrap", gap: "0.65rem",
            marginBottom: "1.25rem", padding: "0.75rem 1rem",
            borderRadius: 14, background: "var(--surface-raised)",
            border: "1px solid var(--border-strong)",
          }}
        >
          {[
            { l: "Verified assets", v: String(metrics.verified_assets) },
            { l: "Cielo bookings", v: String(metrics.captured_cielo_bookings ?? 0) },
            { l: "Passports", v: String(metrics.on_chain_passports) },
            { l: "Trust stamps", v: String(metrics.passport_stamps) },
          ].map(m => (
            <div key={m.l} style={{ padding: "0.35rem 0.75rem", borderRadius: 999, background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span style={{ fontFamily: MONO, fontSize: "0.72rem", fontWeight: 700, color: ACCENT }}>{m.v}</span>
              <span style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", marginLeft: "0.4rem" }}>{m.l}</span>
            </div>
          ))}
          <span style={{ fontFamily: MONO, fontSize: "0.55rem", color: "var(--text-muted)", alignSelf: "center", marginLeft: "auto" }}>
            live · /api/metrics/public
          </span>
        </motion.div>
      )}

      <FeaturedFlagship />

      {/* Asset photo strip */}
      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.65rem" }}>
          More in the public registry
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.65rem",
        }}>
          {thumbs.map(asset => (
            <Link key={asset.id} href={asset.href ?? `#registry`}
              style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{
                borderRadius: 14, overflow: "hidden",
                border: "1px solid var(--border)",
                background: "var(--surface-raised)",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.image}
                  alt={asset.name}
                  style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }}
                />
                <div style={{ padding: "0.55rem 0.65rem" }}>
                  <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {asset.name}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "0.58rem", color: "var(--text-muted)" }}>
                    {asset.location}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: "0.85rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Btn href="#registry" size="sm">Browse full registry →</Btn>
          <Btn href="/verify?q=ABX-RE-HOSP-001" variant="secondary" size="sm">Run verifier</Btn>
        </div>
      </div>
    </section>
  );
}
