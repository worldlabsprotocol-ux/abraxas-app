// FILE: components/GameModes.tsx
// Game Modes Hub — Sovereign Arena · AbraxClaw Gacha · Chase Markets · Circuit Brain Games · Leaderboard
// No emojis. Institutional-grade typography. Addictive mechanics. $ABRA integration on every mode.
"use client";

import { useState, useEffect, useRef } from "react";
import { getRank, RANK_COLORS, type EloState } from "@/lib/loopscale";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GameAsset {
  id:string; name:string; category:string; priceUsd:number; ticker:string;
  imagePath?:string|null; videoPath?:string|null; rarity:string;
  archetype?:string; archetype_color?:string; arena_buff?:string;
  can_borrow?:boolean; ltv?:number;
}
const CAT_COLOR:Record<string,string> = {
  Pokemon:"#FBBF24","One Piece":"#f26b6b",Comics:"#a855f7",Metals:"#D4AF37",
  Stocks:"#14F195",Watches:"#6b8cff",Sports:"#fb923c",Spirits:"#FF8C00",Racehorses:"#22c55e",
};
function fmtUsd(v:number):string { if(v>=1_000_000) return `$${(v/1_000_000).toFixed(2)}M`; if(v>=1_000) return `$${(v/1_000).toFixed(1)}K`; return `$${v.toFixed(2)}`; }

