// FILE: components/TerminalArena.tsx
// Abraxas Sovereign Terminal — Sold Tape + Active Arena + Triple Triad Grid
// NO emojis. Full-color images only (no grayscale filter).
// Cards without images show name/data only — no placeholder icons.
// Collector Crypt link on every card for purchase flow.
// x402 ante visible on battle launch.
// Triple Triad: 3x3 board, card sides 0-9/A, flip on higher-number adjacency.
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ArenaAsset {
  id: string; name: string; category: string; ticker: string;
  grade: string; gradingCo: string; vaultLocation: string;
  priceUsd: number; last_sold_price: number; last_sold_source?: string;
  change24h: number; imagePath?: string | null; rarity: string;
  atk: number; def: number; speed: number;
  circuitScore: number; defenseLevel: string;
  protected: boolean; staked: boolean; apy?: number;
  quick_duel?: boolean; is_duel_eligible?: boolean;
  attributes?: { power_level: number; win_formula?: string };
  can_borrow?: boolean; ltv?: number;
  // Triple Triad sides derived from stats
  ttTop?: number; ttRight?: number; ttBottom?: number; ttLeft?: number;
}

interface SoldTick {
  id: string; name: string; price: number; category: string;
  source: string; ts: number; ticker: string;
}

type TTOwner = "player" | "agent" | null;
interface TTCell { asset: ArenaAsset | null; owner: TTOwner }
interface TTState {
  board: TTCell[];         // 9 cells
  playerHand: ArenaAsset[];
  agentHand: ArenaAsset[];
  phase: "select3" | "playing" | "done";
  turn: "player" | "agent";
  winner: "player" | "agent" | "draw" | null;
  abraEarned: number;
  log: string[];
}

// ─── Sophia Agents ────────────────────────────────────────────────────────────
const SOPHIA_AGENTS = [
  { id:"HED",  name:"Sophia-Hed",  role:"Hedge Strategist",  buff:"+20% DEF",    buffVal:20, color:"#14F195" },
  { id:"REB",  name:"Sophia-Reb",  role:"Rebalance Engine",  buff:"+15% ATK",    buffVal:15, color:"#6b8cff" },
  { id:"YLD",  name:"Sophia-Yld",  role:"Yield Optimizer",   buff:"+2x $ABRA",   buffVal:0,  color:"#C8A96E" },
  { id:"CGD",  name:"Sophia-Cgd",  role:"Circuit Guardian",  buff:"Shield -40%", buffVal:0,  color:"#a855f7" },
] as const;
type AgentId = typeof SOPHIA_AGENTS[number]["id"];

// ─── Category colors ──────────────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  Pokemon:"#FBBF24", "One Piece":"#f26b6b", Comics:"#a855f7",
  Metals:"#D4AF37", Stocks:"#14F195", Timepieces:"#C8A96E",
  Luxury:"#60A5FA", Sports:"#fb923c",
};

// ─── Triple Triad helpers ─────────────────────────────────────────────────────
// Map stats 0-100 to TT value 1-10 (A = 10)
function statToTT(v: number): number { return Math.max(1, Math.min(10, Math.round(v / 10))); }
function ttLabel(v: number): string  { return v === 10 ? "A" : String(v); }

function enrichTT(a: ArenaAsset): ArenaAsset {
  return {
    ...a,
    ttTop:    statToTT(a.def),
    ttRight:  statToTT(a.atk),
    ttBottom: statToTT(Math.round((a.atk + a.def) / 2)),
    ttLeft:   statToTT(a.speed),
  };
}

// Adjacency: cell → which (neighbor_cell, my_side, their_opposing_side)
const ADJACENCY: Record<number, Array<[number, "ttTop"|"ttRight"|"ttBottom"|"ttLeft", "ttTop"|"ttRight"|"ttBottom"|"ttLeft"]>> = {
  0:[[ 1,"ttRight","ttLeft"],[3,"ttBottom","ttTop"]],
  1:[[ 0,"ttLeft","ttRight"],[2,"ttRight","ttLeft"],[4,"ttBottom","ttTop"]],
  2:[[ 1,"ttLeft","ttRight"],[5,"ttBottom","ttTop"]],
  3:[[ 0,"ttTop","ttBottom"],[4,"ttRight","ttLeft"],[6,"ttBottom","ttTop"]],
  4:[[ 1,"ttTop","ttBottom"],[3,"ttLeft","ttRight"],[5,"ttRight","ttLeft"],[7,"ttBottom","ttTop"]],
  5:[[ 2,"ttTop","ttBottom"],[4,"ttLeft","ttRight"],[8,"ttBottom","ttTop"]],
  6:[[ 3,"ttTop","ttBottom"],[7,"ttRight","ttLeft"]],
  7:[[ 4,"ttTop","ttBottom"],[6,"ttLeft","ttRight"],[8,"ttRight","ttLeft"]],
  8:[[ 5,"ttTop","ttBottom"],[7,"ttLeft","ttRight"]],
};

