"use client";
// FILE: components/redesign/AssetsExplorer.tsx
// Verified Assets Explorer with search, filters, sort, and premium asset grid.

import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EXPLORE_ASSETS, type VerifyState } from "@/lib/data/exploreAssets";
import { AssetExplorerCard } from "./AssetExplorerCard";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

type Filter = "all" | VerifyState;
type SortKey = "verified-first" | "name-asc" | "yield-desc";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all",       label: "All assets" },
  { id: "verified",  label: "Verified" },
  { id: "open",      label: "Open" },
  { id: "owned",     label: "Owned" },
  { id: "reference", label: "Reference" },
];

const SORTS: { id: SortKey; label: string }[] = [
  { id: "verified-first", label: "Verified first" },
  { id: "name-asc",       label: "Name A–Z" },
  { id: "yield-desc",     label: "Yield (high → low)" },
];

const ASSET_CLASSES = Array.from(new Set(EXPLORE_ASSETS.map(a => a.assetClass.split(" · ")[0])));

function parseYield(value: string): number {
  const m = value.match(/([\d.]+)\s*%/);
  return m ? parseFloat(m[1]) : 0;
}

function sortAssets(assets: typeof EXPLORE_ASSETS, sort: SortKey) {
  const copy = [...assets];
  if (sort === "name-asc") {
    return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (sort === "yield-desc") {
    return copy.sort((a, b) => parseYield(b.secondaryValue) - parseYield(a.secondaryValue));
  }
  return copy.sort((a, b) => {
    if (a.id === "genesis-asset") return -1;
    if (b.id === "genesis-asset") return 1;
    const order: Record<VerifyState, number> = { verified: 0, open: 1, owned: 2, reference: 3 };
    return order[a.state] - order[b.state];
  });
}

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
  const [sort, setSort] = useState<SortKey>("verified-first");
  const [query, setQuery] = useState("");
  const [assetClass, setAssetClass] = useState<string>("all");
  const reduce = useReducedMotion();

  const pool = EXPLORE_ASSETS.filter(a => !excludeIds.includes(a.id));

  const assets = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = filter === "all" ? pool : pool.filter(a => a.state === filter);

    if (assetClass !== "all") {
      list = list.filter(a => a.assetClass.startsWith(assetClass));
    }

    if (q) {
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.assetClass.toLowerCase().includes(q) ||
        a.primaryValue.toLowerCase().includes(q),
      );
    }

    return sortAssets(list, sort);
  }, [pool, filter, sort, query, assetClass]);

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
          Search, filter, and sort. Verification state up front — what is confirmed, owned, or reference only.
        </p>
      </div>

      {/* Search + sort */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.65rem", alignItems: "center",
        marginBottom: "1rem",
      }}>
        <label style={{ flex: "1 1 200px", minWidth: 180 }}>
          <span className="sr-only">Search assets</span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name, location, class…"
            aria-label="Search assets"
            style={{
              width: "100%", padding: "0.6rem 0.85rem", borderRadius: 999,
              border: "1px solid var(--border)", background: "var(--surface-raised)",
              color: "var(--text-primary)", fontFamily: FONT, fontSize: "0.82rem",
              boxSizing: "border-box", minHeight: 44,
            }}
          />
        </label>
        <label>
          <span className="sr-only">Sort assets</span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            aria-label="Sort assets"
            style={{
              padding: "0.6rem 0.85rem", borderRadius: 999,
              border: "1px solid var(--border)", background: "var(--surface-raised)",
              color: "var(--text-primary)", fontFamily: FONT, fontSize: "0.82rem",
              minHeight: 44, cursor: "pointer",
            }}
          >
            {SORTS.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        {(query || filter !== "all" || assetClass !== "all") && (
          <button type="button" onClick={() => { setQuery(""); setFilter("all"); setAssetClass("all"); }}
            style={{
              padding: "0.5rem 0.85rem", borderRadius: 999, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-muted)",
              fontFamily: FONT, fontSize: "0.75rem", cursor: "pointer", minHeight: 44,
            }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Quick actions */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.5rem",
        marginBottom: "1rem", padding: "0.75rem",
        borderRadius: 14, background: "var(--surface-raised)",
        border: "1px solid var(--border)",
      }}>
        <Btn href="/passport" size="sm">Create wallet</Btn>
        <Btn href="/build" variant="secondary" size="sm">Submit an asset</Btn>
        <Btn href="/music-audit" variant="ghost" size="sm">Music audit</Btn>
      </div>

      {/* State filters */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              aria-pressed={active}
              style={{ position: "relative", padding: "0.5rem 1rem", borderRadius: 999,
                       border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
                       background: active ? "rgba(16,185,129,0.12)" : "transparent",
                       color: active ? ACCENT : "var(--text-secondary)",
                       fontFamily: FONT, fontSize: "0.8rem", fontWeight: active ? 700 : 500,
                       cursor: "pointer", letterSpacing: "-0.01em", minHeight: 44 }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Asset class filters */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        <button type="button" onClick={() => setAssetClass("all")}
          aria-pressed={assetClass === "all"}
          style={{
            padding: "0.35rem 0.75rem", borderRadius: 999,
            border: `1px solid ${assetClass === "all" ? ACCENT : "var(--border)"}`,
            background: assetClass === "all" ? "rgba(16,185,129,0.1)" : "transparent",
            color: assetClass === "all" ? ACCENT : "var(--text-muted)",
            fontFamily: MONO, fontSize: "0.62rem", fontWeight: 700,
            letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer",
          }}>
          All classes
        </button>
        {ASSET_CLASSES.map(cls => {
          const active = assetClass === cls;
          return (
            <button key={cls} type="button" onClick={() => setAssetClass(cls)}
              aria-pressed={active}
              style={{
                padding: "0.35rem 0.75rem", borderRadius: 999,
                border: `1px solid ${active ? ACCENT : "var(--border)"}`,
                background: active ? "rgba(16,185,129,0.1)" : "transparent",
                color: active ? ACCENT : "var(--text-muted)",
                fontFamily: MONO, fontSize: "0.62rem", fontWeight: 700,
                letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer",
              }}>
              {cls}
            </button>
          );
        })}
      </div>

      {assets.length === 0 ? (
        <div style={{
          padding: "2rem 1rem", textAlign: "center", borderRadius: 14,
          border: "1px dashed var(--border)", color: "var(--text-muted)",
          fontFamily: FONT, fontSize: "0.82rem",
        }}>
          No assets match your search.{" "}
          <button type="button" onClick={() => { setQuery(""); setFilter("all"); setAssetClass("all"); }}
            style={{ background: "none", border: "none", color: ACCENT, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)",
                         letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
            {assets.length} ASSET{assets.length === 1 ? "" : "S"}
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
                  <AssetExplorerCard asset={a} variant="compact" />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </section>
  );
}
