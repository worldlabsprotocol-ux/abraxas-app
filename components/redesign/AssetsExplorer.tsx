"use client";
// FILE: components/redesign/AssetsExplorer.tsx
// Verified Assets Explorer: elegant filter bar + responsive grid of
// premium asset cards, built from real asset data.

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EXPLORE_ASSETS, type VerifyState } from "@/lib/data/exploreAssets";
import { AssetExplorerCard } from "./AssetExplorerCard";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

type Filter = "all" | VerifyState;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all",       label: "All assets" },
  { id: "verified",  label: "Verified" },
  { id: "open",      label: "Open" },
  { id: "owned",     label: "Owned" },
  { id: "reference", label: "Reference" },
];

export function AssetsExplorer() {
  const [filter, setFilter] = useState<Filter>("all");
  const reduce = useReducedMotion();
  const assets = filter === "all" ? EXPLORE_ASSETS : EXPLORE_ASSETS.filter(a => a.state === filter);

  return (
    <section style={{ position: "relative", zIndex: 1 }}>
      {/* Heading row */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between",
                     flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
                         letterSpacing: "0.14em", textTransform: "uppercase",
                         color: "#10B981", marginBottom: "0.5rem" }}>
            Verified Assets
          </div>
          <h2 style={{ fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
                        letterSpacing: "-0.03em", lineHeight: 1.05,
                        color: "var(--text-primary)", margin: 0 }}>
            Real assets. Proven on-chain.
          </h2>
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)",
                       maxWidth: 320, lineHeight: 1.6 }}>
          Every listing carries its verification state up front, what is confirmed,
          what is owned, and what is shown only for reference.
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ position: "relative", padding: "0.5rem 1rem", borderRadius: 999,
                       border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
                       background: active ? "rgba(16,185,129,0.12)" : "transparent",
                       color: active ? "#10B981" : "var(--text-secondary)",
                       fontFamily: FONT, fontSize: "0.8rem", fontWeight: active ? 700 : 500,
                       cursor: "pointer", letterSpacing: "-0.01em" }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <motion.div layout={!reduce}
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                 gap: "1.1rem" }}>
        <AnimatePresence mode="popLayout">
          {assets.map(a => (
            <motion.div key={a.id} layout={!reduce}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <AssetExplorerCard asset={a} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
