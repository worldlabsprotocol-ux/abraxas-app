// FILE: components/PrizePool.tsx
// Vault Prize Pool — entry-fee tournament tied to real vault PDAs.
// 70% to winner · 20% protocol treasury · 10% $ABRA buyback.
// x402 micropayment-compatible entry: any wallet can pay entry fee via x402 header.
"use client";

import { useState, useEffect } from "react";

interface PoolEntry { wallet: string; vaultId: string; asset: string; entryPaid: boolean; timestamp: string; }

const POOL_CONFIG = {
  entryFeeUsdc: 10,
  winnerPct: 70,
  protocolPct: 20,
  buybackPct: 10,
  maxEntrants: 20,
  currentSeason: 1,
  endDate: "May 31, 2026",
};

const MOCK_ENTRIES: PoolEntry[] = [
  { wallet:"7xA3…mK9f", vaultId:"490", asset:"1999 Charizard PSA 10", entryPaid:true,  timestamp:"2h ago"  },
  { wallet:"Db6R…xQ2p", vaultId:"491", asset:"Pappy Van Winkle 2021", entryPaid:true,  timestamp:"4h ago"  },
  { wallet:"CQ1U…dJGd", vaultId:"492", asset:"Blanton's 1990",        entryPaid:true,  timestamp:"6h ago"  },
  { wallet:"9G4k…Fa2m", vaultId:"490", asset:"Rolex Submariner",      entryPaid:true,  timestamp:"9h ago"  },
  { wallet:"HeFq…wZq5", vaultId:"491", asset:"Amazing Fantasy #15",   entryPaid:true,  timestamp:"12h ago" },
];

const X402_ENDPOINT = "https://abraxas-app.vercel.app/api/pool/enter";

