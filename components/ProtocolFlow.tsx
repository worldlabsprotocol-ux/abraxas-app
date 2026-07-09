// FILE: components/ProtocolFlow.tsx
// Protocol flow visualization. VERIFY → TOKENIZE → COLLATERALIZE → BORROW → ONCHAIN CREDIT
// Institutional, animated, mobile-responsive.
"use client";

import { useState, useEffect } from "react";

const MONO = "'JetBrains Mono',monospace";

const STEPS = [
  {
    id:    "verify",
    label: "VERIFY",
    icon:  "◉",
    color: "#14F195",
    desc:  "Partner authentication anchors asset provenance on Solana",
    metric:{ label:"Verification time", value:"48h avg" },
  },
  {
    id:    "tokenize",
    label: "TOKENIZE",
    icon:  "◈",
    color: "#C8A96E",
    desc:  "Token-2022 certificate minted. immutable proof of ownership",
    metric:{ label:"Mint cost", value:"100–500 ABRA" },
  },
  {
    id:    "collateralize",
    label: "COLLATERALIZE",
    icon:  "◆",
    color: "#6b8cff",
    desc:  "Verified certificate becomes borrowable collateral, LTV assigned",
    metric:{ label:"Max LTV", value:"Up to 80%" },
  },
  {
    id:    "borrow",
    label: "BORROW",
    icon:  "⬡",
    color: "#a855f7",
    desc:  "Draw USDC against collateral via Loopscale lending rails",
    metric:{ label:"Rate", value:"Market-indexed" },
  },
  {
    id:    "credit",
    label: "ONCHAIN CREDIT",
    icon:  "◎",
    color: "#f0f0f0",
    desc:  "Persistent credit history builds on-chain reputation",
    metric:{ label:"Credit score", value:"AAS-1 standard" },
  },
] as const;

// Metrics sourced from Supabase + on-chain. "Pending Sync" until env vars set
const METRICS = [
  { label:"Total Assets Verified",    value:"Pending Sync", tag:"LIVE" },
  { label:"Active Certificates",      value:"Pending Sync", tag:"CHAIN" },
  { label:"Avg Collateral Score",     value:"Pending Sync", tag:"RISK" },
  { label:"USDC Borrowing Capacity",  value:"Pending Sync", tag:"LEND" },
  { label:"Protocol Fees Collected",  value:"Pending Sync", tag:"ABRA" },
];