function resolveFlips(board: TTCell[], idx: number, owner: TTOwner): TTCell[] {
  const next = board.map(c => ({ ...c }));
  const placed = next[idx];
  if (!placed.asset || !owner) return next;
  for (const [nIdx, mySide, theirSide] of ADJACENCY[idx]) {
    const neighbor = next[nIdx];
    if (!neighbor.asset || neighbor.owner === owner) continue;
    const myVal   = placed.asset[mySide] ?? 1;
    const theirVal = neighbor.asset[theirSide] ?? 1;
    if (myVal > theirVal) next[nIdx] = { ...neighbor, owner };
  }
  return next;
}

function countOwned(board: TTCell[], owner: TTOwner): number {
  return board.filter(c => c.owner === owner).length;
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function fmtUsd(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}
function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ─── Sold tape ────────────────────────────────────────────────────────────────
function buildSoldTape(assets: ArenaAsset[]): SoldTick[] {
  return assets
    .filter(a => a.last_sold_price > 0)
    .map(a => ({
      id: a.id, name: a.name, price: a.last_sold_price,
      category: a.category, source: a.last_sold_source ?? "Oracle",
      ts: Date.now() - Math.floor(Math.abs(Math.sin(a.id.length * 9301)) * 7_200_000),
      ticker: a.ticker,
    }))
    .sort((a, b) => b.price - a.price)
    .slice(0, 20);
}

function SoldTape({ ticks }: { ticks: SoldTick[] }) {
  if (!ticks.length) return null;
  return (
    <div style={{ position:"relative", height:"34px", background:"rgba(2,3,10,0.97)", borderBottom:"1px solid rgba(255,255,255,0.05)", overflow:"hidden", display:"flex", alignItems:"center" }}>
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:"72px", background:"linear-gradient(90deg,rgba(2,3,10,1) 60%,transparent)", zIndex:2, display:"flex", alignItems:"center", paddingLeft:"0.75rem" }}>
        <span style={{ fontSize:"0.48rem", fontWeight:900, color:"#14F195", letterSpacing:"0.16em", fontFamily:"'JetBrains Mono',monospace" }}>SOLD</span>
      </div>
      <div style={{ display:"flex", gap:"0", paddingLeft:"80px", animation:"ticker 55s linear infinite", whiteSpace:"nowrap" }}>
        {[...ticks, ...ticks].map((t, i) => (
          <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:"0.35rem", padding:"0 1.25rem", borderRight:"1px solid rgba(255,255,255,0.05)", fontSize:"0.56rem", fontFamily:"'JetBrains Mono',monospace", color:"rgba(255,255,255,0.65)" }}>
            <span style={{ color: CAT_COLOR[t.category] ?? "#fff", fontWeight:700 }}>{t.ticker}</span>
            <span style={{ color:"#f0f0f0", fontVariantNumeric:"tabular-nums", fontWeight:700 }}>{fmtUsd(t.price)}</span>
            <span style={{ color:"rgba(255,255,255,0.28)", fontSize:"0.48rem" }}>{t.source} · {timeAgo(t.ts)}</span>
          </span>
        ))}
      </div>
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:"50px", background:"linear-gradient(270deg,rgba(2,3,10,1) 40%,transparent)", zIndex:2 }} />
    </div>
  );
}

// ─── Asset image — full color, no grayscale, text-only fallback ───────────────
function AssetImage({ asset, height = 140 }: { asset: ArenaAsset; height?: number }) {
  const [err, setErr] = useState(false);
  const src = asset.imagePath;
  const catColor = CAT_COLOR[asset.category] ?? "#6b8cff";

  if (!src || err) {
    // Text-only fallback — no icons, no emojis
    return (
      <div style={{ height, background:`linear-gradient(135deg,${catColor}14,rgba(6,8,16,0.98))`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"0.35rem", padding:"0.5rem" }}>
        <span style={{ fontSize:"0.52rem", fontWeight:700, color:catColor, letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace", textAlign:"center" }}>
          {asset.category}
        </span>
        <span style={{ fontSize:"0.68rem", fontWeight:800, color:"#f0f0f0", textAlign:"center", lineHeight:1.25, padding:"0 0.25rem" }}>
          {asset.name}
        </span>
        <span style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>
          {asset.grade}
        </span>
      </div>
    );
  }

  return (
    <div style={{ position:"relative", height, background:"rgba(6,8,16,0.98)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={asset.name}
        onError={() => setErr(true)}
        style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }}
        loading="lazy"
      />
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"45%", background:"linear-gradient(to top,rgba(6,8,16,0.92),transparent)", pointerEvents:"none" }} />
    </div>
  );
}