// ─── Premium placeholder when no image ────────────────────────────────────────
function AssetThumb({ asset, size=64 }:{ asset:GameAsset; size?:number }) {
  const [err,setErr] = useState(false);
  const c = CAT_COLOR[asset.category]??"#6b8cff";
  if ((!asset.imagePath||err)) return (
    <div style={{ width:size,height:size,borderRadius:"8px",background:`linear-gradient(145deg,${c}15,rgba(6,8,16,0.99))`,border:`1px solid ${c}25`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden",position:"relative" }}>
      <div style={{ position:"absolute",inset:0,opacity:0.06,display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"center",color:c,fontSize:"0.7rem" }}>{"◈◈◈◈◈◈◈◈◈"}</div>
      <div style={{ fontSize:size>50?"1rem":"0.7rem",color:c,opacity:0.6,zIndex:1 }}>◈</div>
      <div style={{ fontSize:"0.32rem",fontWeight:700,color:c,fontFamily:"'JetBrains Mono',monospace",textAlign:"center",letterSpacing:"0.05em",zIndex:1,padding:"0 4px" }}>{asset.category.toUpperCase()}</div>
    </div>
  );
  return <img src={asset.imagePath!} alt={asset.name} onError={()=>setErr(true)} style={{ width:size,height:size,borderRadius:"8px",objectFit:"contain",background:"rgba(6,8,16,0.98)",flexShrink:0,border:`1px solid ${c}18` }} loading="lazy" />;
}

// ─── AbraxClaw Gacha Machine ──────────────────────────────────────────────────
const RARITY_CONFIG: Record<string,{weight:number;pct:string;color:string;abraReward:number}> = {
  "Legendary":   { weight:2,  pct:"0.5%",  color:"#FBBF24", abraReward:250 },
  "Ultra Rare":  { weight:8,  pct:"4%",    color:"#a855f7", abraReward:100 },
  "Rare Holo":   { weight:25, pct:"12.5%", color:"#6b8cff", abraReward:50  },
  "Common":      { weight:65, pct:"32.5%", color:"rgba(255,255,255,0.5)", abraReward:20 },
};

function AbraxClaw({ assets, onEarn }:{ assets:GameAsset[]; onEarn:(n:number)=>void }) {
  const [phase,   setPhase]   = useState<"idle"|"paid"|"drop"|"grab"|"lift"|"reveal"|"done">("idle");
  const [found,   setFound]   = useState<GameAsset|null>(null);
  const [tickets, setTickets] = useState(5);
  const [history, setHistory] = useState<Array<{name:string;rarity:string;val:number;abra:number}>>([]);
  const [clawX,   setClawX]   = useState(50);
  const [clawY,   setClawY]   = useState(0);
  const [pulls,   setPulls]   = useState(0);
  const [combo,   setCombo]   = useState(0);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const catEligible = assets.filter(a=>a.priceUsd<30000);

  function clearTimers() { timerRefs.current.forEach(clearTimeout); timerRefs.current=[]; }
  useEffect(()=>()=>clearTimers(),[]);

  function weightedPick(forceLegendary=false): GameAsset {
    const pool = forceLegendary
      ? catEligible.filter(a=>a.rarity==="Legendary"||a.rarity==="Ultra Rare")
      : catEligible;
    const eligible = pool.length>0?pool:catEligible;
    const total = eligible.reduce((s,a)=>s+(RARITY_CONFIG[a.rarity]?.weight??20),0);
    let r = Math.random()*total;
    for (const a of eligible) { r-=(RARITY_CONFIG[a.rarity]?.weight??20); if(r<=0) return a; }
    return eligible[0];
  }

  const PITY_THRESHOLD = 10;
  const [pityCount, setPityCount] = useState(0);
  const [energy, setEnergy] = useState(100);
  const PULL_COST = 10; // energy per pull

  function pull() {
    if(tickets<=0||phase!=="idle"||energy<PULL_COST) return;
    clearTimers();
    setTickets(t=>t-1); setPulls(p=>p+1);
    setEnergy(e=>Math.max(0,e-PULL_COST));
    setPityCount(p=>p+1);
    const tx = 15+Math.random()*70;
    setClawX(tx); setPhase("paid");
    const t1=setTimeout(()=>{ setPhase("drop"); setClawY(70); },600);
    const t2=setTimeout(()=>{ setPhase("grab"); },1400);
    const t3=setTimeout(()=>{
      const isPityPull = pityCount>=PITY_THRESHOLD;
      const pick = weightedPick(isPityPull);
      if(isPityPull) setPityCount(0);
      const cfg  = RARITY_CONFIG[pick.rarity]??RARITY_CONFIG["Common"];
      const comboBonus = combo>=3?Math.round(cfg.abraReward*0.5):0;
      const earned = cfg.abraReward+comboBonus;
      setFound(pick); setPhase("lift"); setClawY(0);
      setHistory(h=>[{name:pick.name,rarity:pick.rarity,val:pick.priceUsd,abra:earned},...h.slice(0,6)]);
      onEarn(earned);
      setCombo(c=> pick.rarity==="Legendary"||pick.rarity==="Ultra Rare"?c+1:0);
    },2200);
    const t4=setTimeout(()=>setPhase("reveal"),2900);
    const t5=setTimeout(()=>setPhase("done"),4500);
    timerRefs.current=[t1,t2,t3,t4,t5];
  }

  const rarityColor = found?(RARITY_CONFIG[found.rarity]?.color??"#6b8cff"):"#6b8cff";
  const isRare = found&&(found.rarity==="Legendary"||found.rarity==="Ultra Rare");

  return (
    <div style={{ maxWidth:"480px",margin:"0 auto" }}>
      {/* Header */}
      <div style={{ textAlign:"center",marginBottom:"1.25rem" }}>
        <p style={{ fontSize:"0.44rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 0.25rem" }}>Abraxas Protocol</p>
        <h2 style={{ fontWeight:900,fontSize:"1.2rem",background:"linear-gradient(135deg,#FBBF24,#C8A96E)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 0.2rem",letterSpacing:"-0.02em" }}>AbraxClaw Gacha Machine</h2>
        <p style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.3)",margin:0 }}>
          {tickets} pulls remaining · {pulls} total · {combo>=3?`${combo}x Combo!`:"Combo for bonus $ABRA"}
        </p>
      </div>

      {/* Rarity table */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.3rem",marginBottom:"0.875rem" }}>
        {Object.entries(RARITY_CONFIG).map(([r,cfg])=>(
          <div key={r} style={{ padding:"0.35rem",borderRadius:"6px",background:`${cfg.color}08`,border:`1px solid ${cfg.color}20`,textAlign:"center" }}>
            <div style={{ fontSize:"0.42rem",fontWeight:700,color:cfg.color,fontFamily:"'JetBrains Mono',monospace",marginBottom:"1px" }}>{r.split(" ")[0]}</div>
            <div style={{ fontSize:"0.36rem",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace" }}>{cfg.pct}</div>
            <div style={{ fontSize:"0.4rem",color:cfg.color,fontFamily:"'JetBrains Mono',monospace",fontWeight:700 }}>+{cfg.abraReward}$A</div>
          </div>
        ))}
      </div>

      {/* Pity + Energy meters */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginBottom:"0.875rem" }}>
        <div>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"0.2rem" }}>
            <span style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em" }}>Pity Meter</span>
            <span style={{ fontSize:"0.44rem",fontWeight:700,color:pityCount>=PITY_THRESHOLD-2?"#FBBF24":"rgba(255,255,255,0.35)",fontFamily:"'JetBrains Mono',monospace" }}>{pityCount}/{PITY_THRESHOLD}</span>
          </div>
          <div style={{ height:"5px",borderRadius:"3px",background:"rgba(255,255,255,0.06)",overflow:"hidden" }}>
            <div style={{ height:"100%",borderRadius:"3px",width:`${(pityCount/PITY_THRESHOLD)*100}%`,background:`linear-gradient(90deg,#FBBF24,#FF6B35)`,boxShadow:`0 0 6px rgba(251,191,36,0.4)`,transition:"width 0.4s ease" }} />
          </div>
          <div style={{ fontSize:"0.38rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",marginTop:"2px" }}>Guaranteed Legendary at {PITY_THRESHOLD}</div>
        </div>
        <div>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"0.2rem" }}>
            <span style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em" }}>Energy</span>
            <span style={{ fontSize:"0.44rem",fontWeight:700,color:energy>=PULL_COST?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace" }}>{energy}/100</span>
          </div>
          <div style={{ height:"5px",borderRadius:"3px",background:"rgba(255,255,255,0.06)",overflow:"hidden" }}>
            <div style={{ height:"100%",borderRadius:"3px",width:`${energy}%`,background:`linear-gradient(90deg,#14F195,#6b8cff)`,boxShadow:`0 0 6px rgba(20,241,149,0.3)`,transition:"width 0.4s ease" }} />
          </div>
          <div style={{ fontSize:"0.38rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",marginTop:"2px" }}>Regens 10/battle win · {PULL_COST} per pull</div>
        </div>
      </div>

      {/* Machine viewport */}
      <div style={{ position:"relative",borderRadius:"14px",overflow:"hidden",border:"2px solid rgba(251,191,36,0.2)",background:"rgba(4,5,12,0.99)",height:"320px",marginBottom:"0.75rem" }}>
        {/* Glass reflection */}
        <div style={{ position:"absolute",top:0,left:0,right:0,height:"50%",background:"linear-gradient(to bottom,rgba(255,255,255,0.02),transparent)",pointerEvents:"none",zIndex:5 }} />
        {/* Scanning line */}
        {(phase==="drop"||phase==="grab")&&<div style={{ position:"absolute",left:0,right:0,top:`${clawY}%`,height:"1px",background:`linear-gradient(90deg,transparent,rgba(251,191,36,0.6),transparent)`,zIndex:6,transition:"top 0.8s ease-in-out" }} />}

        {/* Claw assembly */}
        <div style={{ position:"absolute",top:0,left:`${clawX}%`,transform:"translateX(-50%)",zIndex:10,transition:"left 0.8s cubic-bezier(0.34,1.2,0.64,1)" }}>
          {/* Cable */}
          <div style={{ width:"2px",height:phase==="drop"||phase==="grab"?`${clawY+8}%`:"8%",background:"linear-gradient(to bottom,rgba(212,175,55,0.8),rgba(212,175,55,0.3))",margin:"0 auto",transition:"height 0.8s ease-in-out",position:"relative" }}>
            <div style={{ position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:"4px",height:"4px",borderRadius:"50%",background:"#D4AF37" }} />
          </div>
          {/* Claw head */}
          <div style={{ display:"flex",justifyContent:"center",gap:"1px",marginTop:"-1px" }}>
            {[-15,0,15].map(angle=>(
              <div key={angle} style={{ width:"6px",height:phase==="grab"?"14px":"8px",background:`linear-gradient(to bottom,#D4AF37,#8B6914)`,borderRadius:"0 0 4px 4px",transform:`rotate(${angle}deg)`,transformOrigin:"top center",transition:"height 0.3s" }} />
            ))}
          </div>
        </div>

        {/* Prize pool */}
        <div style={{ position:"absolute",inset:"0",bottom:"2rem",display:"flex",flexWrap:"wrap",gap:"5px",padding:"1.5rem 0.75rem 0.5rem",alignContent:"flex-end",justifyContent:"center" }}>
          {catEligible.slice(0,20).map(a=>{
            const c=CAT_COLOR[a.category]??"#6b8cff";
            return (
              <div key={a.id} style={{ width:"48px",height:"64px",borderRadius:"6px",background:`${c}10`,border:`1px solid ${c}22`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0,position:"relative" }}>
                {a.imagePath?<img src={a.imagePath} alt={a.name} style={{ width:"100%",height:"100%",objectFit:"contain" }} loading="lazy" />:
                  <span style={{ fontSize:"0.32rem",color:c,fontWeight:700,textAlign:"center",padding:"2px",fontFamily:"'JetBrains Mono',monospace" }}>{a.name.slice(0,8)}</span>}
              </div>
            );
          })}
        </div>

        {/* Chute bottom */}
        <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"2rem",background:"rgba(212,175,55,0.07)",borderTop:"1px solid rgba(212,175,55,0.15)",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <span style={{ fontSize:"0.44rem",color:"rgba(212,175,55,0.5)",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.15em" }}>PRIZE CHUTE</span>
        </div>

        {/* Reveal overlay */}
        {(phase==="reveal"||phase==="done")&&found&&(
          <div style={{ position:"absolute",inset:0,background:"rgba(2,3,10,0.96)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.5rem",zIndex:20 }}>
            {isRare&&<div style={{ position:"absolute",inset:0,background:`radial-gradient(circle at center,${rarityColor}12 0%,transparent 60%)`,animation:"pulseGlow 0.8s ease-in-out 3",pointerEvents:"none" }} />}
            <div style={{ fontSize:"0.5rem",fontWeight:800,color:rarityColor,letterSpacing:"0.25em",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase" }}>{found.rarity}</div>
            <div style={{ width:"96px",height:"128px",borderRadius:"10px",border:`2px solid ${rarityColor}`,overflow:"hidden",background:`${rarityColor}08`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 40px ${rarityColor}40,0 0 80px ${rarityColor}20` }}>
              {found.imagePath?<img src={found.imagePath} alt={found.name} style={{ width:"100%",height:"100%",objectFit:"contain" }} />:
                <span style={{ fontSize:"0.5rem",color:rarityColor,fontWeight:700,textAlign:"center",padding:"8px",fontFamily:"'JetBrains Mono',monospace" }}>{found.name}</span>}
            </div>
            <div style={{ fontWeight:900,fontSize:"0.88rem",color:"#f0f0f0",textAlign:"center",maxWidth:"200px",lineHeight:1.25 }}>{found.name}</div>
            <div style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.4)",fontFamily:"'JetBrains Mono',monospace" }}>{found.category} · {fmtUsd(found.priceUsd)}</div>
            {combo>=3&&<div style={{ fontSize:"0.5rem",color:"#FBBF24",fontWeight:700,fontFamily:"'JetBrains Mono',monospace" }}>COMBO BONUS +50% $ABRA</div>}
            <div style={{ padding:"0.25rem 0.75rem",borderRadius:"5px",background:"rgba(20,241,149,0.1)",border:"1px solid rgba(20,241,149,0.25)",fontSize:"0.52rem",fontWeight:700,color:"#14F195",fontFamily:"'JetBrains Mono',monospace" }}>
              +{RARITY_CONFIG[found.rarity]?.abraReward+(combo>=3?Math.round((RARITY_CONFIG[found.rarity]?.abraReward??0)*0.5):0)} $ABRA earned
            </div>
            {phase==="done"&&<button onClick={()=>{setPhase("idle");setFound(null);setClawX(50);}} style={{ marginTop:"0.25rem",padding:"0.3rem 0.875rem",borderRadius:"6px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.4)",fontSize:"0.56rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>Vault Asset →</button>}
          </div>
        )}

        {/* Status */}
        <div style={{ position:"absolute",top:"0.5rem",right:"0.5rem",padding:"0.12rem 0.45rem",borderRadius:"4px",background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.22)",fontSize:"0.4rem",fontWeight:700,color:"#FBBF24",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.1em",zIndex:15 }}>
          {phase==="idle"?"READY":phase==="paid"?"TARGETING":phase==="drop"?"DESCENDING":phase==="grab"?"GRIPPING":phase==="lift"?"RETRIEVING":phase==="reveal"?"OPENING":"COMPLETE"}
        </div>
      </div>

      {/* Pull button */}
      <button onClick={pull} disabled={tickets<=0||phase!=="idle"} style={{ width:"100%",padding:"0.75rem",borderRadius:"10px",border:"none",fontWeight:900,fontSize:"0.82rem",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.06em",cursor:tickets>0&&phase==="idle"?"pointer":"not-allowed",background:tickets>0&&phase==="idle"?"linear-gradient(135deg,#D4AF37 0%,#FBBF24 50%,#FF6B35 100%)":"rgba(255,255,255,0.04)",color:tickets>0&&phase==="idle"?"#000":"rgba(255,255,255,0.18)",boxShadow:tickets>0&&phase==="idle"?"0 0 28px rgba(212,175,55,0.4),0 4px 16px rgba(0,0,0,0.4)":"none",transition:"all 0.2s" }}>
        {tickets>0?`Deploy Claw  ·  ${tickets} Pulls Remaining`:"No Pulls Available — Win in Arena to Refill"}
      </button>

      {/* Recent pulls */}
      {history.length>0&&(
        <div style={{ marginTop:"0.875rem" }}>
          <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.35rem" }}>Pull History</div>
          {history.map((h,i)=>{
            const c = RARITY_CONFIG[h.rarity]?.color??"#6b8cff";
            return (
              <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.3rem 0.5rem",borderRadius:"5px",background:i===0?"rgba(212,175,55,0.04)":"transparent",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:"0.4rem" }}>
                  <div style={{ width:"6px",height:"6px",borderRadius:"50%",background:c,boxShadow:`0 0 4px ${c}` }} />
                  <span style={{ fontSize:"0.52rem",color:i===0?"#f0f0f0":"rgba(255,255,255,0.4)",fontFamily:"'JetBrains Mono',monospace" }}>{h.name}</span>
                </div>
                <div style={{ display:"flex",gap:"0.5rem",alignItems:"center" }}>
                  <span style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace" }}>{fmtUsd(h.val)}</span>
                  <span style={{ fontSize:"0.44rem",color:"#14F195",fontWeight:700,fontFamily:"'JetBrains Mono',monospace" }}>+{h.abra}$A</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes pulseGlow{0%,100%{opacity:0}50%{opacity:1}}
      `}</style>
    </div>
  );
}

// ─── Chase Markets (CALL / PUT) ───────────────────────────────────────────────
const EXPIRY = ["1 Day","3 Days","1 Week","2 Weeks"];
const CALL_MULT = 1.18;
interface Position { id:string; asset:string; ticker:string; direction:"CALL"|"PUT"; target:number; wager:number; expiry:string; openPrice:number; status:"open"|"won"|"lost"; payout:number; }

function ChaseMarkets({ assets, onEarn }:{ assets:GameAsset[]; onEarn:(n:number)=>void }) {
  const [sel,       setSel]       = useState<GameAsset|null>(null);
  const [dir,       setDir]       = useState<"CALL"|"PUT">("CALL");
  const [target,    setTarget]    = useState(10);
  const [wager,     setWager]     = useState(50);
  const [expiry,    setExpiry]    = useState(EXPIRY[2]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [search,    setSearch]    = useState("");
  const [toast,     setToast]     = useState<string|null>(null);
  const [tab,       setTab]       = useState<"build"|"positions">("build");

  function showToast(msg:string) { setToast(msg); setTimeout(()=>setToast(null),2800); }
  const list = assets.filter(a=>a.name.toLowerCase().includes(search.toLowerCase())||a.ticker.toLowerCase().includes(search.toLowerCase())).slice(0,16);
  const maxPay = Math.round(wager*(dir==="CALL"?CALL_MULT:1.0)*1.85);
  const openCount = positions.filter(p=>p.status==="open").length;
  const wonCount  = positions.filter(p=>p.status==="won").length;
  const totalWon  = positions.filter(p=>p.status==="won").reduce((s,p)=>s+p.payout,0);

  function place() {
    if(!sel||wager<=0) return;
    const pos:Position = { id:Date.now().toString(), asset:sel.name, ticker:sel.ticker, direction:dir, target, wager, expiry, openPrice:sel.priceUsd, status:"open", payout:maxPay };
    setPositions(p=>[pos,...p.slice(0,9)]);
    showToast(`${dir} on ${sel.ticker} placed · ${wager} $ABRA wagered`);
    setSel(null); setTab("positions");
  }

  function settle(id:string) {
    setPositions(p=>p.map(pos=>{
      if(pos.id!==id) return pos;
      const won = pos.direction==="CALL"?Math.random()<0.58:Math.random()<0.42;
      if(won) onEarn(pos.payout);
      showToast(won?`Position won · +${pos.payout} $ABRA`:`Position expired`);
      return {...pos,status:won?"won":"lost"};
    }));
  }

  return (
    <div style={{ maxWidth:"620px",margin:"0 auto" }}>
      {toast&&<div style={{ position:"fixed",top:"80px",left:"50%",transform:"translateX(-50%)",zIndex:999,padding:"0.5rem 1.25rem",borderRadius:"8px",background:"rgba(20,241,149,0.12)",border:"1px solid rgba(20,241,149,0.35)",color:"#14F195",fontSize:"0.58rem",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap" }}>{toast}</div>}
      <div style={{ textAlign:"center",marginBottom:"1rem" }}>
        <p style={{ fontSize:"0.44rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 0.25rem" }}>Predictive Intelligence</p>
        <h2 style={{ fontWeight:900,fontSize:"1.1rem",background:"linear-gradient(135deg,#14F195,#6b8cff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 0.2rem",letterSpacing:"-0.02em" }}>Chase Markets</h2>
        <p style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.3)",margin:0 }}>Bullish RWA thesis · CALL positions pay +{Math.round((CALL_MULT-1)*100)}% · Settle any time</p>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.35rem",marginBottom:"0.875rem" }}>
        {([["Open",String(openCount),"#FBBF24"],["Wins",String(wonCount),"#14F195"],["Earned",`${totalWon}$A`,"#C8A96E"],["Call Bonus",`+${Math.round((CALL_MULT-1)*100)}%`,"#6b8cff"]] as [string,string,string][]).map(([l,v,c])=>(
          <div key={l} style={{ padding:"0.4rem",background:"rgba(255,255,255,0.02)",border:`1px solid ${c}15`,borderRadius:"7px",textAlign:"center" }}>
            <div style={{ fontSize:"0.38rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"2px",textTransform:"uppercase",letterSpacing:"0.08em" }}>{l}</div>
            <div style={{ fontSize:"0.68rem",fontWeight:700,color:c,fontFamily:"'JetBrains Mono',monospace" }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex",gap:"0.25rem",marginBottom:"0.75rem" }}>
        {(["build","positions"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:"0.3rem 0.875rem",borderRadius:"5px",border:`1px solid ${tab===t?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.07)"}`,background:tab===t?"rgba(255,255,255,0.07)":"transparent",color:tab===t?"#f0f0f0":"rgba(255,255,255,0.32)",fontSize:"0.56rem",fontWeight:tab===t?700:400,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>
            {t==="build"?"Build Position":`Active Positions (${openCount})`}
          </button>
        ))}
      </div>
      {tab==="build"&&(
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.875rem" }}>
          <div style={{ background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"12px",padding:"0.875rem" }}>
            <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.35rem",textTransform:"uppercase",letterSpacing:"0.08em" }}>Select Asset</div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ticker or name" style={{ width:"100%",padding:"0.3rem 0.5rem",borderRadius:"5px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#f0f0f0",fontSize:"0.54rem",fontFamily:"'JetBrains Mono',monospace",outline:"none",boxSizing:"border-box",marginBottom:"0.35rem" }} />
            <div style={{ maxHeight:"220px",overflowY:"auto" }}>
              {list.map(a=>(
                <div key={a.id} onClick={()=>setSel(a)} style={{ padding:"0.28rem 0.4rem",borderRadius:"5px",cursor:"pointer",marginBottom:"2px",display:"flex",justifyContent:"space-between",alignItems:"center",background:sel?.id===a.id?`${CAT_COLOR[a.category]??"#6b8cff"}10`:"rgba(255,255,255,0.01)",border:`1px solid ${sel?.id===a.id?(CAT_COLOR[a.category]??"#6b8cff")+"44":"transparent"}` }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"0.35rem" }}>
                    <AssetThumb asset={a} size={24} />
                    <div>
                      <div style={{ fontSize:"0.5rem",color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace",fontWeight:500 }}>{a.ticker}</div>
                      <div style={{ fontSize:"0.4rem",color:"rgba(255,255,255,0.28)" }}>{a.name.slice(0,16)}</div>
                    </div>
                  </div>
                  <span style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.38)",fontFamily:"'JetBrains Mono',monospace" }}>{fmtUsd(a.priceUsd)}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"12px",padding:"0.875rem" }}>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.35rem",marginBottom:"0.625rem" }}>
              {(["CALL","PUT"] as const).map(d=>(
                <button key={d} onClick={()=>setDir(d)} style={{ padding:"0.5rem",borderRadius:"7px",border:`1px solid ${dir===d?(d==="CALL"?"rgba(20,241,149,0.45)":"rgba(242,107,107,0.45)"):"rgba(255,255,255,0.08)"}`,background:dir===d?(d==="CALL"?"rgba(20,241,149,0.09)":"rgba(242,107,107,0.09)"):"transparent",color:dir===d?(d==="CALL"?"#14F195":"#f26b6b"):"rgba(255,255,255,0.35)",fontWeight:dir===d?800:400,fontSize:"0.7rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>
                  {d==="CALL"?"LONG ▲":"SHORT ▼"}
                </button>
              ))}
            </div>
            <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.2rem",textTransform:"uppercase",letterSpacing:"0.08em" }}>Target Move</div>
            <div style={{ display:"flex",gap:"0.2rem",marginBottom:"0.5rem" }}>
              {[5,10,15,25,50].map(t=>(
                <button key={t} onClick={()=>setTarget(t)} style={{ flex:1,padding:"0.22rem",borderRadius:"4px",border:`1px solid ${target===t?"rgba(251,191,36,0.45)":"rgba(255,255,255,0.07)"}`,background:target===t?"rgba(251,191,36,0.09)":"transparent",color:target===t?"#FBBF24":"rgba(255,255,255,0.28)",fontSize:"0.46rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>{t}%</button>
              ))}
            </div>
            <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.2rem",textTransform:"uppercase",letterSpacing:"0.08em" }}>Wager ($ABRA)</div>
            <div style={{ display:"flex",gap:"0.2rem",marginBottom:"0.5rem" }}>
              {[25,50,100,250,500].map(w=>(
                <button key={w} onClick={()=>setWager(w)} style={{ flex:1,padding:"0.2rem",borderRadius:"4px",border:`1px solid ${wager===w?"rgba(107,140,255,0.45)":"rgba(255,255,255,0.07)"}`,background:wager===w?"rgba(107,140,255,0.09)":"transparent",color:wager===w?"#6b8cff":"rgba(255,255,255,0.28)",fontSize:"0.44rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>{w}</button>
              ))}
            </div>
            <div style={{ display:"flex",gap:"0.2rem",flexWrap:"wrap",marginBottom:"0.625rem" }}>
              {EXPIRY.map(e=>(
                <button key={e} onClick={()=>setExpiry(e)} style={{ padding:"0.18rem 0.4rem",borderRadius:"4px",border:`1px solid ${expiry===e?"rgba(255,255,255,0.28)":"rgba(255,255,255,0.07)"}`,background:expiry===e?"rgba(255,255,255,0.06)":"transparent",color:expiry===e?"#f0f0f0":"rgba(255,255,255,0.28)",fontSize:"0.42rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>{e}</button>
              ))}
            </div>
            {sel&&(
              <div style={{ padding:"0.35rem 0.5rem",borderRadius:"6px",background:dir==="CALL"?"rgba(20,241,149,0.05)":"rgba(242,107,107,0.05)",border:`1px solid ${dir==="CALL"?"rgba(20,241,149,0.18)":"rgba(242,107,107,0.18)"}`,marginBottom:"0.5rem" }}>
                <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.42)",fontFamily:"'JetBrains Mono',monospace" }}>{dir} {sel.ticker} {dir==="CALL"?"+":""}{target}% · {expiry}</div>
                <div style={{ fontSize:"0.6rem",fontWeight:700,color:dir==="CALL"?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace" }}>Max: {maxPay} $ABRA{dir==="CALL"?` (+${Math.round((CALL_MULT-1)*100)}% long bonus)`:""}</div>
              </div>
            )}
            <button onClick={place} disabled={!sel} style={{ width:"100%",padding:"0.5rem",borderRadius:"7px",border:"none",fontWeight:800,fontSize:"0.68rem",fontFamily:"'JetBrains Mono',monospace",cursor:sel?"pointer":"not-allowed",background:sel?(dir==="CALL"?"linear-gradient(135deg,#14F195,#6b8cff)":"linear-gradient(135deg,#f26b6b,#FF6B35)"):"rgba(255,255,255,0.04)",color:sel?"#000":"rgba(255,255,255,0.2)" }}>
              {sel?`Open ${dir} Position →`:"Select Asset to Continue"}
            </button>
          </div>
        </div>
      )}
      {tab==="positions"&&(
        <div>
          {positions.length===0&&<div style={{ padding:"2.5rem",textAlign:"center",fontSize:"0.6rem",color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace" }}>No positions — build one to start</div>}
          {positions.map(p=>(
            <div key={p.id} style={{ padding:"0.5rem 0.75rem",background:"rgba(6,8,16,0.97)",border:`1px solid ${p.status==="won"?"rgba(20,241,149,0.25)":p.status==="lost"?"rgba(242,107,107,0.15)":p.direction==="CALL"?"rgba(20,241,149,0.1)":"rgba(242,107,107,0.1)"}`,borderRadius:"8px",marginBottom:"0.3rem",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:"0.4rem" }}>
                  <span style={{ fontWeight:700,fontSize:"0.6rem",color:p.direction==="CALL"?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace" }}>{p.direction==="CALL"?"LONG":"SHORT"}</span>
                  <span style={{ fontSize:"0.54rem",color:"rgba(255,255,255,0.55)",fontFamily:"'JetBrains Mono',monospace" }}>{p.ticker} {p.direction==="CALL"?"+":""}{p.target}% · {p.wager}$A · {p.expiry}</span>
                </div>
                <div style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace" }}>Opened at {fmtUsd(p.openPrice)}</div>
              </div>
              {p.status==="open"?<button onClick={()=>settle(p.id)} style={{ padding:"0.2rem 0.5rem",borderRadius:"4px",background:"rgba(251,191,36,0.09)",border:"1px solid rgba(251,191,36,0.28)",color:"#FBBF24",fontSize:"0.48rem",fontWeight:700,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>Settle</button>:
                <span style={{ fontSize:"0.56rem",fontWeight:700,color:p.status==="won"?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace" }}>{p.status==="won"?`+${p.payout}$A`:"EXPIRED"}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Circuit Brain Games ──────────────────────────────────────────────────────
const TRIVIA = [
  { q:"What blockchain is Abraxas Protocol built on?",       opts:["Ethereum","Solana","Avalanche","Base"],                   a:1,r:40  },
  { q:"Which arena buff do Spirits assets carry?",            opts:["Precision Strike","Iconic Power","Liquid Gold","Thunderhooves"],a:2,r:50},
  { q:"What is the LTV for Gold on Loopscale?",               opts:["55%","65%","70%","80%"],                                 a:3,r:55  },
  { q:"What does x402 enable for Sophia Agents?",             opts:["NFT minting","Agentic micropayments","Bridge txs","Staking"],a:1,r:45},
  { q:"The 1999 Charizard PSA 10 archetype is?",              opts:["Aggro","Control","Tank","Volatility"],                   a:2,r:60  },
  { q:"Watches carry which arena buff?",                      opts:["Liquid Gold","Iconic Power","Precision Strike","Thunderhooves"],a:2,r:45},
  { q:"$ABRA is the native token of which protocol?",         opts:["Serum","Abraxas","Drift","Jupiter"],                     a:1,r:50  },
  { q:"What token standard does Abraxas use on Solana?",      opts:["SPL","Token-2022","Token-721","cNFT"],                   a:1,r:55  },
  { q:"Comics have which arena buff?",                        opts:["Liquid Gold","Iconic Power","Precision Strike","Iron Shield"],a:1,r:50},
  { q:"Amazing Fantasy #15 is from which year?",              opts:["1958","1960","1962","1965"],                              a:2,r:65  },
];
const ORACLE_ROUNDS = [
  { name:"XAUt Gold (1oz)",          change:0.4,   hint:"Fed held rates. Dollar weakened slightly." },
  { name:"1999 Charizard PSA 10",    change:-1.2,  hint:"eBay supply spike — 3 new graded copies listed." },
  { name:"Pappy Van Winkle 2021",    change:2.1,   hint:"Kentucky Derby weekend. Collector demand surging." },
  { name:"Rolex Submariner",         change:-0.8,  hint:"Secondary market soft. New model rumor dampening." },
  { name:"Amazing Fantasy #15",      change:1.5,   hint:"New Spider-Man film announcement lifted all silver-age." },
  { name:"Caroni 1998 Single Cask",  change:3.2,   hint:"Distillery closed. Remaining bottles increasingly rare." },
  { name:"NVDA Tokenized Equity",    change:2.8,   hint:"Strong earnings beat. AI chip demand outpacing supply." },
];
const MEMORY_PAIRS = ["1999 Charizard","Blanton's 1990","Rolex Sub","Amazing Fantasy","Luffy Gold","XAUt Gold","Sophia-Hed","Pappy Van Winkle","Justify","Sensation Comics #1","NVDA","Dark Charizard"];

function BrainGames({ onEarn }:{ onEarn:(n:number)=>void }) {
  const [gm,      setGm]      = useState<"select"|"trivia"|"oracle"|"memory">("select");
  const [qIdx,    setQIdx]    = useState(0);
  const [score,   setScore]   = useState(0);
  const [ans,     setAns]     = useState<number|null>(null);
  const [done,    setDone]    = useState(false);
  const [streak,  setStreak]  = useState(0);
  const [oIdx,    setOIdx]    = useState(0);
  const [oGuess,  setOGuess]  = useState<"up"|"down"|null>(null);
  const [oResult, setOResult] = useState<boolean|null>(null);
  const [oScore,  setOScore]  = useState(0);
  const [cards,   setCards]   = useState<Array<{id:number;label:string;flipped:boolean;matched:boolean}>>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [mScore,  setMScore]  = useState(0);
  const [moves,   setMoves]   = useState(0);
  const lockRef = useRef(false);

  function shuffle<T>(a:T[]):T[] { return [...a].sort(()=>Math.random()-0.5); }

  function initMemory() {
    const pairs = MEMORY_PAIRS.slice(0,6);
    const deck = shuffle([...pairs,...pairs].map((label,i)=>({id:i,label,flipped:false,matched:false})));
    setCards(deck); setFlipped([]); setMScore(0); setMoves(0);
  }

  function flipCard(i:number) {
    if(lockRef.current||flipped.length>=2||cards[i].flipped||cards[i].matched) return;
    const next=[...flipped,i];
    setCards(c=>c.map((x,idx)=>idx===i?{...x,flipped:true}:x));
    if(next.length===2) {
      setMoves(m=>m+1);
      const [a,b]=next;
      lockRef.current=true;
      if(cards[a].label===cards[b].label) {
        setTimeout(()=>{
          setCards(c=>c.map(x=>x.label===cards[a].label?{...x,matched:true}:x));
          setFlipped([]); setMScore(s=>s+40); onEarn(40); lockRef.current=false;
        },400);
      } else {
        setTimeout(()=>{ setCards(c=>c.map((x,idx)=>next.includes(idx)&&!x.matched?{...x,flipped:false}:x)); setFlipped([]); lockRef.current=false; },900);
      }
    } else setFlipped(next);
  }

  function answerTrivia(i:number) {
    if(ans!==null) return;
    setAns(i);
    const correct = i===TRIVIA[qIdx].a;
    const bonus = correct&&streak>=2?Math.round(TRIVIA[qIdx].r*0.5):0;
    if(correct){ const earn=TRIVIA[qIdx].r+bonus; setScore(s=>s+earn); setStreak(k=>k+1); onEarn(earn); }
    else setStreak(0);
    setTimeout(()=>{ if(qIdx+1>=TRIVIA.length) setDone(true); else{setQIdx(q=>q+1);setAns(null);} },1300);
  }

  function guessOracle(g:"up"|"down") {
    if(oGuess!==null) return;
    const r=ORACLE_ROUNDS[oIdx];
    const correct = g==="up"?r.change>0:r.change<0;
    setOGuess(g); setOResult(correct);
    if(correct){ setOScore(s=>s+65); onEarn(65); }
    setTimeout(()=>{ if(oIdx+1>=ORACLE_ROUNDS.length) setDone(true); else{setOIdx(o=>o+1);setOGuess(null);setOResult(null);} },1500);
  }

  function resetAll() { setQIdx(0);setScore(0);setAns(null);setDone(false);setStreak(0);setOIdx(0);setOGuess(null);setOResult(null);setOScore(0);setMScore(0);setMoves(0); }

  const totalScore=score+oScore+mScore;

  return (
    <div style={{ maxWidth:"520px",margin:"0 auto" }}>
      <div style={{ textAlign:"center",marginBottom:"1rem" }}>
        <p style={{ fontSize:"0.44rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 0.25rem" }}>Cognitive Training</p>
        <h2 style={{ fontWeight:900,fontSize:"1.1rem",background:"linear-gradient(135deg,#a855f7,#60A5FA)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 0.2rem",letterSpacing:"-0.02em" }}>Circuit Brain Games</h2>
        <p style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.3)",margin:0 }}>Sophia Agents guide you · Earn $ABRA + Arena buffs · Sessions under 90 seconds</p>
      </div>
      {gm==="select"&&(
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.625rem" }}>
          {[
            { id:"trivia",  label:"Sovereign Trivia",   sub:`${TRIVIA.length} questions · streak bonus`,    color:"#a855f7" },
            { id:"oracle",  label:"Oracle Gauntlet",    sub:`${ORACLE_ROUNDS.length} rounds · price calls`, color:"#14F195" },
            { id:"memory",  label:"Asset Memory Match", sub:"6 pairs · +40$A per match",                    color:"#6b8cff" },
          ].map(g=>(
            <button key={g.id} onClick={()=>{setGm(g.id as "trivia"|"oracle"|"memory");resetAll();if(g.id==="memory")initMemory();}} style={{ textAlign:"left",padding:"1rem 0.875rem",borderRadius:"10px",background:"rgba(6,8,16,0.97)",border:`1px solid ${g.color}20`,cursor:"pointer",transition:"border-color 0.15s" }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=g.color+"50";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=g.color+"20";}}>
              <div style={{ width:"8px",height:"8px",borderRadius:"50%",background:g.color,marginBottom:"0.5rem",boxShadow:`0 0 6px ${g.color}` }} />
              <div style={{ fontWeight:800,fontSize:"0.72rem",color:g.color,marginBottom:"0.2rem",letterSpacing:"-0.01em" }}>{g.label}</div>
              <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.35)",lineHeight:1.5 }}>{g.sub}</div>
            </button>
          ))}
        </div>
      )}
      {gm==="trivia"&&!done&&(
        <div style={{ background:"rgba(6,8,16,0.97)",border:"1px solid rgba(168,85,247,0.18)",borderRadius:"12px",padding:"1.25rem" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"0.875rem",alignItems:"center" }}>
            <div>
              <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace" }}>Question {qIdx+1} of {TRIVIA.length}</span>
              {streak>=2&&<span style={{ marginLeft:"0.5rem",fontSize:"0.44rem",color:"#FBBF24",fontFamily:"'JetBrains Mono',monospace",fontWeight:700 }}>{streak}x Streak</span>}
            </div>
            <span style={{ fontSize:"0.52rem",color:"#a855f7",fontWeight:700,fontFamily:"'JetBrains Mono',monospace" }}>{score} $ABRA</span>
          </div>
          <div style={{ fontWeight:700,fontSize:"0.8rem",color:"#f0f0f0",lineHeight:1.55,marginBottom:"0.875rem" }}>{TRIVIA[qIdx].q}</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem" }}>
            {TRIVIA[qIdx].opts.map((opt,i)=>{
              const correct=i===TRIVIA[qIdx].a,selected=ans===i,shown=ans!==null;
              return <button key={i} onClick={()=>answerTrivia(i)} disabled={shown} style={{ padding:"0.45rem 0.5rem",borderRadius:"7px",border:`1px solid ${shown?(correct?"rgba(20,241,149,0.5)":selected?"rgba(242,107,107,0.4)":"rgba(255,255,255,0.06)"):"rgba(255,255,255,0.1)"}`,background:shown?(correct?"rgba(20,241,149,0.1)":selected?"rgba(242,107,107,0.08)":"rgba(255,255,255,0.02)"):"rgba(255,255,255,0.03)",color:shown?(correct?"#14F195":selected?"#f26b6b":"rgba(255,255,255,0.28)"):"rgba(255,255,255,0.7)",fontSize:"0.58rem",cursor:shown?"default":"pointer",fontWeight:shown&&(correct||selected)?700:400,textAlign:"left" }}>{opt}</button>;
            })}
          </div>
          {ans!==null&&<div style={{ marginTop:"0.5rem",fontSize:"0.48rem",color:ans===TRIVIA[qIdx].a?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace",textAlign:"center",fontWeight:700 }}>{ans===TRIVIA[qIdx].a?`+${TRIVIA[qIdx].r}${streak>=2?` +${Math.round(TRIVIA[qIdx].r*0.5)} streak bonus`:""} $ABRA earned`:"No points this round"}</div>}
        </div>
      )}
      {gm==="oracle"&&!done&&(
        <div style={{ background:"rgba(6,8,16,0.97)",border:"1px solid rgba(20,241,149,0.18)",borderRadius:"12px",padding:"1.25rem" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"0.875rem" }}>
            <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace" }}>Round {oIdx+1} of {ORACLE_ROUNDS.length}</span>
            <span style={{ fontSize:"0.52rem",color:"#14F195",fontWeight:700,fontFamily:"'JetBrains Mono',monospace" }}>{oScore} $ABRA</span>
          </div>
          <div style={{ fontWeight:800,fontSize:"0.88rem",color:"#f0f0f0",marginBottom:"0.3rem" }}>{ORACLE_ROUNDS[oIdx].name}</div>
          <div style={{ fontSize:"0.54rem",color:"rgba(255,255,255,0.42)",marginBottom:"0.875rem",padding:"0.45rem 0.625rem",background:"rgba(168,85,247,0.05)",border:"1px solid rgba(168,85,247,0.12)",borderRadius:"6px",lineHeight:1.6 }}>
            <span style={{ color:"#a855f7",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:"0.44rem" }}>Sophia · </span>
            {ORACLE_ROUNDS[oIdx].hint}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem" }}>
            {(["up","down"] as const).map(g=>(
              <button key={g} onClick={()=>guessOracle(g)} disabled={oGuess!==null} style={{ padding:"0.75rem",borderRadius:"8px",border:`1px solid ${oGuess===null?"rgba(255,255,255,0.1)":oGuess===g?(oResult?"rgba(20,241,149,0.5)":"rgba(242,107,107,0.5)"):"rgba(255,255,255,0.05)"}`,background:oGuess===null?"rgba(255,255,255,0.03)":oGuess===g?(oResult?"rgba(20,241,149,0.1)":"rgba(242,107,107,0.1)"):"rgba(255,255,255,0.01)",color:g==="up"?"#14F195":"#f26b6b",fontWeight:800,fontSize:"0.82rem",cursor:oGuess===null?"pointer":"default",fontFamily:"'JetBrains Mono',monospace" }}>
                {g==="up"?"UP ▲":"DOWN ▼"}
              </button>
            ))}
          </div>
          {oGuess&&<div style={{ marginTop:"0.5rem",textAlign:"center",fontSize:"0.58rem",fontWeight:700,color:oResult?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace" }}>{oResult?`Correct +65 $ABRA · Change: ${ORACLE_ROUNDS[oIdx].change>0?"+":""}${ORACLE_ROUNDS[oIdx].change}%`:`Incorrect · Change: ${ORACLE_ROUNDS[oIdx].change>0?"+":""}${ORACLE_ROUNDS[oIdx].change}%`}</div>}
        </div>
      )}
      {gm==="memory"&&!done&&cards.length>0&&(
        <div style={{ background:"rgba(6,8,16,0.97)",border:"1px solid rgba(107,140,255,0.18)",borderRadius:"12px",padding:"1.25rem" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"0.75rem" }}>
            <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace" }}>Moves: {moves} · Matched: {cards.filter(c=>c.matched).length/2} of 6</span>
            <span style={{ fontSize:"0.52rem",color:"#6b8cff",fontWeight:700,fontFamily:"'JetBrains Mono',monospace" }}>{mScore} $ABRA</span>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.4rem" }}>
            {cards.map((card,i)=>(
              <button key={card.id} onClick={()=>flipCard(i)} style={{ height:"68px",borderRadius:"8px",border:`1px solid ${card.matched?"rgba(20,241,149,0.4)":card.flipped?"rgba(107,140,255,0.4)":"rgba(255,255,255,0.08)"}`,background:card.matched?"rgba(20,241,149,0.07)":card.flipped?"rgba(107,140,255,0.09)":"rgba(6,8,16,0.98)",cursor:card.flipped||card.matched?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",fontSize:"0.44rem",fontWeight:card.flipped||card.matched?700:400,color:card.matched?"#14F195":card.flipped?"#6b8cff":"rgba(255,255,255,0.12)",fontFamily:"'JetBrains Mono',monospace",padding:"4px",textAlign:"center",lineHeight:1.3 }}>
                {(card.flipped||card.matched)?card.label:"◈"}
              </button>
            ))}
          </div>
          <div style={{ marginTop:"0.5rem",fontSize:"0.44rem",color:"rgba(255,255,255,0.22)",fontFamily:"'JetBrains Mono',monospace",textAlign:"center" }}>Each matched pair · +40 $ABRA · Fewer moves = higher score</div>
        </div>
      )}
      {done&&(
        <div style={{ background:"rgba(6,8,16,0.97)",border:"1px solid rgba(168,85,247,0.25)",borderRadius:"12px",padding:"1.5rem",textAlign:"center" }}>
          <div style={{ fontSize:"0.44rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.3rem" }}>Session Complete</div>
          <div style={{ fontWeight:900,fontSize:"1.25rem",background:"linear-gradient(135deg,#a855f7,#FBBF24)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:"0.2rem" }}>+{totalScore} $ABRA</div>
          <div style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.35)",marginBottom:"1rem" }}>Earned this session · Auto-staking to $ABRA Vault</div>
          <div style={{ display:"flex",gap:"0.5rem",justifyContent:"center" }}>
            <button onClick={()=>{resetAll();if(gm==="memory")initMemory();}} style={{ padding:"0.4rem 1rem",borderRadius:"7px",background:"rgba(168,85,247,0.1)",border:"1px solid rgba(168,85,247,0.25)",color:"#a855f7",fontSize:"0.62rem",fontWeight:700,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>Play Again</button>
            <button onClick={()=>{resetAll();setGm("select");}} style={{ padding:"0.4rem 1rem",borderRadius:"7px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.38)",fontSize:"0.62rem",fontWeight:700,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>All Games</button>
          </div>
        </div>
      )}
      {gm!=="select"&&!done&&<button onClick={()=>{resetAll();setGm("select");}} style={{ marginTop:"0.625rem",display:"block",width:"100%",padding:"0.32rem",borderRadius:"6px",background:"none",border:"1px solid rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.25)",fontSize:"0.5rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",textAlign:"center" }}>← Return to Game Selection</button>}
    </div>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
const MOCK_LEADERS = [
  { wallet:"7xA3…mK9f", rank:"Sovereign", score:9820, wins:34, abra:4420 },
  { wallet:"Db6R…xQ2p", rank:"Platinum",  score:7140, wins:27, abra:3210 },
  { wallet:"CQ1U…dJGd", rank:"Platinum",  score:6890, wins:24, abra:2980 },
  { wallet:"9G4k…Fa2m", rank:"Gold",      score:5330, wins:19, abra:2100 },
  { wallet:"HeFq…wZq5", rank:"Gold",      score:4810, wins:16, abra:1880 },
  { wallet:"8bBx…pf58", rank:"Silver",    score:3620, wins:12, abra:1420 },
  { wallet:"You",        rank:"Bronze",    score:1000, wins:0,  abra:0    },
];
function Leaderboard({ abraEarned, wins }:{ abraEarned:number; wins:number }) {
  const leaders=[...MOCK_LEADERS].map(l=>l.wallet==="You"?{...l,score:1000+wins*120,wins,abra:abraEarned}:l).sort((a,b)=>b.score-a.score);
  return (
    <div style={{ maxWidth:"500px",margin:"0 auto" }}>
      <div style={{ textAlign:"center",marginBottom:"1rem" }}>
        <p style={{ fontSize:"0.44rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 0.25rem" }}>Season 1 · Global Rankings</p>
        <h2 style={{ fontWeight:900,fontSize:"1.1rem",background:"linear-gradient(135deg,#D4AF37,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0,letterSpacing:"-0.02em" }}>Sovereign Leaderboard</h2>
      </div>
      {leaders.map((l,i)=>{
        const rc=RANK_COLORS[l.rank as keyof typeof RANK_COLORS]??"#f0f0f0";
        const isYou=l.wallet==="You";
        return (
          <div key={l.wallet} style={{ padding:"0.5rem 0.75rem",background:isYou?"rgba(212,175,55,0.05)":"rgba(6,8,16,0.97)",border:`1px solid ${isYou?"rgba(212,175,55,0.25)":"rgba(255,255,255,0.04)"}`,borderRadius:"8px",marginBottom:"0.3rem",display:"grid",gridTemplateColumns:"1.5rem 1fr auto",gap:"0.5rem",alignItems:"center" }}>
            <span style={{ fontSize:"0.58rem",fontWeight:900,color:i<3?"#FBBF24":"rgba(255,255,255,0.28)",textAlign:"center",fontFamily:"'JetBrains Mono',monospace" }}>{i+1}</span>
            <div>
              <div style={{ fontSize:"0.56rem",fontWeight:isYou?800:500,color:isYou?"#D4AF37":"#f0f0f0",fontFamily:"'JetBrains Mono',monospace" }}>{l.wallet}</div>
              <div style={{ display:"flex",gap:"0.5rem" }}>
                <span style={{ fontSize:"0.42rem",fontWeight:700,color:rc,fontFamily:"'JetBrains Mono',monospace" }}>{l.rank}</span>
                <span style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace" }}>{l.wins}W · {l.abra.toLocaleString()}$A</span>
              </div>
            </div>
            <span style={{ fontSize:"0.58rem",fontWeight:700,color:rc,fontFamily:"'JetBrains Mono',monospace",fontVariantNumeric:"tabular-nums" }}>{l.score.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Game Modes Hub — Billion-Dollar Styling ──────────────────────────────────
export function GameModesHub({ assets }:{ assets:GameAsset[] }) {
  const [mode,      setMode]      = useState<"hub"|"claw"|"chase"|"brain"|"leaderboard">("hub");
  const [totalAbra, setTotalAbra] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [session,   setSession]   = useState(0);

  function earn(n:number) { setTotalAbra(a=>a+n); setSession(s=>s+n); }

  const MODES = [
    {
      id:"claw",        color:"#D4AF37",
      title:"AbraxClaw Gacha Machine",
      sub:"Rarity-weighted asset pulls. Legendary odds: 0.5%.",
      detail:"Deploy the mechanical claw into the prize pool. Rarer assets yield exponentially more $ABRA. Combo streaks unlock bonus multipliers.",
    },
    {
      id:"chase",       color:"#14F195",
      title:"Chase Markets",
      sub:"CALL or SHORT tokenized RWA prices. Bullish positions pay +18%.",
      detail:"Place directional bets on any asset in the Abraxas ecosystem. CALL positions carry an 18% long bonus — reflecting the protocol's bullish RWA thesis.",
    },
    {
      id:"brain",       color:"#a855f7",
      title:"Circuit Brain Games",
      sub:"Sovereign Trivia · Oracle Gauntlet · Memory Match.",
      detail:"Three cognitive disciplines, each under 90 seconds. Sophia Agents provide hints. Streak bonuses compound your $ABRA rewards.",
    },
    {
      id:"leaderboard", color:"#C8A96E",
      title:"Sovereign Leaderboard",
      sub:"Global ELO rankings. Season 1 in progress.",
      detail:"Every Arena battle, gacha pull, and brain game feeds your ELO score. Sovereign rank holders receive protocol fee distributions.",
    },
  ] as const;

  return (
    <div>
      {/* Session strip */}
      {session>0&&(
        <div style={{ marginBottom:"1rem",padding:"0.5rem 0.875rem",background:"rgba(212,175,55,0.06)",border:"1px solid rgba(212,175,55,0.18)",borderRadius:"8px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.38)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em" }}>Session Earnings</span>
          <span style={{ fontSize:"0.72rem",fontWeight:800,color:"#D4AF37",fontFamily:"'JetBrains Mono',monospace" }}>+{session.toLocaleString()} $ABRA</span>
        </div>
      )}

      {/* Mode selector tabs */}
      <div style={{ display:"flex",gap:"0.3rem",marginBottom:"1.25rem",flexWrap:"wrap" }}>
        <button onClick={()=>setMode("hub")} style={{ padding:"0.35rem 0.875rem",borderRadius:"6px",border:`1px solid ${mode==="hub"?"rgba(255,255,255,0.22)":"rgba(255,255,255,0.07)"}`,background:mode==="hub"?"rgba(255,255,255,0.07)":"transparent",color:mode==="hub"?"#f0f0f0":"rgba(255,255,255,0.3)",fontSize:"0.58rem",fontWeight:mode==="hub"?700:400,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em" }}>
          Overview
        </button>
        {MODES.map(m=>(
          <button key={m.id} onClick={()=>setMode(m.id)} style={{ padding:"0.35rem 0.875rem",borderRadius:"6px",border:`1px solid ${mode===m.id?m.color+"55":"rgba(255,255,255,0.07)"}`,background:mode===m.id?`${m.color}10`:"transparent",color:mode===m.id?m.color:"rgba(255,255,255,0.3)",fontSize:"0.58rem",fontWeight:mode===m.id?700:400,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",transition:"all 0.15s" }}>
            {m.title.split(" ")[0]}
          </button>
        ))}
      </div>

      {mode==="hub"&&(
        <div>
          <div style={{ marginBottom:"1.25rem" }}>
            <p style={{ fontSize:"0.44rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 0.3rem" }}>Abraxas Protocol · Game Economy</p>
            <h2 style={{ fontWeight:900,fontSize:"1.2rem",color:"#f0f0f0",margin:"0 0 0.4rem",letterSpacing:"-0.02em" }}>Game Modes</h2>
            <p style={{ fontSize:"0.58rem",color:"rgba(255,255,255,0.38)",margin:0,lineHeight:1.65,maxWidth:"540px" }}>
              Every mode earns $ABRA — which auto-stakes to your vault, earns 18–25% APY, and can be borrowed against via Loopscale. Play to earn. Vault to compound.
            </p>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,260px),1fr))",gap:"0.75rem" }}>
            {MODES.map(m=>(
              <button key={m.id} onClick={()=>setMode(m.id)} style={{ textAlign:"left",padding:"1.375rem 1.25rem",borderRadius:"12px",background:"rgba(6,8,16,0.97)",border:`1px solid ${m.color}18`,cursor:"pointer",transition:"border-color 0.18s,box-shadow 0.18s",display:"flex",flexDirection:"column",gap:"0.5rem" }}
                onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.borderColor=m.color+"45";el.style.boxShadow=`0 0 24px ${m.color}0E`;}}
                onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.borderColor=m.color+"18";el.style.boxShadow="none";}}>
                <div style={{ width:"10px",height:"10px",borderRadius:"50%",background:m.color,boxShadow:`0 0 8px ${m.color}` }} />
                <div>
                  <div style={{ fontWeight:900,fontSize:"0.88rem",color:"#f0f0f0",marginBottom:"0.2rem",letterSpacing:"-0.01em" }}>{m.title}</div>
                  <div style={{ fontSize:"0.5rem",color:m.color,marginBottom:"0.3rem",fontWeight:600 }}>{m.sub}</div>
                  <div style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.35)",lineHeight:1.6 }}>{m.detail}</div>
                </div>
                <div style={{ marginTop:"auto",display:"flex",alignItems:"center",gap:"0.25rem" }}>
                  <div style={{ width:"6px",height:"1px",background:`${m.color}60` }} />
                  <span style={{ fontSize:"0.44rem",color:m.color,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,letterSpacing:"0.1em" }}>ENTER →</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode==="claw"        &&<AbraxClaw    assets={assets}      onEarn={earn} />}
      {mode==="chase"       &&<ChaseMarkets assets={assets}      onEarn={earn} />}
      {mode==="brain"       &&<BrainGames                        onEarn={earn} />}
      {mode==="leaderboard" &&<Leaderboard  abraEarned={totalAbra} wins={totalWins} />}

      {/* $ABRA Utility — earn/spend/stake/burn */}
      {mode==="hub"&&(
        <div style={{ marginTop:"1.5rem",padding:"1.25rem",background:"rgba(200,169,110,0.04)",border:"1px solid rgba(200,169,110,0.15)",borderRadius:"14px" }}>
          <p style={{ fontSize:"0.44rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(200,169,110,0.5)",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 0.2rem" }}>Token Economics</p>
          <h3 style={{ fontWeight:900,fontSize:"0.92rem",color:"#f0f0f0",margin:"0 0 0.2rem",letterSpacing:"-0.01em" }}>$ABRA — The Blood of Abraxas</h3>
          <p style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.32)",margin:"0 0 0.875rem",lineHeight:1.6 }}>Play to earn. Stake for yield. Spend to level up. Burn for permanent power.</p>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,200px),1fr))",gap:"0.5rem",marginBottom:"0.875rem" }}>
            {([
              { a:"Earn",  c:"#14F195",items:["Arena battles (+50–200$A)","Gacha pulls (+20–250$A)","Brain Games (+40–65$A)","Daily quests (+100$A)"] },
              { a:"Spend", c:"#FBBF24",items:["Tokenization fee (50–250$A)","Premium gacha (100$A/pull)","Agent training acceleration","Arena entry & wagering"] },
              { a:"Stake", c:"#C8A96E",items:["Flexible: 18% APY","30-day lock: 21% APY","90-day lock: 25% APY","Borrow USDC at 50% LTV"] },
              { a:"Burn",  c:"#f26b6b",items:["+5% vault yield (permanent)","Ultra-rare pull guarantee","Agent trait unlock","Higher Loopscale LTV tier"] },
            ] as const).map(s=>(
              <div key={s.a} style={{ padding:"0.75rem",background:`${s.c}06`,border:`1px solid ${s.c}18`,borderRadius:"9px" }}>
                <div style={{ fontSize:"0.52rem",fontWeight:800,color:s.c,marginBottom:"0.3rem",letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace" }}>{s.a} $ABRA</div>
                {s.items.map(it=>(
                  <div key={it} style={{ display:"flex",gap:"0.3rem",marginBottom:"0.18rem",alignItems:"flex-start" }}>
                    <div style={{ width:"4px",height:"4px",borderRadius:"50%",background:s.c,flexShrink:0,marginTop:"0.3rem" }} />
                    <span style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.42)",lineHeight:1.5 }}>{it}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ display:"flex",gap:"0.5rem",flexWrap:"wrap" }}>
            <a href="https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS" target="_blank" rel="noopener noreferrer" style={{ padding:"0.45rem 1rem",borderRadius:"7px",background:"linear-gradient(135deg,#C8A96E,#FBBF24)",color:"#000",fontWeight:800,fontSize:"0.58rem",fontFamily:"'JetBrains Mono',monospace",textDecoration:"none" }}>Buy $ABRA on Jupiter →</a>
            <a href="/protect" style={{ padding:"0.45rem 1rem",borderRadius:"7px",background:"rgba(200,169,110,0.09)",border:"1px solid rgba(200,169,110,0.22)",color:"#C8A96E",fontWeight:700,fontSize:"0.58rem",fontFamily:"'JetBrains Mono',monospace",textDecoration:"none" }}>Vault $ABRA →</a>
          </div>
        </div>
      )}
    </div>
  );
}