export function ProtocolFlow({ onStartTokenize }: { onStartTokenize?: () => void }) {
  const [active, setActive] = useState(0);
  const [tick,   setTick]   = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 80);
    return () => clearInterval(t);
  }, []);

  // Auto-advance active step
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % STEPS.length), 2200);
    return () => clearInterval(t);
  }, []);

  const step = STEPS[active];

  return (
    <div style={{ width:"100%", marginBottom:"2rem" }}>
      {/* ── Protocol flow headline ───────────────────────────────────── */}
      <div style={{ textAlign:"center", marginBottom:"2rem" }}>
        <div style={{ fontSize:"0.38rem", fontWeight:700, color:"rgba(20,241,149,0.5)",
                      fontFamily:MONO, textTransform:"uppercase", letterSpacing:"0.2em",
                      marginBottom:"0.75rem" }}>
          How Abraxas Works
        </div>
        <h2 style={{ fontSize:"clamp(1.4rem, 4vw, 2.4rem)", fontWeight:900,
                     color:"#f0f0f0", margin:"0 0 0.5rem",
                     letterSpacing:"-0.02em", lineHeight:1.1 }}>
          Real Assets → On-Chain Credit
        </h2>
        <p style={{ fontSize:"clamp(0.52rem, 1.4vw, 0.72rem)",
                    color:"rgba(255,255,255,0.35)", maxWidth:520,
                    margin:"0 auto", lineHeight:1.7 }}>
          Abraxas is the verification and collateralization layer between the
          physical world and Solana DeFi lending markets.
        </p>
      </div>

      {/* ── Flow steps ───────────────────────────────────────────────── */}
      <div style={{
        display:"flex", alignItems:"stretch", justifyContent:"center",
        gap:0, marginBottom:"1.5rem",
        flexWrap:"nowrap", overflowX:"auto",
      }}>
        {STEPS.map((s, i) => {
          const isActive = i === active;
          return (
            <div key={s.id} style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
              {/* Step block */}
              <button
                onClick={() => setActive(i)}
                style={{
                  padding:"1rem 0.875rem",
                  borderRadius:"8px",
                  border:`1px solid ${isActive ? s.color : "rgba(255,255,255,0.07)"}`,
                  background: isActive ? `${s.color}12` : "rgba(255,255,255,0.02)",
                  cursor:"pointer", transition:"all 0.3s ease",
                  minWidth:110, textAlign:"center",
                }}>
                <div style={{ fontSize:"1.2rem", color: isActive ? s.color : "rgba(255,255,255,0.2)",
                               marginBottom:"0.4rem", transition:"all 0.3s" }}>
                  {s.icon}
                </div>
                <div style={{ fontSize:"0.4rem", fontWeight:900, color: isActive ? s.color : "rgba(255,255,255,0.25)",
                               fontFamily:MONO, letterSpacing:"0.12em",
                               textTransform:"uppercase", marginBottom:"0.25rem" }}>
                  {s.label}
                </div>
                {isActive && (
                  <div style={{ fontSize:"0.36rem", color:`${s.color}80`,
                                 fontFamily:MONO }}>{s.metric.value}</div>
                )}
              </button>

              {/* Arrow connector */}
              {i < STEPS.length - 1 && (
                <div style={{
                  fontSize:"0.6rem", color:"rgba(255,255,255,0.12)",
                  margin:"0 2px", flexShrink:0,
                }}>→</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Active step description ──────────────────────────────────── */}
      <div style={{
        padding:"1.25rem 1.5rem",
        borderRadius:"8px",
        border:`1px solid ${step.color}25`,
        background:`${step.color}08`,
        marginBottom:"1.5rem",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        flexWrap:"wrap", gap:"0.75rem",
      }}>
        <div>
          <div style={{ fontSize:"0.42rem", fontWeight:700, color:step.color,
                         fontFamily:MONO, textTransform:"uppercase",
                         letterSpacing:"0.1em", marginBottom:"0.3rem" }}>
            {step.label}
          </div>
          <p style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.5)",
                       margin:0, lineHeight:1.65, maxWidth:460 }}>
            {step.desc}
          </p>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontSize:"0.36rem", color:"rgba(255,255,255,0.2)",
                         fontFamily:MONO, textTransform:"uppercase",
                         letterSpacing:"0.1em" }}>
            {step.metric.label}
          </div>
          <div style={{ fontSize:"1rem", fontWeight:900, color:step.color,
                         fontFamily:MONO }}>
            {step.metric.value}
          </div>
        </div>
      </div>

      {/* ── Live protocol metrics ─────────────────────────────────────── */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))",
        gap:"0.5rem", marginBottom:"1.5rem",
      }}>
        {METRICS.map(m => (
          <div key={m.label} style={{
            padding:"0.75rem 0.875rem", borderRadius:"7px",
            border:"1px solid rgba(255,255,255,0.06)",
            background:"rgba(255,255,255,0.02)",
          }}>
            <div style={{ fontSize:"0.36rem", color:"rgba(255,255,255,0.25)",
                           fontFamily:MONO, textTransform:"uppercase",
                           letterSpacing:"0.1em", marginBottom:"0.25rem" }}>
              {m.label}
            </div>
            <div style={{ fontSize:"0.8rem", fontWeight:900, color:"#f0f0f0",
                           fontFamily:MONO }}>{m.value}</div>
            <div style={{ fontSize:"0.3rem", fontWeight:700, color:"rgba(20,241,149,0.4)",
                           fontFamily:MONO, letterSpacing:"0.1em", marginTop:"0.15rem" }}>
              {m.tag}
            </div>
          </div>
        ))}
      </div>

      {/* ── Primary CTA ──────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
        <button
          onClick={onStartTokenize}
          style={{
            flex:1, minWidth:200,
            padding:"1rem 2rem", borderRadius:"7px", border:"none",
            cursor:"pointer", fontWeight:900, fontSize:"0.72rem",
            fontFamily:MONO, letterSpacing:"0.04em",
            background:"linear-gradient(135deg, #7c3aed, #C8A96E)",
            color:"#fff", transition:"all 0.2s",
          }}>
          Begin Asset Tokenization →
        </button>
        <a href="#borrow" style={{
          flex:1, minWidth:200,
          padding:"1rem 2rem", borderRadius:"7px", textAlign:"center",
          border:"1px solid rgba(107,140,255,0.3)", cursor:"pointer",
          fontWeight:800, fontSize:"0.66rem", fontFamily:MONO,
          letterSpacing:"0.04em",
          background:"rgba(107,140,255,0.06)",
          color:"rgba(107,140,255,0.8)", textDecoration:"none",
          transition:"all 0.2s",
        }}>
          Borrow Against Collateral →
        </a>
      </div>
    </div>
  );
}
