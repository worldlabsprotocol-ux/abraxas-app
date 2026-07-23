"use client";
// FILE: components/redesign/AssetsExplorer.tsx
// Verified Assets Explorer with search, filters, sort, and premium asset grid.

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EXPLORE_ASSETS, type ExploreAsset, type VerifyState } from "@/lib/data/exploreAssets";
import { AssetExplorerCard } from "./AssetExplorerCard";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

type Filter = "all" | VerifyState;
type SortKey = "verified-first" | "name-asc" | "yield-desc";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all",       label: "All assets" },
  { id: "verified",  label: "Verified" },
  { id: "listed",    label: "Owner listed" },
  { id: "open",      label: "Open" },
  { id: "owned",     label: "Owned" },
  { id: "reference", label: "Reference" },
];

const SORTS: { id: SortKey; label: string }[] = [
  { id: "verified-first", label: "Verified first" },
  { id: "name-asc",       label: "Name A to Z" },
  { id: "yield-desc",     label: "Yield (high → low)" },
];

function parseYield(value: string): number {
  const m = value.match(/([\d.]+)\s*%/);
  return m ? parseFloat(m[1]) : 0;
}

function sortAssets(assets: ExploreAsset[], sort: SortKey) {
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
    const order: Record<VerifyState, number> = { verified: 0, open: 1, listed: 2, owned: 3, reference: 4 };
    return order[a.state] - order[b.state];
  });
}

export function AssetsExplorer({
  excludeIds = [],
  title = "Real assets. Proven on-chain.",
  eyebrow = "Verified Assets",
  compact = false,
  home = false,
}: {
  excludeIds?: string[];
  title?: string;
  eyebrow?: string;
  compact?: boolean;
  /** Ultra-minimal homepage strip. plain copy, no dev metadata. */
  home?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("verified-first");
  const [query, setQuery] = useState("");
  const [assetClass, setAssetClass] = useState<string>("all");
  const [dynamicAssets, setDynamicAssets] = useState<ExploreAsset[]>([]);
  const reduce = useReducedMotion();

  useEffect(() => {
    fetch("/api/registry/explore")
      .then(r => r.json())
      .then((data: { assets?: ExploreAsset[] }) => {
        if (Array.isArray(data.assets)) setDynamicAssets(data.assets);
      })
      .catch(() => { /* static catalog fallback */ });
  }, []);

  const staticIds = useMemo(() => new Set(EXPLORE_ASSETS.map(a => a.id)), []);
  const mergedPool = useMemo(() => {
    const extra = dynamicAssets.filter(a => !staticIds.has(a.id));
    return [...EXPLORE_ASSETS, ...extra];
  }, [dynamicAssets, staticIds]);

  const pool = mergedPool.filter(a => !excludeIds.includes(a.id));
  const assetClassOptions = useMemo(
    () => Array.from(new Set(pool.map(a => a.assetClass.split(" · ")[0]))),
    [pool],
  );

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

  const displayAssets = home ? assets.slice(0, 3) : compact ? assets.slice(0, 3) : assets;
  const cardVariant = home ? "home" as const : compact ? "compact" as const : "default" as const;

  return (
    <section style={{ position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between",
                     flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
        <div>
          <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
            {eyebrow}
          </div>
          <h2 style={{ fontFamily: FONT, fontSize: compact || home ? "var(--fs-h2)" : "var(--fs-h1)", fontWeight: 800,
                        letterSpacing: "-0.03em", lineHeight: 1.05,
                        color: "var(--text-primary)", margin: 0 }}>
            {title}
          </h2>
          {home && (
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
              maxWidth: 480, lineHeight: 1.6, margin: "0.5rem 0 0",
            }}>
              Live on-registry properties · dated attestations · scope per listing.
            </p>
          )}
        </div>
        {!compact && !home && (
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)",
                       maxWidth: 320, lineHeight: 1.6, margin: 0 }}>
            The canonical asset list. search, filter, and inspect verification scope per listing.
          </p>
        )}
      </div>

      {!compact && !home && (
        <>
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

          <div style={{ marginBottom: "1rem" }}>
            <Btn href="/build" variant="secondary" size="sm">Submit an asset →</Btn>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            {FILTERS.map(f => {
              const active = filter === f.id;
              return (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  aria-pressed={active}
                  style={{ position: "relative", padding: "0.5rem 1rem", borderRadius: 999,
                           border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
                           background: active ? "var(--accent-faint)" : "transparent",
                           color: active ? "var(--accent)" : "var(--text-secondary)",
                           fontFamily: FONT, fontSize: "0.8rem", fontWeight: active ? 700 : 500,
                           cursor: "pointer", letterSpacing: "-0.01em", minHeight: 44 }}>
                  {f.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            <button type="button" onClick={() => setAssetClass("all")}
              aria-pressed={assetClass === "all"}
              style={{
                padding: "0.35rem 0.75rem", borderRadius: 999,
                border: `1px solid ${assetClass === "all" ? "var(--accent-border)" : "var(--border)"}`,
                background: assetClass === "all" ? "var(--accent-faint)" : "transparent",
                color: assetClass === "all" ? "var(--accent)" : "var(--text-muted)",
                fontFamily: MONO, fontSize: "0.62rem", fontWeight: 700,
                letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer",
              }}>
              All classes
            </button>
            {assetClassOptions.map(cls => {
              const active = assetClass === cls;
              return (
                <button key={cls} type="button" onClick={() => setAssetClass(cls)}
                  aria-pressed={active}
                  style={{
                    padding: "0.35rem 0.75rem", borderRadius: 999,
                    border: `1px solid ${active ? "var(--accent-border)" : "var(--border)"}`,
                    background: active ? "var(--accent-faint)" : "transparent",
                    color: active ? "var(--accent)" : "var(--text-muted)",
                    fontFamily: MONO, fontSize: "0.62rem", fontWeight: 700,
                    letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer",
                  }}>
                  {cls}
                </button>
              );
            })}
          </div>
        </>
      )}

      {displayAssets.length === 0 ? (
        <div style={{
          padding: "2rem 1rem", textAlign: "center", borderRadius: 14,
          border: "1px dashed var(--border)", color: "var(--text-muted)",
          fontFamily: FONT, fontSize: "0.82rem",
        }}>
          No assets match your search.{" "}
          {!compact && !home && (
            <button type="button" onClick={() => { setQuery(""); setFilter("all"); setAssetClass("all"); }}
              style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {!home && (
            <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)",
                           letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
              {displayAssets.length} ASSET{displayAssets.length === 1 ? "" : "S"}
              {compact && assets.length > 3 ? ` · ${assets.length} total` : ""}
            </div>
          )}
          <motion.div layout={!reduce}
            style={{ display: "grid", gridTemplateColumns: home
              ? "repeat(auto-fill, minmax(240px, 1fr))"
              : "repeat(auto-fill, minmax(280px, 1fr))",
                       gap: home ? "0.85rem" : "1.1rem" }}>
            <AnimatePresence mode="popLayout">
              {displayAssets.map(a => (
                <motion.div key={a.id} layout={!reduce}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                  <AssetExplorerCard asset={a} variant={cardVariant} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
          {(compact || home) && (
            <div style={{ marginTop: "1rem" }}>
              <Btn href="/verify" variant="ghost" size="sm">
                {home ? "How verification works →" : "View all reference records →"}
              </Btn>
            </div>
          )}
        </>
      )}
    </section>
  );
}
