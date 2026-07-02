"use client";
// FILE: components/redesign/AssetsExplorer.tsx
// Verified Assets Explorer with quick actions and premium asset grid.

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EXPLORE_ASSETS, type VerifyState } from "@/lib/data/exploreAssets";
import { AssetExplorerCard } from "./AssetExplorerCard";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

type Filter = "all" | VerifyState;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all",       label: "All assets" },
  { id: "verified",  label: "Verified" },
  { id: "open",      label: "Open" },
  { id: "owned",     label: "Owned" },
  { id: "reference", label: "Reference" },
];

export function AssetsExplorer({
  excludeIds = [],
  title = "Real assets. Proven on-chain.",
  eyebrow = "Verified Assets",
}: {
  excludeIds?: string[];
  title?: string;
  eyebrow?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const reduce = useReducedMotion();
  const pool = EXPLORE_ASSETS.filter(a => !excludeIds.includes(a.id));
  const assets = filter === "all"
    ? [...pool].sort((a, b) => {
        if (a.id === "genesis-asset") return -1;
        if (b.id === "genesis-asset") return 1;
        const order: Record<VerifyState, number> = { verified: 0, open: 1, owned: 2, reference: 3 };
        return order[a.state] - order[b.state];
      })
    : pool.filter(a => a.state === filter);

  return (
    <section style={{ position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between",
                     flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
                         letterSpacing: "0.14em", textTransform: "uppercase",
                         color: ACCENT, marginBottom: "0.5rem" }}>
            {eyebrow}
          </div>
          <h2 style={{ fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
                        letterSpacing: "-0.03em", lineHeight: 1.05,
                        color: "var(--text-primary)", margin: 0 }}>
            {title}
          </h2>
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)",
                     maxWidth: 320, lineHeight: 1.6, margin: 0 }}>
          Verification state up front. What is confirmed, what is owned,
          and what is reference only.
        </p>
      </div>

      {/* Quick actions */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.5rem",
        marginBottom: "1.25rem", padding: "0.75rem",
        borderRadius: 14, background: "var(--surface-raised)",
        border: "1px solid var(--border)",
      }}>
        <Btn href="/passport" size="sm">Create wallet</Btn>
        <Btn href="/build" variant="secondary" size="sm">Submit an asset</Btn>
        <Btn href="/music-audit" variant="ghost" size="sm">Music audit</Btn>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ position: "relative", padding: "0.5rem 1rem", borderRadius: 999,
                       border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
                       background: active ? "rgba(16,185,129,0.12)" : "transparent",
                       color: active ? ACCENT : "var(--text-secondary)",
                       fontFamily: FONT, fontSize: "0.8rem", fontWeight: active ? 700 : 500,
                       cursor: "pointer", letterSpacing: "-0.01em" }}>
              {f.label}
            </button>
          );
        })}
      </div>

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
