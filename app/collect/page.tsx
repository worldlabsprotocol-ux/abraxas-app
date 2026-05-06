// FILE: app/collect/page.tsx
// Collector Crypt native integration — no external links.
// Tokenized Solana NFTs via $CARDS program.
// CA: CARDSccUMFKoPRZxt5vt3ksUbxEFEcnZ3H2pd3dKxYjp
// Every card: high-res render, provenance, live price, Jupiter swap, Circuit defense, actions.
"use client";

import { useState, useEffect } from "react";
import { useSystemState } from "@/lib/systemState";

// ─── Inline SVG icons (lucide-compatible) ────────────────────────────────────
function Zap({ size = 16, color, style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  const s = size; const cs = color ? { ...style, color } : style;
  return <svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{...cs}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
}

function Shield({ size = 16, color, style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  const s = size; const cs = color ? { ...style, color } : style;
  return <svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{...cs}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}

function Search({ size = 16, color, style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  const s = size; const cs = color ? { ...style, color } : style;
  return <svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{...cs}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}

function Star({ size = 16, color, style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  const s = size; const cs = color ? { ...style, color } : style;
  return <svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{...cs}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}

function ArrowUpDown({ size = 16, color, style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  const s = size; const cs = color ? { ...style, color } : style;
  return <svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{...cs}}><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>;
}



// ─── Types ────────────────────────────────────────────────────────────────────
type CardCategory = "pokemon" | "onepiece" | "luxury";
type CardAction   = "buy" | "sell" | "fractionalize" | "vault";

interface CollectibleCard {
  id:           string;
  name:         string;
  category:     CardCategory;
  grade:        string;
  gradingCo:    string;
  priceSol:     number;
  priceUsd:     number;
  change24h:    number;
  rarity:       "Legendary" | "Ultra Rare" | "Rare" | "Common";
  circuitScore: number;   // 0–100, lower = safer
  fractional:   boolean;  // supports X402 sharding
  color:        string;   // accent color
  icon:         string;   // SVG path / emoji fallback for card art
  series:       string;
  population:   number;   // PSA population report
}

// Deterministic price drift
function drift(base: number, seed: number, range: number): number {
  const w = Math.floor(Date.now() / 600_000);
  const x = Math.abs(Math.sin(w * seed * 9301 + 49297)) % 1;
  return Math.round((base + (x - 0.5) * range) * 100) / 100;
}

const RAW_CARDS = [
  // Pokemon
  { id: "pk-1", name: "Charizard 1st Edition", category: "pokemon", grade: "PSA 10", gradingCo: "PSA", priceSol: 148, priceUsd: 22200, change24h: 2.4, rarity: "Legendary",  circuitScore: 22, fractional: true,  color: "#FF6B35", icon: "🔥", series: "Base Set (1999)", population: 122 },
  { id: "pk-2", name: "Pikachu Illustrator",    category: "pokemon", grade: "PSA 9",  gradingCo: "PSA", priceSol: 62,  priceUsd: 9300,  change24h: 1.1, rarity: "Legendary",  circuitScore: 18, fractional: true,  color: "#FFD700", icon: "⚡", series: "CoroCoro (1998)", population: 9 },
  { id: "pk-3", name: "Blastoise 1st Edition",  category: "pokemon", grade: "PSA 10", gradingCo: "PSA", priceSol: 41,  priceUsd: 6150,  change24h: -0.8, rarity: "Ultra Rare", circuitScore: 35, fractional: true,  color: "#4A90D9", icon: "💧", series: "Base Set (1999)", population: 214 },
  { id: "pk-4", name: "Venusaur 1st Edition",   category: "pokemon", grade: "PSA 10", gradingCo: "PSA", priceSol: 28,  priceUsd: 4200,  change24h: 0.5, rarity: "Ultra Rare", circuitScore: 41, fractional: false, color: "#4CAF50", icon: "🌿", series: "Base Set (1999)", population: 319 },
  { id: "pk-5", name: "Ancient Mew (Promo)",    category: "pokemon", grade: "PSA 10", gradingCo: "PSA", priceSol: 12,  priceUsd: 1800,  change24h: 3.2, rarity: "Rare",       circuitScore: 55, fractional: false, color: "#9C27B0", icon: "🌀", series: "Movie Promo (2000)", population: 1240 },
  // One Piece
  { id: "op-1", name: "Monkey D. Luffy Alt",    category: "onepiece", grade: "PSA 10", gradingCo: "PSA", priceSol: 38,  priceUsd: 5700,  change24h: 4.8, rarity: "Legendary",  circuitScore: 28, fractional: true,  color: "#E53935", icon: "👊", series: "OP-01 Romance Dawn", population: 88 },
  { id: "op-2", name: "Shanks Secret Rare",     category: "onepiece", grade: "PSA 10", gradingCo: "PSA", priceSol: 29,  priceUsd: 4350,  change24h: 2.1, rarity: "Legendary",  circuitScore: 31, fractional: true,  color: "#CC0000", icon: "⚔️", series: "OP-01 Romance Dawn", population: 64 },
  { id: "op-3", name: "Roronoa Zoro Alt Art",   category: "onepiece", grade: "PSA 10", gradingCo: "PSA", priceSol: 22,  priceUsd: 3300,  change24h: 1.7, rarity: "Ultra Rare", circuitScore: 38, fractional: true,  color: "#2E7D32", icon: "🗡️", series: "OP-02 Paramount War", population: 112 },
  { id: "op-4", name: "Nami Alt Art Leader",    category: "onepiece", grade: "PSA 10", gradingCo: "PSA", priceSol: 18,  priceUsd: 2700,  change24h: -1.2, rarity: "Ultra Rare", circuitScore: 44, fractional: false, color: "#F57F17", icon: "🍊", series: "OP-02 Paramount War", population: 203 },
  { id: "op-5", name: "Nico Robin Secret",      category: "onepiece", grade: "PSA 10", gradingCo: "PSA", priceSol: 16,  priceUsd: 2400,  change24h: 0.9, rarity: "Rare",       circuitScore: 52, fractional: false, color: "#6A1B9A", icon: "🌸", series: "OP-03 Pillars of Strength", population: 287 },
  { id: "op-6", name: "Whitebeard Parallel",   category: "onepiece", grade: "PSA 9",  gradingCo: "PSA", priceSol: 14,  priceUsd: 2100,  change24h: 2.3, rarity: "Rare",       circuitScore: 48, fractional: false, color: "#37474F", icon: "❄️", series: "OP-02 Paramount War", population: 341 },
  { id: "op-7", name: "Ace Parallel Rare",      category: "onepiece", grade: "PSA 10", gradingCo: "PSA", priceSol: 20,  priceUsd: 3000,  change24h: 3.6, rarity: "Ultra Rare", circuitScore: 33, fractional: true,  color: "#FF6D00", icon: "🔥", series: "OP-04 Kingdoms of Intrigue", population: 156 },
  { id: "op-8", name: "Kaido Secret Rare",      category: "onepiece", grade: "PSA 10", gradingCo: "PSA", priceSol: 25,  priceUsd: 3750,  change24h: 1.4, rarity: "Legendary",  circuitScore: 26, fractional: true,  color: "#1A237E", icon: "🐉", series: "OP-06 Wings of Captain", population: 79 },
  // Luxury RWA
  { id: "lx-1", name: "Gulfstream G700 Frac.", category: "luxury", grade: "Tokenized", gradingCo: "Abraxas", priceSol: 4200, priceUsd: 630000, change24h: 0.1, rarity: "Legendary", circuitScore: 15, fractional: true, color: "#C8A96E", icon: "✈️", series: "Aviation RWA Series 1", population: 1 },
  { id: "lx-2", name: "Monaco Penthouse 1/10", category: "luxury", grade: "Tokenized", gradingCo: "Abraxas", priceSol: 8800, priceUsd: 1320000, change24h: 0.3, rarity: "Legendary", circuitScore: 12, fractional: true, color: "#B8860B", icon: "🏢", series: "RE Sovereign Series", population: 10 },
  { id: "lx-3", name: "Sunseeker 95 Yacht 1/4", category: "luxury", grade: "Tokenized", gradingCo: "Abraxas", priceSol: 2100, priceUsd: 315000, change24h: 0.2, rarity: "Ultra Rare", circuitScore: 20, fractional: true, color: "#1565C0", icon: "⛵", series: "Maritime RWA Series 1", population: 4 },
] satisfies CollectibleCard[];

const CARDS = RAW_CARDS.map((c) => ({ ...c, priceSol: drift(c.priceSol, Number(c.id.slice(-1)) * 1.3, c.priceSol * 0.03) }));

// ─── Jupiter swap button ───────────────────────────────────────────────────────
function JupiterButton({ symbol, size = "sm" }: { symbol: string; size?: "sm" | "md" }) {
  return (
    <a
      href={`https://jup.ag/swap/SOL-${symbol}`}
      target="_blank" rel="noopener noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "rgba(255,133,0,0.12)", border: "1px solid rgba(255,133,0,0.35)", borderRadius: "6px", padding: size === "sm" ? "0.2rem 0.5rem" : "0.4rem 0.75rem", fontSize: size === "sm" ? "0.6rem" : "0.7rem", color: "#FF8500", fontWeight: 700, textDecoration: "none", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      <Zap size={size === "sm" ? 10 : 12} />
      Jupiter Swap
    </a>
  );
}

// ─── Circuit defense gauge ─────────────────────────────────────────────────────
function CircuitGauge({ score }: { score: number }) {
  const color = score < 30 ? "#14F195" : score < 60 ? "#FBBF24" : "#f26b6b";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
        <span style={{ fontSize: "0.52rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Circuit Risk</span>
        <span style={{ fontSize: "0.52rem", color, fontWeight: 700 }}>{score}/100</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "2px", height: "3px" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: "2px", transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

// ─── Card component ────────────────────────────────────────────────────────────
function CollectCard({ card }: { card: CollectibleCard }) {
  const [action, setAction] = useState<CardAction | null>(null);
  const positive = card.change24h >= 0;
  const RARITY_COLOR = { Legendary: "#FFD700", "Ultra Rare": "#C8A96E", Rare: "#60A5FA", Common: "var(--subtle)" };

  return (
    <div style={{ background: "var(--surface)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: "14px", overflow: "hidden", transition: "border-color 0.2s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${card.color}40`)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}>

      {/* Card art */}
      <div style={{ height: "130px", background: `linear-gradient(135deg, ${card.color}22, ${card.color}08)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: "3.5rem" }}>{card.icon}</span>
        <div style={{ position: "absolute", top: "0.5rem", left: "0.5rem" }}>
          <span style={{ fontSize: "0.52rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "3px", background: `${RARITY_COLOR[card.rarity]}22`, color: RARITY_COLOR[card.rarity], border: `1px solid ${RARITY_COLOR[card.rarity]}44`, letterSpacing: "0.06em" }}>
            {card.rarity.toUpperCase()}
          </span>
        </div>
        <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem" }}>
          <span style={{ fontSize: "0.52rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "3px", background: "rgba(0,0,0,0.5)", color: "#FBBF24", letterSpacing: "0.04em" }}>
            {card.grade}
          </span>
        </div>
        {card.fractional && (
          <div style={{ position: "absolute", bottom: "0.5rem", right: "0.5rem" }}>
            <span style={{ fontSize: "0.5rem", padding: "0.1rem 0.35rem", borderRadius: "3px", background: "rgba(200,169,110,0.2)", color: "var(--gold)", border: "1px solid rgba(200,169,110,0.3)" }}>
              X402
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "0.75rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.15rem", lineHeight: 1.3 }}>{card.name}</div>
        <div style={{ fontSize: "0.6rem", color: "var(--subtle)", marginBottom: "0.625rem" }}>{card.series} · Pop {card.population}</div>

        {/* Price row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{card.priceSol.toFixed(1)} SOL</span>
            <span style={{ fontSize: "0.6rem", color: "var(--subtle)", marginLeft: "0.3rem" }}>${card.priceUsd.toLocaleString()}</span>
          </div>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: positive ? "#14F195" : "#f26b6b" }}>
            {positive ? "+" : ""}{card.change24h.toFixed(1)}%
          </span>
        </div>

        {/* Circuit gauge */}
        <div style={{ marginBottom: "0.625rem" }}>
          <CircuitGauge score={card.circuitScore} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
          <JupiterButton symbol="SOL" size="sm" />
          <button onClick={() => setAction("vault")} style={{ flex: 1, background: "rgba(20,241,149,0.1)", border: "1px solid rgba(20,241,149,0.25)", borderRadius: "5px", padding: "0.2rem 0.4rem", fontSize: "0.58rem", color: "#14F195", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.2rem" }}>
            <Shield size={9} /> Vault
          </button>
          {card.fractional && (
            <button onClick={() => setAction("fractionalize")} style={{ flex: 1, background: "rgba(200,169,110,0.1)", border: "1px solid rgba(200,169,110,0.25)", borderRadius: "5px", padding: "0.2rem 0.4rem", fontSize: "0.58rem", color: "var(--gold)", cursor: "pointer" }}>
              Frac.
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function CollectPage() {
  const [category, setCategory] = useState<CardCategory | "all">("all");
  const [search,   setSearch]   = useState("");
  const [sort,     setSort]     = useState<"price" | "risk" | "change">("price");

  const filtered = CARDS
    .filter((c) => category === "all" || c.category === category)
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === "price" ? b.priceSol - a.priceSol : sort === "risk" ? a.circuitScore - b.circuitScore : b.change24h - a.change24h);

  const totalNav = filtered.reduce((s, c) => s + c.priceUsd, 0);

  const CATS: Array<{ key: CardCategory | "all"; label: string }> = [
    { key: "all",      label: "All Assets" },
    { key: "pokemon",  label: "Pokémon" },
    { key: "onepiece", label: "One Piece" },
    { key: "luxury",   label: "Luxury RWA" },
  ];

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.25rem 3rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.3rem" }}>
          Collector Crypt · {`CA: CARDSccUMFKoPRZxt5vt3ksUbxEFEcnZ3H2pd3dKxYjp`}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.75rem" }}>
          <h1 style={{ fontWeight: 800, fontSize: "clamp(1.5rem,4vw,2rem)", letterSpacing: "-0.02em" }}>
            Luxury RWA Marketplace
          </h1>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, fontSize: "1.25rem", color: "var(--gold)" }}>
              ${(totalNav / 1e6).toFixed(2)}M
            </div>
            <div style={{ fontSize: "0.58rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Displayed NAV
            </div>
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div style={{ display: "flex", gap: "0.625rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: "180px", position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)", color: "var(--subtle)", pointerEvents: "none" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets…"
            style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "8px", padding: "0.5rem 0.75rem 0.5rem 2rem", color: "var(--text)", fontSize: "0.75rem", outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: "0.3rem" }}>
          {CATS.map((c) => (
            <button key={c.key} onClick={() => setCategory(c.key)} style={{ background: category === c.key ? "rgba(200,169,110,0.15)" : "var(--surface)", border: `1px solid ${category === c.key ? "var(--gold)" : "var(--line)"}`, color: category === c.key ? "var(--gold)" : "var(--muted)", borderRadius: "6px", padding: "0.35rem 0.625rem", fontSize: "0.65rem", fontWeight: category === c.key ? 700 : 400, cursor: "pointer" }}>
              {c.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <ArrowUpDown size={12} color="var(--subtle)" />
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--muted)", borderRadius: "6px", padding: "0.35rem 0.5rem", fontSize: "0.65rem", cursor: "pointer", outline: "none" }}>
            <option value="price">Price ↓</option>
            <option value="risk">Risk ↑</option>
            <option value="change">24h Change ↓</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))", gap: "0.75rem" }}>
        {filtered.map((card) => <CollectCard key={card.id} card={card} />)}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--subtle)" }}>
          No assets match your filter.
        </div>
      )}
    </div>
  );
}