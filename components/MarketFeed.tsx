"use client";

import { useEffect, useState } from "react";

interface Signal {
  label: string; value: string; trend: string; source: string; category?: string;
}
interface RWAToken {
  symbol: string; name: string; price: number; marketCap: number; change24h: number;
}

type Tab = "music" | "film" | "rwa";

const TAB_LABELS: Record<Tab, string> = {
  music: "Music IP",
  film:  "Film & TV",
  rwa:   "RWA Market",
};

const CATEGORY_MAP: Record<Tab, string[]> = {
  music: ["music", "audio", "yield"],
  film:  ["film", "sync", "audio"],
  rwa:   [],
};

function fmtPrice(n: number): string {
  if (n >= 1) return "$" + n.toFixed(2);
  if (n >= 0.01) return "$" + n.toFixed(4);
  return "$" + n.toFixed(6);
}
function fmtMcap(n: number): string {
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(0) + "M";
  return "$" + n.toFixed(0);
}

export function MarketFeed() {
  const [tab, setTab]     = useState<Tab>("music");
  const [signals, setSignals] = useState<Signal[]>([]);
  const [rwaTokens, setRwaTokens] = useState<RWAToken[]>([]);
  const [featured, setFeatured] = useState<{ name: string; genre: string; thumb?: string } | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/market/music").then((r) => r.json()).catch(() => null),
      fetch("/api/market/rwa").then((r)   => r.json()).catch(() => null),
    ]).then(([m, r]) => {
      if (m?.ok) {
        setSignals(m.signals ?? []);
        setFeatured(m.featured ?? null);
      }
      if (r?.ok) setRwaTokens(r.rwaTokens ?? []);
      setLoading(false);
    });
  }, []);

  const filteredSignals = tab === "rwa"
    ? []
    : signals.filter((s) => CATEGORY_MAP[tab].includes(s.category ?? ""));

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Market Intelligence</span>
        </div>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ fontSize: "0.6rem", fontWeight: tab === t ? 700 : 400, textTransform: "uppercase", letterSpacing: "0.06em", padding: "0.2rem 0.6rem", borderRadius: "4px", background: tab === t ? "rgba(200,169,110,0.12)" : "none", border: `1px solid ${tab === t ? "rgba(200,169,110,0.3)" : "transparent"}`, color: tab === t ? "var(--gold)" : "var(--subtle)", cursor: "pointer", transition: "all 0.15s" }}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "0.875rem 1.25rem" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--subtle)", fontSize: "0.75rem" }}>
            Loading market data…
          </div>
        )}

        {/* Music + Film tabs */}
        {!loading && tab !== "rwa" && (
          <div>
            {tab === "music" && featured && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", background: "rgba(200,169,110,0.04)", border: "1px solid rgba(200,169,110,0.1)", borderRadius: "8px", marginBottom: "0.875rem" }}>
                {featured.thumb && (
                  <img src={featured.thumb} alt={featured.name} style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{featured.name}</div>
                  <div style={{ fontSize: "0.62rem", color: "var(--subtle)" }}>{featured.genre} · Active IP catalog</div>
                </div>
                <div style={{ fontSize: "0.6rem", color: "var(--gold)", border: "1px solid rgba(200,169,110,0.2)", padding: "0.15rem 0.45rem", borderRadius: "4px", flexShrink: 0 }}>
                  Live signal
                </div>
              </div>
            )}

            {tab === "film" && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", background: "rgba(107,140,255,0.05)", border: "1px solid rgba(107,140,255,0.15)", borderRadius: "8px", marginBottom: "0.875rem" }}>
                <span style={{ fontSize: "1rem" }}>🎬</span>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600 }}>Film, TV & Screenwriter IP</div>
                  <div style={{ fontSize: "0.62rem", color: "var(--subtle)" }}>Residuals, sync rights, and streaming backend deals — all tokenizable.</div>
                </div>
              </div>
            )}

            {filteredSignals.length === 0 ? (
              <p style={{ fontSize: "0.75rem", color: "var(--subtle)", padding: "0.5rem 0" }}>No signals for this category yet.</p>
            ) : (
              filteredSignals.map((s) => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.55rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{s.label}</div>
                    <div style={{ fontSize: "0.6rem", color: "var(--subtle)", marginTop: "0.1rem" }}>{s.source}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>{s.value}</div>
                    <div style={{ fontSize: "0.6rem", color: "var(--green)" }}>{s.trend}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* RWA tab */}
        {!loading && tab === "rwa" && (
          <div>
            {rwaTokens.length > 0 && (
              <div style={{ marginBottom: "0.875rem" }}>
                <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>
                  Live RWA Tokens — CoinGecko
                </p>
                {rwaTokens.slice(0, 4).map((t) => (
                  <div key={t.symbol} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>{t.symbol}
                      <span style={{ fontSize: "0.62rem", color: "var(--subtle)", fontWeight: 400, marginLeft: "0.4rem" }}>{t.name.slice(0, 16)}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>{fmtPrice(t.price)}</div>
                      <div style={{ fontSize: "0.62rem", color: (t.change24h ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}>
                        {(t.change24h ?? 0) >= 0 ? "+" : ""}{(t.change24h ?? 0).toFixed(2)}% · {fmtMcap(t.marketCap)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {[
              { label: "Total RWA on-chain",       value: "$33.2B", trend: "+340% YoY",   source: "rwa.xyz 2026"    },
              { label: "Tokenized Treasuries",      value: "$2.75B", trend: "+90% 6mo",    source: "Ondo/BUIDL"      },
              { label: "US home price index",       value: "+5.2%",  trend: "HPI Q1 2026", source: "FHFA"            },
              { label: "Invoice factoring market",  value: "$4.8T",  trend: "Global 2026", source: "Statista"        },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.55rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{s.label}</div>
                  <div style={{ fontSize: "0.6rem", color: "var(--subtle)", marginTop: "0.1rem" }}>{s.source}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>{s.value}</div>
                  <div style={{ fontSize: "0.6rem", color: "var(--green)" }}>{s.trend}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}