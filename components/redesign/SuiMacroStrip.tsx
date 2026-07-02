"use client";
// FILE: components/redesign/SuiMacroStrip.tsx
// Sui chain telemetry: TVL + stablecoins on homepage.

import { useEffect, useState } from "react";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

interface MacroData {
  sui?: { tvlFormatted: string; change24h: number };
  stablecoins?: Array<{ symbol: string; circulatingFormatted: string }>;
  source?: string;
}

export function SuiMacroStrip() {
  const [data, setData] = useState<MacroData | null>(null);

  useEffect(() => {
    fetch("/api/macro")
      .then(r => r.json())
      .then(d => setData(d as MacroData))
      .catch(() => setData(null));
  }, []);

  if (!data?.sui) return null;

  return (
    <section style={{
      padding: "1rem 1.15rem", borderRadius: 16,
      background: "var(--surface)", border: "1px solid var(--border)",
    }}>
      <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT,
                     letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.65rem" }}>
        Sui network · live
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>DeFi TVL</div>
          <div style={{ fontFamily: FONT, fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>
            {data.sui.tvlFormatted}
            <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: data.sui.change24h >= 0 ? ACCENT : "#EF4444", marginLeft: 8 }}>
              {data.sui.change24h >= 0 ? "+" : ""}{data.sui.change24h}%
            </span>
          </div>
        </div>
        {(data.stablecoins ?? []).slice(0, 4).map(s => (
          <div key={s.symbol}>
            <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>{s.symbol} on Sui</div>
            <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {s.circulatingFormatted}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