// ─── Triple Triad side values display ─────────────────────────────────────────
function TTSides({ asset, size = "sm" }: { asset: ArenaAsset; size?: "sm" | "lg" }) {
  const fs    = size === "lg" ? "0.7rem" : "0.52rem";
  const color = CAT_COLOR[asset.category] ?? "#6b8cff";
  const w     = size === "lg" ? "20px" : "16px";
  const h     = size === "lg" ? "20px" : "16px";
  const top    = asset.ttTop    ?? 1;
  const right  = asset.ttRight  ?? 1;
  const bottom = asset.ttBottom ?? 1;
  const left   = asset.ttLeft   ?? 1;

  const box = (v: number) => (
    <div style={{ width:w, height:h, display:"flex", alignItems:"center", justifyContent:"center", background:`${color}22`, border:`1px solid ${color}44`, borderRadius:"3px", fontSize:fs, fontWeight:900, fontFamily:"'JetBrains Mono',monospace", color }}>
      {ttLabel(v)}
    </div>
  );

  return (
    <div style={{ display:"grid", gridTemplateColumns:`${w} ${w} ${w}`, gridTemplateRows:`${h} ${h} ${h}`, gap:"2px", width:`calc(${w} * 3 + 4px)` }}>
      <div/>{box(top)}<div/>
      {box(left)}<div style={{ background:"rgba(255,255,255,0.03)", borderRadius:"2px", display:"flex", alignItems:"center", justifyContent:"center" }} />{box(right)}
      <div/>{box(bottom)}<div/>
    </div>
  );
}

// ─── Arena card ───────────────────────────────────────────────────────────────
interface CardProps {
  asset: ArenaAsset; selected?: boolean; flipped?: boolean;
  owner?: TTOwner; onSelect?: (a: ArenaAsset) => void; compact?: boolean;
}

