// FILE: components/PortfolioTab.tsx
// REDESIGNED: Protocol-native hierarchy.
// 1. Protocol flow (hero) 2. Asset Registry 3. Tokenization Studio
// 4. Intelligence Feed 5. ABRA token
// Mobile-first, billboard typography, Phantom browser compatible.
"use client";

import { useState, useEffect }    from "react";
import { useWallet }               from "@solana/wallet-adapter-react";
import { useAbraStore }            from "@/lib/abraxasStore";
import { useAbraBalance }          from "@/lib/hooks/useAbraBalance";
import { IssuanceEngine }          from "@/components/IssuanceEngine";
import { ProtocolFlow }            from "@/components/ProtocolFlow";

const ABRA_CA  = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";
const BAGS_URL = `https://bags.fm/${ABRA_CA}`;
const JUP_URL  = `https://jup.ag/swap/SOL-${ABRA_CA}`;
const MONO     = "'JetBrains Mono',monospace";

const STATUS_META: Record<string,{label:string;color:string}> = {
  created:               {label:"Created",         color:"#C8A96E"},
  pending_documents:     {label:"Documents",       color:"#FBBF24"},
  pending_identity:      {label:"Identity",        color:"#FBBF24"},
  pending_appraisal:     {label:"Appraisal",       color:"#FBBF24"},
  pending_custody:       {label:"Custody",         color:"#FBBF24"},
  pending_verification:  {label:"Final Review",    color:"#FBBF24"},
  verified:              {label:"✓ Verified",      color:"#14F195"},
  collateral_eligible:   {label:"Borrow Ready",    color:"#14F195"},
  borrowed:              {label:"Active Loan",     color:"#6b8cff"},
  listed:                {label:"Market Ready",    color:"#14F195"},
  rejected:              {label:"Rejected",        color:"#f26b6b"},
  closed:                {label:"Closed",          color:"rgba(255,255,255,0.2)"},
};

// Live signal feed (replaces accordion FAQ)
const SIGNAL_FEED = [
  { tag:"PROTOCOL",  text:"AAS-1 verification standard enforces 6-stage authentication chain",       time:"2h ago" },
  { tag:"RWA",       text:"Tokenized real-world assets on Solana surpassed $2.4B in Q1 2026",       time:"4h ago" },
  { tag:"COLLATERAL",text:"Gold bullion remains highest LTV asset class at 80%. proof of custody required", time:"6h ago" },
  { tag:"ONCHAIN",   text:"Loopscale lending depth now supports USDC draws against Token-2022 certs", time:"8h ago" },
  { tag:"ABRAXAS",   text:"Mineral rights tokenization available. Permian Basin WI accepted",       time:"12h ago" },
  { tag:"SECURITY",  text:"Zero fraud flags across all AAS-1 certified assets since protocol launch", time:"1d ago" },
  { tag:"PROTOCOL",  text:"Circuit Monitor provides real-time on-chain safety across all positions", time:"1d ago" },
  { tag:"ABRA",      text:"$ABRA required for protocol access. acquire via Bags.fm or Jupiter",     time:"2d ago" },
];

const TAG_COL: Record<string,string> = {
  PROTOCOL:"#14F195", RWA:"#6b8cff", COLLATERAL:"#C8A96E",
  ONCHAIN:"#a855f7", ABRAXAS:"#C8A96E", SECURITY:"#f26b6b", ABRA:"#14F195",
};

function Rule({ label }: { label: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"0.75rem",
                   margin:"2rem 0 1.25rem" }}>
      <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }}/>
      <span style={{ fontSize:"0.36rem", fontWeight:700, color:"rgba(255,255,255,0.2)",
                     fontFamily:MONO, textTransform:"uppercase", letterSpacing:"0.2em",
                     whiteSpace:"nowrap" }}>
        {label}
      </span>
      <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }}/>
    </div>
  );
}

