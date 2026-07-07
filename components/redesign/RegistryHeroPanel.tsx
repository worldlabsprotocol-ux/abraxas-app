"use client";
// FILE: components/redesign/RegistryHeroPanel.tsx
// Abstract registry preview — typography-first, no photo mosaic.

import { motion } from "framer-motion";
import { EXPLORE_ASSETS, VERIFY_META } from "@/lib/data/exploreAssets";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function RegistryHeroPanel() {
  const preview = EXPLORE_ASSETS.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      style={{
        position: "relative", borderRadius: 20, overflow: "hidden",
        border: "1px solid var(--border-strong)",
        boxShadow: "var(--shadow-glow)", background: "var(--surface-raised)",
        minHeight: 320,
      }}
    >
      <div style={{
        position: "absolute", inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 20% 0%, rgba(16,185,129,0.14) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 90% 100%, rgba(59,130,246,0.08) 0%, transparent 50%),
          linear-gradient(160deg, #0a1218 0%, #06090B 100%)
        `,
      }} />

      <div style={{ position: "relative", padding: "1.35rem 1.35rem 1.15rem", display: "flex", flexDirection: "column", height: "100%", minHeight: 320 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          <span style={{
            fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
            padding: "0.25rem 0.55rem", borderRadius: 999,
            background: "rgba(16,185,129,0.12)", color: ACCENT, border: "1px solid rgba(16,185,129,0.35)",
          }}>
            PUBLIC REGISTRY
          </span>
          <span style={{
            fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
            padding: "0.25rem 0.55rem", borderRadius: 999,
            background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            {EXPLORE_ASSETS.length} assets · design partner phase
          </span>
        </div>

        <div style={{ fontFamily: FONT, fontSize: "1.15rem", fontWeight: 800, color: "#fff", marginBottom: "0.35rem" }}>
          Verified assets across classes
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.74rem", color: "rgba(255,255,255,0.72)", marginBottom: "1.1rem", lineHeight: 1.55, maxWidth: 380 }}>
          Browse without ID checks. Multiple asset classes with transparent assurance levels.
        </div>

        <div style={{ display: "grid", gap: "0.45rem", flex: 1 }}>
          {preview.map(asset => {
            const meta = VERIFY_META[asset.state];
            return (
              <div key={asset.id} style={{
                display: "grid", gridTemplateColumns: "1fr auto",
                alignItems: "center", gap: "0.75rem",
                padding: "0.55rem 0.7rem", borderRadius: 10,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "#fff" }}>
                    {asset.name}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                    {asset.location} · {asset.primaryValue}
                  </div>
                </div>
                <span style={{
                  fontFamily: MONO, fontSize: "0.48rem", fontWeight: 700,
                  padding: "0.18rem 0.4rem", borderRadius: 999,
                  color: meta.color, border: `1px solid ${meta.color}55`,
                  background: `${meta.color}18`, whiteSpace: "nowrap",
                }}>
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1.1rem" }}>
          <Btn href="#registry" size="sm">Browse registry →</Btn>
          <Btn href="/passport" variant="tertiary" size="sm">Create passport</Btn>
        </div>
      </div>
    </motion.div>
  );
}