function ArenaCard({ asset, selected, flipped, owner, onSelect, compact }: CardProps) {
  const [flip, setFlip] = useState(false);
  const catColor = CAT_COLOR[asset.category] ?? "#6b8cff";
  const imgH     = compact ? 100 : 150;

  const borderColor = owner === "player" ? "#14F195"
                    : owner === "agent"  ? "#f26b6b"
                    : selected           ? "#D4AF37"
                    : catColor + "33";

  return (
    <div
      onClick={() => { onSelect?.(asset); if (!compact) setFlip(f => !f); }}
      style={{
        position:"relative", borderRadius:"12px", overflow:"hidden",
        background:"rgba(6,8,16,0.97)",
        border:`1px solid ${borderColor}`,
        boxShadow: selected ? `0 0 18px ${catColor}22` : owner ? `0 0 12px ${borderColor}44` : "none",
        cursor: onSelect ? "pointer" : "default",
        transition:"border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {/* Auth badge */}
      {asset.protected && (
        <div style={{ position:"absolute", top:"0.35rem", right:"0.35rem", zIndex:4, display:"flex", alignItems:"center", gap:"0.2rem", padding:"0.08rem 0.3rem", borderRadius:"3px", background:"rgba(212,175,55,0.15)", border:"1px solid rgba(212,175,55,0.4)" }}>
          <span style={{ width:"4px", height:"4px", borderRadius:"50%", background:"#D4AF37", animation:"pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize:"0.4rem", fontWeight:700, color:"#D4AF37", letterSpacing:"0.08em", fontFamily:"'JetBrains Mono',monospace" }}>AUTH</span>
        </div>
      )}

      {/* Owner indicator */}
      {owner && (
        <div style={{ position:"absolute", top:"0.35rem", left:"0.35rem", zIndex:4, width:"8px", height:"8px", borderRadius:"50%", background:owner==="player"?"#14F195":"#f26b6b", boxShadow:`0 0 6px ${owner==="player"?"#14F195":"#f26b6b"}` }} />
      )}

      {/* Image */}
      <div style={{ position:"relative" }}>
        <AssetImage asset={asset} height={imgH} />
      </div>

      {/* Card info */}
      <div style={{ padding:"0.45rem 0.5rem" }}>
        <div style={{ fontWeight:800, fontSize:"0.72rem", color:"#f0f0f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:"1px" }}>
          {asset.name}
        </div>
        <div style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.32)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"0.3rem" }}>
          {asset.grade} · {asset.category}
        </div>

        {!compact && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"0.3rem" }}>
              <span style={{ fontWeight:800, fontSize:"0.82rem", fontVariantNumeric:"tabular-nums", fontFamily:"'JetBrains Mono',monospace" }}>
                {fmtUsd(asset.priceUsd)}
              </span>
              <span style={{ fontSize:"0.52rem", fontWeight:700, color: asset.change24h >= 0 ? "#14F195" : "#f26b6b", fontVariantNumeric:"tabular-nums" }}>
                {asset.change24h >= 0 ? "+" : ""}{asset.change24h?.toFixed(2)}%
              </span>
            </div>

            {/* TT sides */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <TTSides asset={asset} />
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.28)", fontFamily:"'JetBrains Mono',monospace" }}>LAST SOLD</div>
                <div style={{ fontSize:"0.6rem", fontWeight:700, color:"#D4AF37", fontVariantNumeric:"tabular-nums", fontFamily:"'JetBrains Mono',monospace" }}>
                  {fmtUsd(asset.last_sold_price)}
                </div>
              </div>
            </div>

            {/* Power bar */}
            {asset.attributes?.power_level && (
              <div style={{ marginTop:"0.3rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.42rem", color:"rgba(255,255,255,0.28)", marginBottom:"1px", fontFamily:"'JetBrains Mono',monospace" }}>
                  <span>PWR</span>
                  <span style={{ color:catColor, fontWeight:700 }}>{asset.attributes.power_level}</span>
                </div>
                <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"1px", height:"2px" }}>
                  <div style={{ width:`${asset.attributes.power_level}%`, height:"100%", background:catColor, borderRadius:"1px" }} />
                </div>
              </div>
            )}

            {/* CTAs */}
            <div style={{ display:"flex", gap:"0.25rem", marginTop:"0.4rem" }}>
              <a href="https://gacha.collectorcrypt.com/#pokemon" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{
                flex:1, padding:"0.3rem 0.2rem", borderRadius:"5px", fontSize:"0.5rem", fontWeight:700,
                background:"rgba(200,169,110,0.1)", border:"1px solid rgba(200,169,110,0.25)",
                color:"#C8A96E", cursor:"pointer", textAlign:"center", textDecoration:"none",
                fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.03em",
                display:"block",
              }}>
                Acquire
              </a>

            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Triple Triad board ────────────────────────────────────────────────────────
function TripleTriadBoard({ tt, onPlace }: { tt: TTState; onPlace: (idx: number) => void }) {
  const playerScore = countOwned(tt.board, "player");
  const agentScore  = countOwned(tt.board, "agent");

  return (
    <div>
      {/* Score header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.625rem" }}>
        <div style={{ textAlign:"left" }}>
          <div style={{ fontSize:"0.48rem", color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>YOUR SCORE</div>
          <div style={{ fontSize:"1.1rem", fontWeight:900, color:"#14F195", fontVariantNumeric:"tabular-nums", fontFamily:"'JetBrains Mono',monospace" }}>{playerScore}</div>
        </div>
        <div style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace" }}>
          {tt.turn === "player" ? "YOUR TURN" : "SOPHIA THINKING"}
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:"0.48rem", color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>SOPHIA</div>
          <div style={{ fontSize:"1.1rem", fontWeight:900, color:"#f26b6b", fontVariantNumeric:"tabular-nums", fontFamily:"'JetBrains Mono',monospace" }}>{agentScore}</div>
        </div>
      </div>

      {/* 3x3 grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"3px", background:"rgba(255,255,255,0.06)", padding:"3px", borderRadius:"10px", marginBottom:"0.75rem" }}>
        {tt.board.map((cell, idx) => {
          const occupied = !!cell.asset;
          const color = cell.owner === "player" ? "#14F195" : cell.owner === "agent" ? "#f26b6b" : "transparent";
          return (
            <div key={idx}
              onClick={() => !occupied && tt.turn === "player" && onPlace(idx)}
              style={{
                height:"110px", borderRadius:"7px", overflow:"hidden",
                background: occupied ? "rgba(6,8,16,0.97)" : "rgba(2,3,10,0.7)",
                border:`2px solid ${occupied ? color : "rgba(255,255,255,0.06)"}`,
                cursor: !occupied && tt.turn === "player" ? "pointer" : "default",
                position:"relative", transition:"border-color 0.2s",
              }}>
              {cell.asset ? (
                <>
                  <AssetImage asset={cell.asset} height={60} />
                  <div style={{ padding:"0.2rem 0.3rem" }}>
                    <div style={{ fontSize:"0.46rem", fontWeight:700, color:"#f0f0f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cell.asset.name}</div>
                    <div style={{ marginTop:"2px" }}><TTSides asset={cell.asset} size="sm" /></div>
                  </div>
                  {/* Owner color overlay */}
                  <div style={{ position:"absolute", inset:0, background:`${color}12`, pointerEvents:"none" }} />
                </>
              ) : (
                <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.12)", fontFamily:"'JetBrains Mono',monospace" }}>
                    {tt.turn === "player" ? "[ ]" : "..."}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hands */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
        <div>
          <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.28)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"0.25rem" }}>YOUR HAND ({tt.playerHand.length})</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.25rem" }}>
            {tt.playerHand.map(a => (
              <div key={a.id} style={{ padding:"0.25rem 0.4rem", background:"rgba(20,241,149,0.06)", border:"1px solid rgba(20,241,149,0.18)", borderRadius:"5px", fontSize:"0.5rem", fontFamily:"'JetBrains Mono',monospace", color:"#14F195", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {a.name}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.28)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"0.25rem" }}>SOPHIA HAND ({tt.agentHand.length})</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.25rem" }}>
            {tt.agentHand.map(a => (
              <div key={a.id} style={{ padding:"0.25rem 0.4rem", background:"rgba(242,107,107,0.06)", border:"1px solid rgba(242,107,107,0.18)", borderRadius:"5px", fontSize:"0.5rem", fontFamily:"'JetBrains Mono',monospace", color:"#f26b6b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {a.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tokenization CTA panel ────────────────────────────────────────────────────
function TokenizeCTA() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom:"1.25rem", padding:"0.875rem 1rem", background:"rgba(107,140,255,0.06)", border:"1px solid rgba(107,140,255,0.15)", borderRadius:"12px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <div style={{ fontWeight:800, fontSize:"0.85rem", color:"#f0f0f0", marginBottom:"2px" }}>Tokenize Your Assets</div>
          <div style={{ fontSize:"0.58rem", color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>
            Luxury watches · Real estate · Stocks · Memorabilia · Collectibles
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)} style={{ padding:"0.4rem 0.875rem", borderRadius:"7px", background:"rgba(107,140,255,0.14)", border:"1px solid rgba(107,140,255,0.3)", color:"#6b8cff", fontSize:"0.65rem", fontWeight:700, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>
          {open ? "Close" : "How It Works"}
        </button>
      </div>
      {open && (
        <div style={{ marginTop:"0.875rem", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:"0.5rem" }}>
          {[
            { label:"Luxury Watch",  desc:"Rolex, Patek Philippe. Vault in DE or OR. 65% LTV borrow." },
            { label:"Real Estate",   desc:"Fractional ownership via SPV. On-chain deed certificate." },
            { label:"Stocks",        desc:"Tokenized equity via verified custodian. 70% LTV borrow." },
            { label:"Memorabilia",   desc:"PSA/BGS graded cards, comics, signed items. Full provenance." },
            { label:"Precious Metals",desc:"1oz gold/silver. LBMA certified. Stored in vault. Yield-bearing." },
          ].map(item => (
            <div key={item.label} style={{ padding:"0.625rem 0.75rem", background:"rgba(6,8,16,0.95)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"8px" }}>
              <div style={{ fontWeight:700, fontSize:"0.7rem", color:"#f0f0f0", marginBottom:"3px" }}>{item.label}</div>
              <div style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.38)", lineHeight:1.5 }}>{item.desc}</div>
            </div>
          ))}
          <div style={{ padding:"0.625rem 0.75rem", background:"rgba(200,169,110,0.07)", border:"1px solid rgba(200,169,110,0.2)", borderRadius:"8px", display:"flex", flexDirection:"column", justifyContent:"center", gap:"0.3rem" }}>
            <div style={{ fontWeight:700, fontSize:"0.65rem", color:"#C8A96E" }}>Start Tokenizing</div>
            <a href="https://twitter.com/worldlabsprotocol" target="_blank" rel="noopener noreferrer" style={{ fontSize:"0.52rem", color:"rgba(200,169,110,0.7)", textDecoration:"none", fontFamily:"'JetBrains Mono',monospace" }}>
              DM @worldlabsprotocol
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stocks data panel ─────────────────────────────────────────────────────────
function StockPanel({ assets }: { assets: ArenaAsset[] }) {
  const stocks = assets.filter(a => a.category === "Stocks");
  if (!stocks.length) return null;
  return (
    <div style={{ marginBottom:"1.25rem", padding:"0.875rem 1rem", background:"rgba(20,241,149,0.04)", border:"1px solid rgba(20,241,149,0.12)", borderRadius:"12px" }}>
      <div style={{ fontWeight:800, fontSize:"0.78rem", color:"#14F195", marginBottom:"0.625rem", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.06em" }}>
        TOKENIZED EQUITY · NASDAQ ON-CHAIN
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"0.5rem" }}>
        {stocks.map(s => (
          <div key={s.id} style={{ padding:"0.625rem 0.75rem", background:"rgba(6,8,16,0.97)", border:"1px solid rgba(20,241,149,0.12)", borderRadius:"8px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.375rem" }}>
              <div>
                <div style={{ fontWeight:800, fontSize:"0.75rem", color:"#14F195", fontFamily:"'JetBrains Mono',monospace" }}>{s.ticker}</div>
                <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.35)" }}>{s.name}</div>
              </div>
              <AssetImage asset={s} height={36} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
              <span style={{ fontWeight:800, fontSize:"0.85rem", fontVariantNumeric:"tabular-nums", fontFamily:"'JetBrains Mono',monospace" }}>${s.priceUsd.toFixed(2)}</span>
              <span style={{ fontSize:"0.56rem", fontWeight:700, color:s.change24h>=0?"#14F195":"#f26b6b", fontVariantNumeric:"tabular-nums" }}>
                {s.change24h>=0?"+":""}{s.change24h.toFixed(2)}%
              </span>
            </div>
            {s.can_borrow && s.ltv && (
              <div style={{ marginTop:"0.35rem", fontSize:"0.46rem", color:"rgba(20,241,149,0.6)", fontFamily:"'JetBrains Mono',monospace" }}>
                Borrow up to ${(s.priceUsd * s.ltv).toFixed(0)} USDC · {Math.round(s.ltv * 100)}% LTV
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop:"0.625rem", fontSize:"0.5rem", color:"rgba(255,255,255,0.28)", fontFamily:"'JetBrains Mono',monospace" }}>
        Tokenized equities are held via verified custodian. On-chain transfer via Token-2022. LTV borrow available in Vaults.
      </div>
    </div>
  );
}

// ─── x402 ante indicator ──────────────────────────────────────────────────────
function X402Ante({ token = "SOL" }: { token?: string }) {
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:"0.35rem", padding:"0.2rem 0.5rem", borderRadius:"4px", background:"rgba(96,165,250,0.08)", border:"1px solid rgba(96,165,250,0.2)" }}>
      <span style={{ width:"5px", height:"5px", borderRadius:"50%", background:"#60A5FA" }} />
      <span style={{ fontSize:"0.48rem", color:"#60A5FA", fontFamily:"'JetBrains Mono',monospace", fontWeight:700, letterSpacing:"0.06em" }}>x402 ANTE</span>
      <span style={{ fontSize:"0.46rem", color:"rgba(96,165,250,0.7)", fontFamily:"'JetBrains Mono',monospace" }}>0.001 {token}</span>
    </div>
  );
}

// ─── Main Arena ────────────────────────────────────────────────────────────────
function ActiveArena({ assets }: { assets: ArenaAsset[] }) {
  const [filter,        setFilter]        = useState<string>("all");
  const [selectedAgent, setSelectedAgent] = useState<typeof SOPHIA_AGENTS[number]>(SOPHIA_AGENTS[0]);
  const [selected3,     setSelected3]     = useState<string[]>([]);
  const [pinkSlips,     setPinkSlips]     = useState(false);
  const [wagerToken,    setWagerToken]    = useState<"SOL"|"USDC"|"ABX">("SOL");
  const [tt, setTT]                       = useState<TTState | null>(null);
  const [boardLog, setBoardLog]           = useState<string[]>([]);

  const allCats = ["all", ...Array.from(new Set(assets.map(a => a.category)))];
  const shown   = assets.filter(a => filter === "all" || a.category === filter);

  // Toggle selection for TT (max 3)
  const toggleSelect = useCallback((id: string) => {
    if (tt) return;
    setSelected3(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3)  return prev;
      return [...prev, id];
    });
  }, [tt]);

  // Launch Triple Triad
  function launchTT() {
    if (selected3.length !== 3) return;
    const playerHand  = selected3.map(id => enrichTT(assets.find(a => a.id === id)!));
    const remaining   = assets.filter(a => !selected3.includes(a.id));
    // Agent picks 3 highest power
    const agentHand   = remaining
      .sort((a, b) => (b.attributes?.power_level ?? 0) - (a.attributes?.power_level ?? 0))
      .slice(0, 3)
      .map(enrichTT);

    setTT({
      board:      Array(9).fill(null).map(() => ({ asset:null, owner:null })),
      playerHand, agentHand,
      phase: "playing", turn:"player",
      winner:null, abraEarned:0, log:[
        `[TT] Game started. Pink Slips: ${pinkSlips ? "ON" : "OFF"}`,
        `[x402] Ante: 0.001 ${wagerToken} deducted`,
        `[SOPHIA] ${selectedAgent.name} equipped — ${selectedAgent.buff}`,
      ],
    });
    setBoardLog([]);
  }

  // Player places a card
  async function playerPlace(cellIdx: number) {
    if (!tt || tt.turn !== "player" || tt.board[cellIdx].asset) return;
    if (!tt.playerHand.length) return;
    const card  = tt.playerHand[0]; // always play first card in hand
    const newBoard = resolveFlips(
      tt.board.map((c, i) => i === cellIdx ? { asset:card, owner:"player" as TTOwner } : c),
      cellIdx, "player"
    );
    const newHand = tt.playerHand.slice(1);
    const log = [...tt.log, `[YOU]  ${card.name} placed at [${cellIdx}]`];
    const allFilled = newBoard.every(c => !!c.asset) && !newHand.length && !tt.agentHand.length;

    if (allFilled || (!newHand.length && !tt.agentHand.length)) {
      const ps = countOwned(newBoard, "player");
      const as = countOwned(newBoard, "agent");
      const winner: "player"|"agent"|"draw" = ps > as ? "player" : as > ps ? "agent" : "draw";
      const earned = winner === "player" ? Math.round((tt.playerHand.length + 1) * 50) : 0;
      setTT({ ...tt, board:newBoard, playerHand:newHand, turn:"player", phase:"done", winner, abraEarned:earned, log:[...log, `[TT] Game over. You: ${ps} | Sophia: ${as} — ${winner.toUpperCase()}`] });
      return;
    }

    setTT({ ...tt, board:newBoard, playerHand:newHand, turn:"agent", log });

    // Agent plays after delay
    setTimeout(() => {
      setTT(prev => {
        if (!prev || prev.turn !== "agent" || !prev.agentHand.length) return prev;
        const agCard = prev.agentHand[0];
        // Agent picks first empty cell
        const emptyIdx = prev.board.findIndex(c => !c.asset);
        if (emptyIdx === -1) return prev;
        const b2 = resolveFlips(
          prev.board.map((c, i) => i === emptyIdx ? { asset:agCard, owner:"agent" as TTOwner } : c),
          emptyIdx, "agent"
        );
        const agHand2 = prev.agentHand.slice(1);
        const log2    = [...prev.log, `[SOPHIA] ${agCard.name} placed at [${emptyIdx}]`];
        const done2   = b2.every(c => !!c.asset) && !prev.playerHand.length && !agHand2.length;
        if (done2) {
          const ps2 = countOwned(b2,"player"); const as2 = countOwned(b2,"agent");
          const w2: "player"|"agent"|"draw" = ps2>as2?"player":as2>ps2?"agent":"draw";
          const e2 = w2==="player" ? Math.round(prev.playerHand.length * 50) : 0;
          return { ...prev, board:b2, agentHand:agHand2, turn:"player", phase:"done", winner:w2, abraEarned:e2, log:[...log2, `[TT] Final. You: ${ps2} | Sophia: ${as2} — ${w2.toUpperCase()}`] };
        }
        return { ...prev, board:b2, agentHand:agHand2, turn:"player", log:log2 };
      });
    }, 900);
  }

  return (
    <div>
      {/* Category filter row */}
      <div style={{ display:"flex", gap:"0.25rem", marginBottom:"1rem", flexWrap:"wrap", alignItems:"center" }}>
        {allCats.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} style={{
            padding:"0.25rem 0.5rem", borderRadius:"4px", fontSize:"0.58rem", fontWeight:filter===cat?700:400,
            border:`1px solid ${filter===cat?(CAT_COLOR[cat]??"#6b8cff"):"rgba(255,255,255,0.07)"}`,
            background:filter===cat?`${CAT_COLOR[cat]??"#6b8cff"}14`:"transparent",
            color:filter===cat?(CAT_COLOR[cat]??"#6b8cff"):"rgba(255,255,255,0.38)",
            cursor:"pointer", textTransform:"capitalize",
          }}>{cat==="all"?"All":cat}</button>
        ))}
      </div>

      {/* TT setup panel */}
      {!tt ? (
        <div style={{ padding:"0.875rem 1rem", background:"rgba(6,8,16,0.97)", border:"1px solid rgba(255,107,53,0.2)", borderRadius:"12px", marginBottom:"1.25rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"0.75rem", marginBottom:"0.75rem" }}>
            <div>
              <div style={{ fontWeight:800, fontSize:"0.85rem", marginBottom:"2px" }}>Triple Triad Arena</div>
              <div style={{ fontSize:"0.54rem", color:"rgba(255,255,255,0.38)", fontFamily:"'JetBrains Mono',monospace" }}>
                Select 3 cards below · Place on 3x3 board · Higher side flips opponent · Most owned wins
              </div>
              {selected3.length > 0 && (
                <div style={{ marginTop:"0.35rem", fontSize:"0.52rem", color:"#D4AF37", fontFamily:"'JetBrains Mono',monospace" }}>
                  {selected3.length}/3 selected
                </div>
              )}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
              {/* Agent selector */}
              <div style={{ display:"flex", gap:"0.25rem", flexWrap:"wrap" }}>
                {SOPHIA_AGENTS.map(a => (
                  <button key={a.id} onClick={() => setSelectedAgent(a)} style={{
                    padding:"0.2rem 0.45rem", borderRadius:"4px", fontSize:"0.48rem", fontWeight:selectedAgent.id===a.id?700:400,
                    border:`1px solid ${selectedAgent.id===a.id?a.color+"55":"rgba(255,255,255,0.07)"}`,
                    background:selectedAgent.id===a.id?`${a.color}18`:"transparent",
                    color:selectedAgent.id===a.id?a.color:"rgba(255,255,255,0.38)",
                    cursor:"pointer", fontFamily:"'JetBrains Mono',monospace",
                  }}>
                    {a.name}
                  </button>
                ))}
              </div>
              {/* Wager token */}
              <div style={{ display:"flex", gap:"0.25rem", alignItems:"center" }}>
                <X402Ante token={wagerToken} />
                {(["SOL","USDC","ABX"] as const).map(t => (
                  <button key={t} onClick={() => setWagerToken(t)} style={{
                    padding:"0.18rem 0.4rem", borderRadius:"3px", fontSize:"0.46rem", fontWeight:wagerToken===t?700:400,
                    border:`1px solid ${wagerToken===t?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.08)"}`,
                    background:wagerToken===t?"rgba(255,255,255,0.08)":"transparent",
                    color:wagerToken===t?"#f0f0f0":"rgba(255,255,255,0.3)",
                    cursor:"pointer", fontFamily:"'JetBrains Mono',monospace",
                  }}>{t}</button>
                ))}
              </div>
              {/* Pink slips */}
              <div style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
                <button onClick={() => setPinkSlips(p => !p)} style={{ width:"28px", height:"16px", borderRadius:"100px", border:"none", cursor:"pointer", background:pinkSlips?"#f26b6b":"rgba(255,255,255,0.1)", position:"relative", flexShrink:0, transition:"background 0.2s" }}>
                  <span style={{ position:"absolute", top:"1px", left:pinkSlips?"13px":"1px", width:"14px", height:"14px", borderRadius:"50%", background:"#fff", transition:"left 0.2s", display:"block" }} />
                </button>
                <span style={{ fontSize:"0.5rem", color:pinkSlips?"#f26b6b":"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace", fontWeight:pinkSlips?700:400 }}>
                  Pink Slips {pinkSlips?"ON — winner claims flipped card metadata":"OFF"}
                </span>
              </div>
            </div>
          </div>

          <button onClick={launchTT} disabled={selected3.length !== 3} style={{
            padding:"0.5rem 1.25rem", borderRadius:"8px", border:"none", fontWeight:800, fontSize:"0.75rem",
            fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em", cursor:selected3.length===3?"pointer":"not-allowed",
            background:selected3.length===3?"linear-gradient(135deg,#D4AF37,#FF6B35)":"rgba(255,255,255,0.05)",
            color:selected3.length===3?"#000":"rgba(255,255,255,0.2)",
            boxShadow:selected3.length===3?"0 0 20px rgba(212,175,55,0.3)":"none",
          }}>
            {selected3.length===3 ? "Launch Triple Triad" : `Select ${3-selected3.length} more card${3-selected3.length!==1?"s":""}`}
          </button>
        </div>
      ) : (
        <div style={{ marginBottom:"1.25rem" }}>
          {/* Active TT board */}
          {tt.phase !== "done" ? (
            <div style={{ padding:"1rem", background:"rgba(6,8,16,0.97)", border:"1px solid rgba(255,107,53,0.2)", borderRadius:"12px" }}>
              <TripleTriadBoard tt={tt} onPlace={playerPlace} />
              {/* Log */}
              <div style={{ marginTop:"0.625rem", background:"rgba(2,3,10,0.97)", border:"1px solid rgba(107,140,255,0.1)", borderRadius:"7px", padding:"0.4rem 0.625rem", maxHeight:"80px", overflowY:"auto", fontFamily:"'JetBrains Mono',monospace" }}>
                {tt.log.slice(-6).map((l, i) => (
                  <p key={i} style={{ margin:"0 0 0.18rem", fontSize:"0.52rem", color:`rgba(96,165,250,${Math.max(0.2,0.9-i*0.1)})`, lineHeight:1.4 }}>{l}</p>
                ))}
              </div>
            </div>
          ) : (
            // Result
            <div style={{ padding:"1rem", background:"rgba(6,8,16,0.97)", border:`1px solid ${tt.winner==="player"?"rgba(20,241,149,0.3)":"rgba(242,107,107,0.3)"}`, borderRadius:"12px", textAlign:"center" }}>
              <div style={{ fontWeight:900, fontSize:"1.4rem", color:tt.winner==="player"?"#14F195":tt.winner==="draw"?"#FBBF24":"#f26b6b", letterSpacing:"-0.02em", marginBottom:"0.4rem" }}>
                {tt.winner==="player"?"VICTORY":tt.winner==="draw"?"DRAW":"DEFEATED"}
              </div>
              {tt.abraEarned > 0 && (
                <div style={{ fontSize:"0.72rem", fontWeight:700, color:"#D4AF37", fontFamily:"'JetBrains Mono',monospace", marginBottom:"0.5rem" }}>
                  +{tt.abraEarned} $ABRA earned
                </div>
              )}
              {pinkSlips && tt.winner === "player" && (
                <div style={{ fontSize:"0.58rem", color:"#f26b6b", fontFamily:"'JetBrains Mono',monospace", marginBottom:"0.5rem" }}>
                  Pink Slips: flipped card metadata transferred to your vault
                </div>
              )}
              <button onClick={() => { setTT(null); setSelected3([]); }} style={{ padding:"0.4rem 0.875rem", borderRadius:"7px", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.5)", fontSize:"0.62rem", fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>
                Play Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Card grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,185px),1fr))", gap:"0.75rem" }}>
        {shown.map(a => (
          <ArenaCard key={a.id} asset={a}
            selected={selected3.includes(a.id)}
            onSelect={!tt ? () => toggleSelect(a.id) : undefined}
          />
        ))}
        {shown.length === 0 && (
          <div style={{ gridColumn:"1/-1", padding:"2.5rem", textAlign:"center", fontSize:"0.62rem", color:"rgba(255,255,255,0.2)", fontFamily:"'JetBrains Mono',monospace" }}>
            NO ASSETS IN THIS CATEGORY
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skeletons ─────────────────────────────────────────────────────────────────
export function TerminalArenaSkeleton() {
  return (
    <div>
      <div style={{ height:"34px", background:"rgba(2,3,10,0.97)", borderBottom:"1px solid rgba(255,255,255,0.05)", animation:"pulse 1.5s ease-in-out infinite" }} />
      <div style={{ padding:"1.25rem" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))", gap:"0.75rem" }}>
          {Array.from({length:8}).map((_,i) => (
            <div key={i} style={{ height:340, borderRadius:"12px", background:"rgba(6,8,16,0.97)", border:"1px solid rgba(255,255,255,0.04)", animation:`pulse ${1.3+i*0.08}s ease-in-out infinite` }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function TerminalArena() {
  const [assets, setAssets] = useState<ArenaAsset[]>([]);
  const [ticks,  setTicks]  = useState<SoldTick[]>([]);
  const [loading, setLoading]  = useState(true);
  const [error,   setError]    = useState<string|null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res  = await fetch("/api/cards");
        const data = await res.json();
        if (!cancelled && data.ok) {
          setAssets(data.assets);
          setTicks(buildSoldTape(data.assets));
        }
      } catch { if (!cancelled) setError("Oracle unavailable — /api/cards"); }
      finally  { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <TerminalArenaSkeleton />;

  return (
    <div>
      <style>{`
        @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.45} }
      `}</style>
      {error && (
        <div style={{ padding:"0.5rem 1rem", background:"rgba(242,107,107,0.07)", fontSize:"0.56rem", color:"#f26b6b", fontFamily:"'JetBrains Mono',monospace" }}>
          [ORACLE ERROR] {error}
        </div>
      )}
      <SoldTape ticks={ticks} />
      <div style={{ padding:"1.25rem" }}>
        <TokenizeCTA />
        <StockPanel assets={assets} />
        <ActiveArena assets={assets} />
      </div>
    </div>
  );
}