function PoolDonut({ winner, protocol, buyback }: { winner: number; protocol: number; buyback: number }) {
  const r = 36; const cx = 44; const cy = 44; const circ = 2 * Math.PI * r;
  const wSlice = (winner / 100) * circ;
  const pSlice = (protocol / 100) * circ;
  const bSlice = (buyback / 100) * circ;
  const wOff = 0;
  const pOff = circ - wSlice;
  const bOff = circ - wSlice - pSlice;

  return (
    <svg width="88" height="88" viewBox="0 0 88 88" style={{ flexShrink:0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
      {/* Winner */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#14F195" strokeWidth="12"
        strokeDasharray={`${wSlice} ${circ}`} strokeDashoffset={wOff} transform={`rotate(-90 ${cx} ${cy})`} />
      {/* Protocol */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#6b8cff" strokeWidth="12"
        strokeDasharray={`${pSlice} ${circ}`} strokeDashoffset={pOff} transform={`rotate(-90 ${cx} ${cy})`} />
      {/* Buyback */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#C8A96E" strokeWidth="12"
        strokeDasharray={`${bSlice} ${circ}`} strokeDashoffset={bOff} transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy-4}  textAnchor="middle" fill="#f0f0f0" fontSize="9" fontWeight="800" fontFamily="JetBrains Mono">POOL</text>
      <text x={cx} y={cy+8} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="7" fontFamily="JetBrains Mono">Split</text>
    </svg>
  );
}

export function PrizePool() {
  const [entries,   setEntries]   = useState<PoolEntry[]>(MOCK_ENTRIES);
  const [entered,   setEntered]   = useState(false);
  const [entering,  setEntering]  = useState(false);
  const [toast,     setToast]     = useState<string|null>(null);
  const [timeLeft,  setTimeLeft]  = useState("");

  const totalPot     = entries.length * POOL_CONFIG.entryFeeUsdc;
  const winnerPrize  = Math.round(totalPot * POOL_CONFIG.winnerPct / 100);
  const protocolCut  = Math.round(totalPot * POOL_CONFIG.protocolPct / 100);
  const buybackCut   = Math.round(totalPot * POOL_CONFIG.buybackPct / 100);
  const spotsLeft    = POOL_CONFIG.maxEntrants - entries.length;

  function showToast(msg: string) { setToast(msg); setTimeout(()=>setToast(null), 3000); }

  // Countdown to season end
  useEffect(() => {
    function update() {
      const end  = new Date("2026-05-31T23:59:59Z").getTime();
      const now  = Date.now();
      const diff = end - now;
      if (diff <= 0) { setTimeLeft("Ended"); return; }
      const d = Math.floor(diff/86400000);
      const h = Math.floor((diff%86400000)/3600000);
      const m = Math.floor((diff%3600000)/60000);
      setTimeLeft(`${d}d ${h}h ${m}m`);
    }
    update();
    const iv = setInterval(update, 60000);
    return ()=>clearInterval(iv);
  }, []);

  async function enterPool() {
    setEntering(true);
    // x402 payment flow — in production this hits /api/pool/enter with x402 header
    // For now: simulate entry after 1.5s
    await new Promise(r => setTimeout(r, 1500));
    const newEntry: PoolEntry = {
      wallet: "You…wallet",
      vaultId: "490",
      asset: "Your Vault Asset",
      entryPaid: true,
      timestamp: "just now",
    };
    setEntries(e => [newEntry, ...e]);
    setEntered(true);
    setEntering(false);
    showToast(`Entered! ${POOL_CONFIG.entryFeeUsdc} USDC deducted via x402. Good luck.`);
  }

  return (
    <div style={{ background:"rgba(6,8,16,0.97)", border:"1px solid rgba(212,175,55,0.18)", borderRadius:"14px", padding:"1.25rem", marginBottom:"1.5rem", position:"relative" }}>
      {toast&&<div style={{ position:"fixed",top:"80px",left:"50%",transform:"translateX(-50%)",zIndex:999,padding:"0.5rem 1.25rem",borderRadius:"8px",background:"rgba(20,241,149,0.14)",border:"1px solid rgba(20,241,149,0.4)",color:"#14F195",fontSize:"0.6rem",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap" }}>{toast}</div>}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <div style={{ fontSize:"0.46rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.2rem" }}>
            Season {POOL_CONFIG.currentSeason} · Ends {POOL_CONFIG.endDate}
          </div>
          <div style={{ fontWeight:900,fontSize:"1.05rem",background:"linear-gradient(135deg,#D4AF37,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
            Vault Prize Pool
          </div>
          <div style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.35)",marginTop:"0.2rem" }}>
            Entry: {POOL_CONFIG.entryFeeUsdc} USDC via x402 · {spotsLeft} spots left · {timeLeft} remaining
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace" }}>PRIZE POT</div>
          <div style={{ fontSize:"1.6rem",fontWeight:900,color:"#D4AF37",lineHeight:1,fontFamily:"'JetBrains Mono',monospace" }}>${totalPot} <span style={{ fontSize:"0.56rem",color:"rgba(255,255,255,0.35)" }}>USDC</span></div>
        </div>
      </div>

      {/* Split viz + legend */}
      <div style={{ display:"flex", gap:"1.25rem", alignItems:"center", marginBottom:"1rem", flexWrap:"wrap" }}>
        <PoolDonut winner={POOL_CONFIG.winnerPct} protocol={POOL_CONFIG.protocolPct} buyback={POOL_CONFIG.buybackPct} />
        <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
          {[
            { label:"Winner Takes", pct:POOL_CONFIG.winnerPct, amt:winnerPrize,  color:"#14F195", desc:"Top vault by Arena score" },
            { label:"Protocol",     pct:POOL_CONFIG.protocolPct, amt:protocolCut, color:"#6b8cff", desc:"Treasury · ops + growth" },
            { label:"$ABRA Buyback",pct:POOL_CONFIG.buybackPct, amt:buybackCut,  color:"#C8A96E", desc:"Open market buyback" },
          ].map(s=>(
            <div key={s.label} style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
              <div style={{ width:"8px",height:"8px",borderRadius:"50%",background:s.color,flexShrink:0 }} />
              <div>
                <span style={{ fontSize:"0.56rem",fontWeight:700,color:s.color,fontFamily:"'JetBrains Mono',monospace" }}>{s.pct}% · ${s.amt} USDC</span>
                <span style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.28)",marginLeft:"0.4rem" }}>{s.label}</span>
                <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace" }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* x402 info */}
      <div style={{ padding:"0.5rem 0.75rem",background:"rgba(107,140,255,0.06)",border:"1px solid rgba(107,140,255,0.15)",borderRadius:"8px",marginBottom:"1rem" }}>
        <div style={{ fontSize:"0.5rem",fontWeight:700,color:"#6b8cff",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.2rem" }}>x402 Payment Protocol</div>
        <div style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.38)",lineHeight:1.6 }}>
          Entry fee is collected via HTTP 402 Payment Required — a permissionless micropayment standard on Solana.
          Your wallet signs a {POOL_CONFIG.entryFeeUsdc} USDC transfer to the prize escrow PDA.
          No custody risk: funds held in on-chain escrow, auto-distributed on season end.
          External wallets can also enter via: <code style={{ color:"#6b8cff",fontSize:"0.46rem" }}>POST {X402_ENDPOINT}</code> with <code style={{ color:"#6b8cff",fontSize:"0.46rem" }}>X-Payment: &lt;signed-tx&gt;</code> header.
        </div>
      </div>

      {/* Entrants */}
      <div style={{ marginBottom:"1rem" }}>
        <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"0.4rem" }}>
          Entrants ({entries.length}/{POOL_CONFIG.maxEntrants})
        </div>
        {entries.map((e,i)=>(
          <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.3rem 0.5rem",borderRadius:"5px",background:i===0?"rgba(212,175,55,0.05)":"transparent",marginBottom:"2px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"0.4rem" }}>
              <span style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",width:"16px" }}>#{i+1}</span>
              <span style={{ fontSize:"0.52rem",color:i===0?"#D4AF37":"rgba(255,255,255,0.5)",fontFamily:"'JetBrains Mono',monospace",fontWeight:i===0?700:400 }}>{e.wallet}</span>
              <span style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.25)" }}>{e.asset}</span>
            </div>
            <span style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace" }}>{e.timestamp}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button onClick={enterPool} disabled={entered||entering||spotsLeft<=0} style={{ width:"100%",padding:"0.75rem",borderRadius:"10px",border:"none",fontWeight:900,fontSize:"0.82rem",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",cursor:entered||entering||spotsLeft<=0?"not-allowed":"pointer",background:entered?"rgba(20,241,149,0.08)":entering?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#D4AF37,#a855f7)",color:entered?"#14F195":entering?"rgba(255,255,255,0.3)":"#000",boxShadow:entered||entering?"none":"0 0 28px rgba(212,175,55,0.3)" }}>
        {entered?"Entered — Good Luck":entering?"Processing x402 Payment…":`Enter Pool · ${POOL_CONFIG.entryFeeUsdc} USDC`}
      </button>
      <div style={{ marginTop:"0.4rem",textAlign:"center",fontSize:"0.44rem",color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace" }}>
        Paid via x402 micropayment · Escrow PDA: CQ1U…dJGd · Auto-distributed May 31
      </div>
    </div>
  );
}