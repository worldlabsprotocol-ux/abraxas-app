"use client";
// FILE: components/redesign/MarketIntelFeed.tsx
// Live headline feed for stablecoins, RWA, BTC. Sleek ticker-style panel.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

interface FeedItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  topic: "stablecoin" | "rwa" | "btc" | "macro" | "sui";
}

const TOPIC_STYLE: Record<FeedItem["topic"], { label: string; color: string }> = {
  stablecoin: { label: "Stablecoins", color: "#3B82F6" },
  rwa: { label: "RWA", color: "#F59E0B" },
  btc: { label: "BTC", color: "#F97316" },
  macro: { label: "Macro", color: "#8B5CF6" },
  sui: { label: "Sui", color: ACCENT },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "recent";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function MarketIntelFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    fetch("/api/market/intel")
      .then(r => r.json())
      .then(d => setItems((d.items ?? []) as FeedItem[]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setActiveIdx(i => (i + 1) % Math.min(items.length, 6)), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  const featured = items.slice(0, 6);
  const spotlight = featured[activeIdx];

  return (
    <section>
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.62rem", fontWeight: 700,
          color: ACCENT, letterSpacing: "0.14em", textTransform: "uppercase",
          marginBottom: "0.5rem",
        }}>
          Market intelligence
        </div>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.05,
          color: "var(--text-primary)", margin: "0 0 0.5rem", maxWidth: 640,
        }}>
          What is moving in stablecoins, RWA, and BTC.
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "var(--fs-body)", color: "var(--text-secondary)",
          lineHeight: 1.7, maxWidth: 560, margin: 0,
        }}>
          Headlines from credible sources. Updated every few minutes.
          Context for why real assets and on-chain trust matter now.
        </p>
      </div>

      <div style={{
        borderRadius: 18, overflow: "hidden",
        border: "1px solid var(--border-strong)",
        background: "linear-gradient(160deg, rgba(16,185,129,0.06) 0%, var(--surface-raised) 45%)",
        boxShadow: "var(--shadow-glow)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.85rem 1.15rem", borderBottom: "1px solid var(--border)",
          gap: "0.75rem", flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", background: ACCENT,
              boxShadow: `0 0 10px ${ACCENT}`,
              animation: loading ? "none" : "abraxasPulse 2s ease-in-out infinite",
            }} />
            <span style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
              LIVE FEED
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            {Object.entries(TOPIC_STYLE).slice(0, 4).map(([key, v]) => (
              <span key={key} style={{
                fontFamily: MONO, fontSize: "0.5rem", fontWeight: 700,
                color: v.color, padding: "0.15rem 0.45rem", borderRadius: 999,
                border: `1px solid ${v.color}40`, background: `${v.color}12`,
              }}>
                {v.label}
              </span>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "2rem 1.15rem", fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Loading market headlines…
          </div>
        ) : (
          <>
            {spotlight && (
              <div style={{ padding: "1.15rem 1.15rem 0.75rem", minHeight: 88 }}>
                <AnimatePresence mode="wait">
                  <motion.a
                    key={spotlight.id}
                    href={spotlight.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35 }}
                    style={{ textDecoration: "none", display: "block" }}
                  >
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.45rem" }}>
                      <span style={{
                        fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
                        color: TOPIC_STYLE[spotlight.topic].color,
                        padding: "0.12rem 0.4rem", borderRadius: 6,
                        background: `${TOPIC_STYLE[spotlight.topic].color}15`,
                      }}>
                        {TOPIC_STYLE[spotlight.topic].label}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: "0.52rem", color: "var(--text-muted)" }}>
                        {spotlight.source} · {timeAgo(spotlight.publishedAt)}
                      </span>
                    </div>
                    <div style={{
                      fontFamily: FONT, fontSize: "clamp(0.95rem, 2vw, 1.1rem)",
                      fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.35,
                    }}>
                      {spotlight.title}
                    </div>
                  </motion.a>
                </AnimatePresence>
              </div>
            )}

            <div style={{ padding: "0 0.65rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {featured.map((item, i) => {
                const topic = TOPIC_STYLE[item.topic];
                const isActive = i === activeIdx;
                return (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={() => setActiveIdx(i)}
                    style={{
                      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "0.65rem",
                      alignItems: "center", padding: "0.55rem 0.5rem", borderRadius: 10,
                      textDecoration: "none",
                      background: isActive ? "rgba(16,185,129,0.08)" : "transparent",
                      border: isActive ? "1px solid rgba(16,185,129,0.2)" : "1px solid transparent",
                      transition: "background 0.2s, border-color 0.2s",
                    }}
                  >
                    <span style={{
                      fontFamily: MONO, fontSize: "0.48rem", fontWeight: 700,
                      color: topic.color, minWidth: 52,
                    }}>
                      {topic.label}
                    </span>
                    <span style={{
                      fontFamily: FONT, fontSize: "0.76rem", fontWeight: isActive ? 600 : 500,
                      color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                      lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {item.title}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: "0.48rem", color: "var(--text-muted)", flexShrink: 0 }}>
                      {timeAgo(item.publishedAt)}
                    </span>
                  </a>
                );
              })}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes abraxasPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </section>
  );
}
