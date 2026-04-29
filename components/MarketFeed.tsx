"use client";

import { useEffect, useState } from "react";

interface Signal { label: string; value: string; trend: string; source: string; }
interface RWAToken { symbol: string; name: string; price: number; marketCap: number; change24h: number; }

interface MusicData { signals: Signal[]; featured: { name: string; genre: string; thumb?: string } | null; }
interface RWAData   { marketSignals: Signal[]; rwaTokens: RWAToken[]; }

type Tab = "music" | "rwa";

function fmt(n: number): string {
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(0) + "M";
  return "$" + n.toFixed(2);
}

export function MarketFeed() {
  const [tab, setTab]       = useState<Tab>("music");
  const [music, setMusic]   = useState<MusicData | null>(null);
  const [rwa, setRwa]       = useState<RWAData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/market/music").then((r) => r.json()).catch(() => null),
      fetch("/api/market/rwa").then((r)   => r.json()).catch(() => null),
    ]).then(([m, r]) => {
      if (m?.ok) setMusic(m);
      if (r?.ok) setRwa(r);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid var(--line)", background: "var(--raise)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Market Intelligence</span>
        </div>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {(["music", "rwa"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              fontSize: "0.62rem", fontWeight: tab === t ? 700 : 400,
              textTransform: "uppercase", letterSpacing: "0.06em",
              padding: "0.25rem 0.625rem", borderRadius: "4px",
              background: tab === t ? "rgba(200,169,110,0.12)" : "none",
              border: `1px solid ${tab === t ? "rgba(200,169,110,0.3)" : "transparent"}`,
              color: tab === t ? "var(--gold)" : "var(--subtle)",
              cursor: "pointer", transition: "all 0.15s",
            }}>
              {t === "music" ? "Music IP" : "RWA"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "1rem 1.25rem" }}>
        {loading && <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--subtle)", fontSize: "0.75rem" }}>Loading market data…</div>}

        {/* Music tab */}
        {!loading && tab === "music" && (
          <div>
            {music?.featured && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "rgba(200,169,110,0.04)", border: "1px solid rgba(200,169,110,0.1)", borderRadius: "8px", marginBottom: "1rem" }}>
                {music.featured.thumb && (
                  <img src={music.featured.thumb} alt={music.featured.name} style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                )}
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>{music.featured.name}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--subtle)" }}>{music.featured.genre} · IP signal</div>
                </div>
                <div style={{ marginLeft: "auto", fontSize: "0.62rem", color: "var(--gold)", border: "1px solid rgba(200,169,110,0.2)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                  Active catalog
                </div>
              </div>
            )}
            {(music?.signals ?? []).map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.55rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{s.label}</div>
                  <div style={{ fontSize: "0.62rem", color: "var(--subtle)", marginTop: "0.1rem" }}>{s.source}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>{s.value}</div>
                  <div style={{ fontSize: "0.62rem", color: "var(--green)" }}>{s.trend}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RWA tab */}
        {!loading && tab === "rwa" && (
          <div>
            {(rwa?.rwaTokens ?? []).length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.625rem" }}>Live RWA Tokens</p>
                {(rwa?.rwaTokens ?? []).slice(0, 3).map((t) => (
                  <div key={t.symbol} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600 }}>{t.symbol}</div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>{fmt(t.price)}</div>
                      <div style={{ fontSize: "0.62rem", color: t.change24h >= 0 ? "var(--green)" : "var(--red)" }}>
                        {t.change24h >= 0 ? "+" : ""}{t.change24h?.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(rwa?.marketSignals ?? []).map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.55rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{s.label}</div>
                  <div style={{ fontSize: "0.62rem", color: "var(--subtle)", marginTop: "0.1rem" }}>{s.source}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>{s.value}</div>
                  <div style={{ fontSize: "0.62rem", color: "var(--green)" }}>{s.trend}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}