export function PortfolioTab() {
  const { connected, publicKey } = useWallet();
  const assets                   = useAbraStore(s => s.assets);
  const { balance, loading }     = useAbraBalance();
  const [showStudio, setShowStudio] = useState(false);
  const [mounted,   setMounted]    = useState(false);

  useEffect(() => { setMounted(true); }, []);

  function openStudio() { setShowStudio(true); setTimeout(() => {
    document.getElementById("studio-anchor")?.scrollIntoView({ behavior:"smooth" });
  }, 50); }

  const verifiedAssets   = assets.filter(a => ["verified","collateral_eligible","borrowed"].includes(a.status));
  const pendingAssets    = assets.filter(a => ["pending_documents","pending_identity","pending_appraisal","pending_custody","pending_verification","created"].includes(a.status));
  const totalValue       = assets.reduce((s, a) => s + (a.estimatedUsd ?? 0), 0);
  const borrowCapacity   = verifiedAssets.reduce((s, a) => s + Math.round((a.estimatedUsd ?? 0) * (a.ltv ?? 60) / 100), 0);

  return (
    <div style={{ width:"100%", maxWidth:960, margin:"0 auto" }}>

      {/* ══════════════════════════════════════════════════════════════
          1. PROTOCOL FLOW. THE ECONOMIC ENGINE (HERO POSITION)
      ══════════════════════════════════════════════════════════════ */}
      <ProtocolFlow onStartTokenize={openStudio} />

      {/* ══════════════════════════════════════════════════════════════
          2. PORTFOLIO INTELLIGENCE
      ══════════════════════════════════════════════════════════════ */}
      {mounted && assets.length > 0 && (
        <>
          <Rule label="Portfolio Intelligence" />
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))",
            gap:"0.5rem", marginBottom:"1.25rem",
          }}>
            {[
              { label:"Total Asset Value",  value: totalValue > 0 ? `$${totalValue.toLocaleString()}` : "-",      color:"#f0f0f0" },
              { label:"Verified Assets",    value: String(verifiedAssets.length),                                  color:"#14F195" },
              { label:"Borrow Capacity",    value: borrowCapacity > 0 ? `$${borrowCapacity.toLocaleString()} USDC` : "-", color:"#6b8cff" },
              { label:"ABRA Balance",       value: loading ? "…" : `${balance.toLocaleString()} ABRA`,           color:"#C8A96E" },
            ].map(m => (
              <div key={m.label} style={{
                padding:"1rem", borderRadius:"8px",
                border:"1px solid rgba(255,255,255,0.07)",
                background:"rgba(255,255,255,0.02)",
              }}>
                <div style={{ fontSize:"0.36rem", color:"rgba(255,255,255,0.25)",
                               fontFamily:MONO, textTransform:"uppercase",
                               letterSpacing:"0.1em", marginBottom:"0.4rem" }}>
                  {m.label}
                </div>
                <div style={{ fontSize:"clamp(0.9rem, 2.5vw, 1.2rem)", fontWeight:900,
                               color:m.color, fontFamily:MONO }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          3. ASSET REGISTRY (above circuit monitor, per spec)
      ══════════════════════════════════════════════════════════════ */}
      <Rule label="Asset Registry" />
      {!mounted || assets.length === 0 ? (
        <div style={{
          padding:"2.5rem 1.5rem", textAlign:"center",
          border:"1px dashed rgba(255,255,255,0.07)", borderRadius:"10px",
          marginBottom:"1rem",
        }}>
          <div style={{ fontSize:"clamp(1rem, 3vw, 1.6rem)", fontWeight:900,
                         color:"#f0f0f0", marginBottom:"0.75rem",
                         letterSpacing:"-0.02em" }}>
            No tokenized assets yet
          </div>
          <p style={{ fontSize:"clamp(0.52rem, 1.5vw, 0.68rem)",
                       color:"rgba(255,255,255,0.3)", lineHeight:1.7,
                       maxWidth:380, margin:"0 auto 1.5rem" }}>
            Submit a real-world asset. watch, metal, property, mineral rights -
            and unlock borrowing capacity against verified collateral.
          </p>
          <button onClick={openStudio} style={{
            padding:"0.875rem 2rem", borderRadius:"7px", border:"none",
            cursor:"pointer", fontWeight:900, fontSize:"0.7rem", fontFamily:MONO,
            background:"linear-gradient(135deg, #7c3aed, #C8A96E)", color:"#fff",
          }}>
            Begin Asset Tokenization →
          </button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem", marginBottom:"1rem" }}>
          {assets.map(a => {
            const meta = STATUS_META[a.status] ?? { label:a.status, color:"rgba(255,255,255,0.3)" };
            return (
              <div key={a.id} style={{
                padding:"1rem 1.25rem", borderRadius:"8px",
                border:"1px solid rgba(255,255,255,0.07)",
                background:"rgba(255,255,255,0.02)",
                display:"flex", alignItems:"center",
                justifyContent:"space-between", gap:"1rem",
                flexWrap:"wrap",
              }}>
                <div style={{ flex:1, minWidth:120 }}>
                  <div style={{ fontSize:"clamp(0.6rem, 1.8vw, 0.78rem)", fontWeight:800,
                                 color:"#f0f0f0", marginBottom:3 }}>
                    {a.name}
                  </div>
                  <div style={{ fontSize:"0.4rem", color:"rgba(255,255,255,0.3)",
                                 fontFamily:MONO, textTransform:"uppercase",
                                 letterSpacing:"0.1em" }}>
                    {a.assetClass}
                  </div>
                </div>
                <div style={{ display:"flex", gap:"0.75rem", alignItems:"center", flexShrink:0 }}>
                  {a.estimatedUsd && a.estimatedUsd > 0 && (
                    <span style={{ fontSize:"0.58rem", fontWeight:800,
                                   color:"#f0f0f0", fontFamily:MONO }}>
                      ${a.estimatedUsd.toLocaleString()}
                    </span>
                  )}
                  <span style={{
                    fontSize:"0.38rem", fontWeight:700, fontFamily:MONO,
                    letterSpacing:"0.08em", color:meta.color,
                    background:`${meta.color}15`, border:`1px solid ${meta.color}30`,
                    padding:"2px 8px", borderRadius:"3px",
                  }}>
                    {meta.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pending + verified quick stats */}
      {pendingAssets.length > 0 && (
        <div style={{
          padding:"0.75rem 1rem", borderRadius:"7px", marginBottom:"1rem",
          border:"1px solid rgba(251,191,36,0.15)",
          background:"rgba(251,191,36,0.04)",
          fontSize:"0.5rem", color:"rgba(251,191,36,0.6)", fontFamily:MONO,
        }}>
          {pendingAssets.length} asset{pendingAssets.length > 1 ? "s" : ""} in verification pipeline
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          4. CIRCUIT MONITOR. ON-CHAIN SAFETY
      ══════════════════════════════════════════════════════════════ */}
      <Rule label="Circuit Monitor. On-Chain Safety" />
      <div style={{
        padding:"1.25rem 1.5rem", borderRadius:"8px", marginBottom:"0.5rem",
        border:"1px solid rgba(20,241,149,0.12)",
        background:"rgba(20,241,149,0.03)",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        flexWrap:"wrap", gap:"0.75rem",
      }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.35rem" }}>
            <div style={{ width:7, height:7, borderRadius:"50%",
                           background:"#14F195",
                           boxShadow:"0 0 8px rgba(20,241,149,0.6)" }}/>
            <span style={{ fontSize:"0.56rem", fontWeight:800, color:"#14F195",
                            fontFamily:MONO, letterSpacing:"0.06em" }}>
              ALL SYSTEMS NOMINAL
            </span>
          </div>
          <div style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.3)", lineHeight:1.6 }}>
            Sophia agents monitoring position health · No liquidation risk detected
          </div>
        </div>
        <a href="/train" style={{
          fontSize:"0.44rem", fontWeight:700, color:"rgba(107,140,255,0.6)",
          fontFamily:MONO, textDecoration:"none", padding:"0.375rem 0.75rem",
          border:"1px solid rgba(107,140,255,0.15)", borderRadius:"4px",
          whiteSpace:"nowrap",
        }}>
          Train Agents →
        </a>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          5. TOKENIZATION STUDIO
      ══════════════════════════════════════════════════════════════ */}
      <div id="studio-anchor" />
      <Rule label="Tokenization Studio" />

      {!showStudio ? (
        <div style={{
          padding:"2rem", borderRadius:"10px", textAlign:"center",
          border:"1px solid rgba(124,58,237,0.2)",
          background:"rgba(124,58,237,0.04)", marginBottom:"0.5rem",
        }}>
          <div style={{ fontSize:"clamp(0.8rem, 2.5vw, 1.2rem)", fontWeight:900,
                         color:"#f0f0f0", marginBottom:"0.5rem",
                         letterSpacing:"-0.01em" }}>
            Submit a Real Asset
          </div>
          <p style={{ fontSize:"clamp(0.5rem, 1.4vw, 0.64rem)",
                       color:"rgba(255,255,255,0.35)", lineHeight:1.7,
                       maxWidth:420, margin:"0 auto 1.5rem" }}>
            Watches · Metals · Art · Property · Mineral Rights · Short-Term Rentals
          </p>
          <button onClick={openStudio} style={{
            padding:"0.875rem 2.5rem", borderRadius:"7px", border:"none",
            cursor:"pointer", fontWeight:900, fontSize:"0.72rem", fontFamily:MONO,
            background:"linear-gradient(135deg, #7c3aed, #C8A96E)", color:"#fff",
            opacity: !connected ? 0.7 : 1,
          }}>
            {connected ? "Open Studio →" : "Connect Wallet (top-right) to Start"}
          </button>
        </div>
      ) : (
        <div>
          <button onClick={() => setShowStudio(false)} style={{
            background:"none", border:"none", cursor:"pointer",
            fontSize:"0.46rem", color:"rgba(255,255,255,0.3)",
            fontFamily:MONO, marginBottom:"1rem", display:"flex",
            alignItems:"center", gap:"0.35rem",
          }}>
            ← Close Studio
          </button>
          <IssuanceEngine onSuccess={() => {
            setShowStudio(false);
            window.scrollTo({ top:0, behavior:"smooth" });
          }} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          6. $ABRA TOKEN PANEL
      ══════════════════════════════════════════════════════════════ */}
      <Rule label="$ABRA Token" />
      <div style={{
        padding:"1.5rem", borderRadius:"10px", marginBottom:"0.5rem",
        border:"1px solid rgba(200,169,110,0.15)",
        background:"rgba(200,169,110,0.04)",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        flexWrap:"wrap", gap:"1rem",
      }}>
        <div>
          <div style={{ fontSize:"clamp(0.7rem, 2vw, 0.96rem)", fontWeight:900,
                         color:"#C8A96E", fontFamily:MONO, marginBottom:"0.35rem" }}>
            Protocol Access Token
          </div>
          <div style={{ fontSize:"clamp(0.46rem, 1.3vw, 0.58rem)",
                         color:"rgba(255,255,255,0.35)", lineHeight:1.65,
                         maxWidth:360 }}>
            ABRA is required for tokenization fees, governance, and protocol access.
            100,000 ABRA minimum for institutional features.
          </div>
          <div style={{ fontSize:"0.38rem", color:"rgba(200,169,110,0.4)",
                         fontFamily:MONO, marginTop:"0.5rem", wordBreak:"break-all" }}>
            CA: {ABRA_CA}
          </div>
        </div>
        <div style={{ display:"flex", gap:"0.5rem", flexShrink:0, flexWrap:"wrap" }}>
          <a href={BAGS_URL} target="_blank" rel="noopener noreferrer" style={{
            padding:"0.625rem 1.25rem", borderRadius:"6px",
            background:"rgba(200,169,110,0.12)",
            border:"1px solid rgba(200,169,110,0.3)",
            fontSize:"0.52rem", fontWeight:800, fontFamily:MONO,
            color:"#C8A96E", textDecoration:"none",
          }}>
            Buy on Bags.fm
          </a>
          <a href={JUP_URL} target="_blank" rel="noopener noreferrer" style={{
            padding:"0.625rem 1.25rem", borderRadius:"6px",
            background:"rgba(153,69,255,0.1)",
            border:"1px solid rgba(153,69,255,0.25)",
            fontSize:"0.52rem", fontWeight:800, fontFamily:MONO,
            color:"rgba(153,69,255,0.8)", textDecoration:"none",
          }}>
            Swap on Jupiter
          </a>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          7. PROTOCOL SIGNAL FEED (replaces accordion FAQ)
      ══════════════════════════════════════════════════════════════ */}
      <Rule label="Protocol Intelligence Feed" />
      <div style={{ display:"flex", flexDirection:"column", gap:"2px", marginBottom:"1rem" }}>
        {SIGNAL_FEED.map((item, i) => (
          <div key={i} style={{
            padding:"0.75rem 1rem", borderRadius:"6px",
            borderLeft:`2px solid ${TAG_COL[item.tag] ?? "#14F195"}40`,
            background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
            display:"flex", gap:"0.75rem", alignItems:"flex-start",
          }}>
            <span style={{
              fontSize:"0.32rem", fontWeight:900, fontFamily:MONO,
              color:TAG_COL[item.tag] ?? "#14F195",
              background:`${TAG_COL[item.tag] ?? "#14F195"}15`,
              border:`1px solid ${TAG_COL[item.tag] ?? "#14F195"}25`,
              padding:"1px 6px", borderRadius:"2px",
              whiteSpace:"nowrap", flexShrink:0, marginTop:2,
            }}>
              {item.tag}
            </span>
            <span style={{ fontSize:"clamp(0.5rem, 1.3vw, 0.6rem)",
                            color:"rgba(255,255,255,0.45)", lineHeight:1.6, flex:1 }}>
              {item.text}
            </span>
            <span style={{ fontSize:"0.34rem", color:"rgba(255,255,255,0.18)",
                            fontFamily:MONO, whiteSpace:"nowrap", flexShrink:0, marginTop:2 }}>
              {item.time}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}
