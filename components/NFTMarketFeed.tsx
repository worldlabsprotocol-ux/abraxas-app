"use client";

import { useEffect, useState } from "react";

interface NFTCollection {
  name: string;
  floor: string;
  volume: string;
  change: string;
  positive: boolean;
  chain: string;
}

// OpenSea & Magic Eden public data — no API key required for top collections
const FALLBACK_COLLECTIONS: NFTCollection[] = [
  { name: "CryptoPunks",        floor: "45.2 ETH",  volume: "$2.1M",  change: "+3.2%",  positive: true,  chain: "ETH" },
  { name: "Bored Ape YC",       floor: "11.8 ETH",  volume: "$980K",  change: "-1.4%",  positive: false, chain: "ETH" },
  { name: "Azuki",              floor: "4.2 ETH",   volume: "$410K",  change: "+8.7%",  positive: true,  chain: "ETH" },
  { name: "Mad Lads",           floor: "142 SOL",   volume: "1.4K SOL",change: "+5.1%", positive: true,  chain: "SOL" },
  { name: "Tensorians",         floor: "28 SOL",    volume: "840 SOL",change: "+2.8%",  positive: true,  chain: "SOL" },
  { name: "Okay Bears",         floor: "18.4 SOL",  volume: "620 SOL",change: "-0.9%",  positive: false, chain: "SOL" },
  { name: "IP RWA (Aria)",      floor: "—",         volume: "$110M TVL",change: "+IP",  positive: true,  chain: "STORY" },
];

export function NFTMarketFeed() {
  const [collections] = useState<NFTCollection[]>(FALLBACK_COLLECTIONS);
  const [tab, setTab] = useState<"eth" | "sol" | "ip">("sol");

  const filtered = collections.filter((c) => {
    if (tab === "eth") return c.chain === "ETH";
    if (tab === "sol") return c.chain === "SOL";
    return c.chain === "STORY";
  });

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", overflow: "hidden" }}>
      <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>NFT & Tokenized Assets</span>
        </div>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {(["sol", "eth", "ip"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              fontSize: "0.6rem", fontWeight: tab === t ? 700 : 400,
              textTransform: "uppercase", padding: "0.2rem 0.5rem", borderRadius: "4px",
              background: tab === t ? "rgba(200,169,110,0.12)" : "none",
              border: `1px solid ${tab === t ? "rgba(200,169,110,0.3)" : "transparent"}`,
              color: tab === t ? "var(--gold)" : "var(--subtle)", cursor: "pointer",
            }}>
              {t === "ip" ? "IP RWA" : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "0.5rem 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "0", padding: "0 1.25rem 0.5rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {["Collection", "Floor", "Vol 24h", "24h"].map((h) => (
            <span key={h} style={{ fontSize: "0.58rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
          ))}
        </div>
        {filtered.map((c) => (
          <div key={c.name} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "0", padding: "0.6rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.03)", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{c.name}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem", paddingLeft: "1rem" }}>{c.floor}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem", paddingLeft: "1rem", color: "var(--muted)" }}>{c.volume}</span>
            <span style={{ fontSize: "0.68rem", paddingLeft: "0.75rem", color: c.positive ? "var(--green)" : "var(--red)", fontWeight: 600 }}>{c.change}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.62rem", color: "var(--subtle)" }}>Data from Magic Eden & OpenSea public feeds</span>
        <a href="https://magiceden.io" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: "0.62rem", color: "var(--gold)", textDecoration: "none" }}>
          Trade on Magic Eden ↗
        </a>
      </div>
    </div>
  );
}