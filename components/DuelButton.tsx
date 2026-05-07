// FILE: components/DuelButton.tsx
// High-fidelity Duel button with wager modal.
// Wager tokens: SOL | USDC | ABX
// Pink Slips mode: loser forfeits RWA metadata to winner's inventory
// Win formula: (grade*0.4) + (log10(last_sold)*0.4) + (circuit_buff*0.2)
// is_vault_locked assets can duel but show stake-risk warning
"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type WagerToken = "SOL" | "USDC" | "ABX";

export interface DuelAsset {
  id:              string;
  name:            string;
  is_duel_eligible:boolean;
  is_vault_locked: boolean;
  attributes: {
    power_level:    number;
    liquidity_score:number;
    win_formula:    string;
  };
  last_sold_price?: number;
  circuitScore:     number;
  grade:            string;
  category:         string;
  insuranceUsd:     number;
}

interface DuelButtonProps {
  asset:     DuelAsset;
  onDuel?:  (asset: DuelAsset, wager: number, token: WagerToken, pinkSlips: boolean) => void;
  compact?:  boolean;
}

// ─── Win probability display ───────────────────────────────────────────────────
function WinProbBar({ power }: { power: number }) {
  const color = power >= 80 ? "#14F195" : power >= 60 ? "#FBBF24" : "#f26b6b";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.48rem", color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "2px" }}>
        <span>Power Level</span>
        <span style={{ color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{power}/100</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "2px", height: "3px" }}>
        <div style={{ width: `${power}%`, height: "100%", background: `linear-gradient(90deg,${color}88,${color})`, borderRadius: "2px", transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

// ─── Token selector ────────────────────────────────────────────────────────────
const TOKENS: { id: WagerToken; label: string; color: string; icon: string }[] = [
  { id:"SOL",  label:"SOL",  color:"#9945FF", icon:"◎" },
  { id:"USDC", label:"USDC", color:"#2775CA", icon:"$" },
  { id:"ABX",  label:"ABX",  color:"#C8A96E", icon:"⬡" },
];

// ─── Main component ────────────────────────────────────────────────────────────
export function DuelButton({ asset, onDuel, compact = false }: DuelButtonProps) {
  const [open,      setOpen]      = useState(false);
  const [token,     setToken]     = useState<WagerToken>("SOL");
  const [wager,     setWager]     = useState(0.5);
  const [pinkSlips, setPinkSlips] = useState(false);
  const [confirming,setConfirming]= useState(false);

  if (!asset.is_duel_eligible) return null;

  const locked   = asset.is_vault_locked;
  const power    = asset.attributes.power_level;
  const fmtWager = wager.toFixed(2);

  function handleConfirm() {
    setConfirming(true);
    setTimeout(() => {
      setConfirming(false);
      setOpen(false);
      onDuel?.(asset, wager, token, pinkSlips);
    }, 800);
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          width:         compact ? "auto" : "100%",
          padding:       compact ? "0.3rem 0.6rem" : "0.4rem 0.6rem",
          borderRadius:  "7px",
          fontSize:      compact ? "0.55rem" : "0.6rem",
          fontWeight:    700,
          fontFamily:    "'JetBrains Mono',monospace",
          letterSpacing: "0.04em",
          background:    locked ? "rgba(251,191,36,0.1)" : "rgba(255,107,53,0.12)",
          border:        `1px solid ${locked ? "rgba(251,191,36,0.3)" : "rgba(255,107,53,0.3)"}`,
          color:         locked ? "#FBBF24" : "#FF6B35",
          cursor:        "pointer",
          display:       "flex",
          alignItems:    "center",
          justifyContent:"center",
          gap:           "0.3rem",
        }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><line x1="13" y1="19" x2="19" y2="13"/>
          <line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/>
        </svg>
        {locked ? "Duel (Staked)" : "Duel"}
      </button>

      {/* Wager modal */}
      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.85)", backdropFilter:"blur(12px)", padding:"1rem" }}>
          <div style={{ width:"100%", maxWidth:"420px", background:"rgba(6,8,16,0.99)", border:"1px solid rgba(255,107,53,0.25)", borderRadius:"16px", overflow:"hidden" }}>

            {/* Header */}
            <div style={{ padding:"1rem", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"rgba(255,107,53,0.06)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <p style={{ fontSize:"0.5rem", letterSpacing:"0.16em", textTransform:"uppercase", color:"rgba(255,107,53,0.7)", fontFamily:"'JetBrains Mono',monospace", margin:"0 0 0.2rem" }}>
                    Duel Configuration
                  </p>
                  <h3 style={{ fontWeight:800, fontSize:"0.95rem", margin:0, color:"#f0f0f0" }}>{asset.name}</h3>
                </div>
                <button onClick={() => setOpen(false)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:"1.2rem", padding:"0.25rem" }}>✕</button>
              </div>
            </div>

            <div style={{ padding:"1rem" }}>
              {/* Vault lock warning */}
              {locked && (
                <div style={{ padding:"0.5rem 0.75rem", background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.25)", borderRadius:"7px", marginBottom:"0.875rem" }}>
                  <p style={{ fontSize:"0.58rem", color:"#FBBF24", fontFamily:"'JetBrains Mono',monospace", margin:0, lineHeight:1.5 }}>
                    [VAULT LOCK] This asset is staked. Dueling while staked interrupts yield accrual. Proceeds to arena at your risk.
                  </p>
                </div>
              )}

              {/* Power level */}
              <div style={{ marginBottom:"0.875rem" }}>
                <WinProbBar power={power} />
                <p style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", margin:"0.3rem 0 0" }}>
                  {asset.attributes.win_formula}
                </p>
              </div>

              {/* Token selector */}
              <div style={{ marginBottom:"0.875rem" }}>
                <p style={{ fontSize:"0.5rem", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"'JetBrains Mono',monospace", marginBottom:"0.375rem" }}>
                  Wager Token
                </p>
                <div style={{ display:"flex", gap:"0.4rem" }}>
                  {TOKENS.map(t => (
                    <button key={t.id} onClick={() => setToken(t.id)} style={{
                      flex:1, padding:"0.45rem 0.3rem", borderRadius:"8px", fontWeight:700, fontSize:"0.7rem",
                      fontFamily:"'JetBrains Mono',monospace", cursor:"pointer",
                      background: token === t.id ? `${t.color}18` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${token === t.id ? t.color+"55" : "rgba(255,255,255,0.08)"}`,
                      color: token === t.id ? t.color : "rgba(255,255,255,0.4)",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:"0.3rem",
                    }}>
                      <span>{t.icon}</span>{t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wager amount */}
              <div style={{ marginBottom:"0.875rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.375rem" }}>
                  <p style={{ fontSize:"0.5rem", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"'JetBrains Mono',monospace", margin:0 }}>
                    Wager Amount
                  </p>
                  <span style={{ fontSize:"0.72rem", fontWeight:800, fontFamily:"'JetBrains Mono',monospace", fontVariantNumeric:"tabular-nums",
                    color: TOKENS.find(t=>t.id===token)?.color }}>
                    {fmtWager} {token}
                  </span>
                </div>
                <input type="range" min={0.1} max={10} step={0.1} value={wager}
                  onChange={e => setWager(Number(e.target.value))}
                  style={{ width:"100%", accentColor: TOKENS.find(t=>t.id===token)?.color, cursor:"pointer" }}
                />
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.46rem", color:"rgba(255,255,255,0.2)", fontFamily:"'JetBrains Mono',monospace", marginTop:"2px" }}>
                  <span>0.1</span><span>10.0</span>
                </div>
              </div>

              {/* Pink Slips toggle */}
              <div style={{ padding:"0.625rem 0.75rem", background:"rgba(242,107,107,0.06)", border:`1px solid ${pinkSlips ? "rgba(242,107,107,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius:"8px", marginBottom:"0.875rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: pinkSlips ? "0.4rem" : 0 }}>
                  <div>
                    <p style={{ fontSize:"0.6rem", fontWeight:700, color: pinkSlips ? "#f26b6b" : "rgba(255,255,255,0.5)", fontFamily:"'JetBrains Mono',monospace", margin:"0 0 1px" }}>
                      Pink Slips Mode
                    </p>
                    <p style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.3)", margin:0 }}>
                      Loser forfeits RWA metadata to winner
                    </p>
                  </div>
                  <button onClick={() => setPinkSlips(p => !p)} style={{
                    width:"36px", height:"20px", borderRadius:"100px", border:"none", cursor:"pointer",
                    background: pinkSlips ? "#f26b6b" : "rgba(255,255,255,0.1)",
                    position:"relative", flexShrink:0, transition:"background 0.2s",
                  }}>
                    <span style={{
                      position:"absolute", top:"2px", left: pinkSlips ? "18px" : "2px",
                      width:"16px", height:"16px", borderRadius:"50%", background:"#fff",
                      transition:"left 0.2s", display:"block",
                    }} />
                  </button>
                </div>
                {pinkSlips && (
                  <p style={{ fontSize:"0.52rem", color:"rgba(242,107,107,0.8)", fontFamily:"'JetBrains Mono',monospace", margin:0, lineHeight:1.5 }}>
                    WARNING: Entering Pink Slips mode may result in the permanent loss of your physical asset's digital representation. This action is irreversible.
                  </p>
                )}
              </div>

              {/* x402 ante notice */}
              <div style={{ padding:"0.4rem 0.625rem", background:"rgba(107,140,255,0.06)", border:"1px solid rgba(107,140,255,0.15)", borderRadius:"6px", marginBottom:"0.875rem" }}>
                <p style={{ fontSize:"0.5rem", color:"rgba(107,140,255,0.7)", fontFamily:"'JetBrains Mono',monospace", margin:0 }}>
                  [x402] Agentic entry fee: 0.001 {token} — paid on-chain via Abraxas Payment Middleware
                </p>
              </div>

              {/* Confirm button */}
              <button onClick={handleConfirm} disabled={confirming} style={{
                width:"100%", padding:"0.7rem", borderRadius:"10px", border:"none",
                fontWeight:800, fontSize:"0.82rem", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em",
                cursor: confirming ? "not-allowed" : "pointer",
                background: pinkSlips
                  ? "linear-gradient(135deg,#f26b6b,#FF6B35)"
                  : "linear-gradient(135deg,#D4AF37,#FF6B35)",
                color: "#000",
                boxShadow: `0 0 20px ${pinkSlips ? "rgba(242,107,107,0.35)" : "rgba(212,175,55,0.3)"}`,
                opacity: confirming ? 0.7 : 1,
              }}>
                {confirming ? "Entering arena…" : `${pinkSlips ? "⚠ Pink Slips" : "⚔"} Wager ${fmtWager} ${token}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}