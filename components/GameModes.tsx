// FILE: components/GameModes.tsx
// Game Modes Hub — AbraxClaw · Chase Markets · Brain Games · Leaderboard
// All self-contained, no external deps beyond loopscale lib.
"use client";

import { useState, useEffect, useRef } from "react";
import { getRank, RANK_COLORS, type EloState } from "@/lib/loopscale";

// ─── Shared types ─────────────────────────────────────────────────────────────
interface GameAsset {
  id: string; name: string; category: string; priceUsd: number; ticker: string;
  imagePath?: string|null; videoPath?: string|null; rarity: string;
  archetype?: string; archetype_color?: string; arena_buff?: string;
  can_borrow?: boolean; ltv?: number;
}
const CAT_COLOR: Record<string,string> = {
  Pokemon:"#FBBF24","One Piece":"#f26b6b",Comics:"#a855f7",
  Metals:"#D4AF37",Stocks:"#14F195",Watches:"#6b8cff",Sports:"#fb923c",Spirits:"#FF8C00",
};
function fmtUsd(v:number):string {
  if(v>=1_000_000) return `$${(v/1_000_000).toFixed(2)}M`;
  if(v>=1_000) return `$${(v/1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

// ─── AbraxClaw Machine ────────────────────────────────────────────────────────
const RARITY_WEIGHT: Record<string,number> = { Legendary:2,"Ultra Rare":8,"Rare Holo":25,Common:40 };

function AbraxClaw({ assets, onEarn }:{ assets:GameAsset[]; onEarn:(n:number)=>void }) {
  const [phase,    setPhase]    = useState<"idle"|"moving"|"grab"|"reveal"|"done">("idle");
  const [clawX,    setClawX]    = useState(50);
  const [found,    setFound]    = useState<GameAsset|null>(null);
  const [tickets,  setTickets]  = useState(3);
  const [history,  setHistory]  = useState<Array<{name:string;rarity:string;val:number}>>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clear() { timers.current.forEach(clearTimeout); timers.current=[]; }
  useEffect(()=>()=>clear(),[]);

  function pull() {
    if(tickets<=0||phase!=="idle") return;
    setTickets(t=>t-1); setFound(null); setPhase("moving");
    const tx = 15+Math.random()*70; setClawX(tx);
    const t1=setTimeout(()=>setPhase("grab"),950);
    const t2=setTimeout(()=>{
      const eligible=assets.filter(a=>a.priceUsd<25000);
      const total=eligible.reduce((s,a)=>s+(RARITY_WEIGHT[a.rarity]??20),0);
      let r=Math.random()*total; let pick=eligible[0];
      for(const a of eligible){ r-=(RARITY_WEIGHT[a.rarity]??20); if(r<=0){pick=a;break;} }
      setFound(pick);
      setHistory(h=>[{name:pick.name,rarity:pick.rarity,val:pick.priceUsd},...h.slice(0,4)]);
      onEarn(pick.rarity==="Legendary"?120:pick.rarity==="Ultra Rare"?60:25);
      setPhase("reveal");
    },1900);
    const t3=setTimeout(()=>setPhase("done"),3000);
    timers.current=[t1,t2,t3];
  }

  const catColor = found?(CAT_COLOR[found.category]??"#6b8cff"):"#6b8cff";

  return (
    <div style={{ maxWidth:"420px", margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:"0.875rem" }}>
        <div style={{ fontWeight:900, fontSize:"1rem", background:"linear-gradient(135deg,#FBBF24,#FF6B35)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>AbraxClaw Machine</div>
        <div style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>Rarity-weighted pulls · {tickets} tickets · Legendary = ultra-rare</div>
      </div>

      {/* Machine */}
      <div style={{ position:"relative", background:"rgba(6,8,16,0.97)", border:"2px solid rgba(251,191,36,0.25)", borderRadius:"16px", overflow:"hidden", height:"310px", marginBottom:"0.75rem" }}>
        {/* Claw */}
        <div style={{ position:"absolute", top:0, left:`${clawX}%`, transform:"translateX(-50%)", transition:"left 0.9s cubic-bezier(0.34,1.56,0.64,1)", zIndex:10 }}>
          <div style={{ width:"3px", height:phase==="grab"||phase==="reveal"?"170px":phase==="idle"?"55px":"125px", background:`linear-gradient(to bottom,rgba(212,175,55,0.9),rgba(212,175,55,0.4))`, margin:"0 auto", transition:"height 0.55s ease-in-out", borderRadius:"1px" }} />
          <div style={{ width:"22px", height:"16px", margin:"-4px auto 0", background:"rgba(212,175,55,0.7)", borderRadius:"0 0 10px 10px", clipPath:"polygon(10% 0,90% 0,100% 100%,0 100%)" }} />
        </div>

        {/* Prize display */}
        <div style={{ position:"absolute", bottom:"1rem", left:0, right:0, display:"flex", flexWrap:"wrap", gap:"6px", padding:"0 1rem", justifyContent:"center" }}>
          {assets.slice(0,16).map(a=>(
            <div key={a.id} style={{ width:"50px", height:"66px", borderRadius:"6px", background:`${CAT_COLOR[a.category]??"#6b8cff"}15`, border:`1px solid ${CAT_COLOR[a.category]??"#6b8cff"}30`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
              {a.imagePath?<img src={a.imagePath} alt={a.name} style={{ width:"100%",height:"100%",objectFit:"contain" }} loading="lazy" />
                :<span style={{ fontSize:"0.38rem",color:CAT_COLOR[a.category]??"#6b8cff",fontWeight:700,textAlign:"center",padding:"2px" }}>{a.name.slice(0,10)}</span>}
            </div>
          ))}
        </div>

        {/* Reveal overlay */}
        {(phase==="reveal"||phase==="done")&&found&&(
          <div style={{ position:"absolute",inset:0,background:"rgba(2,3,10,0.94)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.5rem" }}>
            <div style={{ fontSize:"0.54rem",fontWeight:700,color:"#FBBF24",letterSpacing:"0.2em",fontFamily:"'JetBrains Mono',monospace" }}>GRABBED</div>
            <div style={{ width:"88px",height:"116px",borderRadius:"10px",border:`2px solid ${catColor}`,overflow:"hidden",background:`${catColor}10`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 28px ${catColor}55` }}>
              {found.imagePath?<img src={found.imagePath} alt={found.name} style={{ width:"100%",height:"100%",objectFit:"contain" }} />
                :<span style={{ fontSize:"0.5rem",color:catColor,fontWeight:700,textAlign:"center",padding:"6px" }}>{found.name}</span>}
            </div>
            <div style={{ fontWeight:800,fontSize:"0.88rem",color:catColor }}>{found.name}</div>
            <div style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.5)",fontFamily:"'JetBrains Mono',monospace" }}>{found.rarity} · {fmtUsd(found.priceUsd)}</div>
            {found.arena_buff&&<div style={{ fontSize:"0.44rem",padding:"0.08rem 0.32rem",borderRadius:"3px",background:"rgba(168,85,247,0.15)",border:"1px solid rgba(168,85,247,0.35)",color:"#a855f7",fontFamily:"'JetBrains Mono',monospace" }}>{found.arena_buff}</div>}
            <div style={{ fontSize:"0.44rem",color:"#14F195",fontFamily:"'JetBrains Mono',monospace" }}>+{found.rarity==="Legendary"?120:found.rarity==="Ultra Rare"?60:25} $ABRA</div>
            {phase==="done"&&<button onClick={()=>{setPhase("idle");setFound(null);setClawX(50);}} style={{ marginTop:"0.25rem",padding:"0.28rem 0.75rem",borderRadius:"6px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.45)",fontSize:"0.58rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>Add to Vault →</button>}
          </div>
        )}

        {/* State badge */}
        <div style={{ position:"absolute",top:"0.5rem",right:"0.5rem",padding:"0.12rem 0.38rem",borderRadius:"4px",background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.28)",fontSize:"0.42rem",fontWeight:700,color:"#FBBF24",fontFamily:"'JetBrains Mono',monospace" }}>
          {phase==="idle"?"READY":phase==="moving"?"TARGETING":phase==="grab"?"GRABBING":phase==="reveal"?"RETRIEVING":"DONE"}
        </div>
      </div>

      <button onClick={pull} disabled={tickets<=0||phase!=="idle"} style={{ width:"100%",padding:"0.625rem",borderRadius:"9px",border:"none",fontWeight:900,fontSize:"0.82rem",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",cursor:tickets>0&&phase==="idle"?"pointer":"not-allowed",background:tickets>0&&phase==="idle"?"linear-gradient(135deg,#FBBF24,#FF6B35)":"rgba(255,255,255,0.05)",color:tickets>0&&phase==="idle"?"#000":"rgba(255,255,255,0.2)",boxShadow:tickets>0&&phase==="idle"?"0 0 24px rgba(251,191,36,0.35)":"none" }}>
        {tickets>0?`Drop the Claw! (${tickets} left)`:"No Tickets — Win Battles to Earn More"}
      </button>

      {/* Pull history */}
      {history.length>0&&(
        <div style={{ marginTop:"0.625rem" }}>
          <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",marginBottom:"0.25rem" }}>Recent Pulls</div>
          {history.map((h,i)=>(
            <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"0.2rem 0.4rem",borderRadius:"4px",background:i===0?"rgba(251,191,36,0.05)":"transparent" }}>
              <span style={{ fontSize:"0.5rem",color:i===0?"#FBBF24":"rgba(255,255,255,0.4)",fontFamily:"'JetBrains Mono',monospace" }}>{h.name}</span>
              <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>{h.rarity} · {fmtUsd(h.val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Chase Markets ────────────────────────────────────────────────────────────
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

  function toast_(msg:string) { setToast(msg); setTimeout(()=>setToast(null),2800); }

  const list = assets.filter(a=>a.name.toLowerCase().includes(search.toLowerCase())||a.ticker.toLowerCase().includes(search.toLowerCase())).slice(0,14);

  const maxPay = Math.round(wager*(dir==="CALL"?CALL_MULT:1.0)*1.85);

  function place() {
    if(!sel||wager<=0) return;
    const pos:Position = { id:Date.now().toString(), asset:sel.name, ticker:sel.ticker, direction:dir, target, wager, expiry, openPrice:sel.priceUsd, status:"open", payout:maxPay };
    setPositions(p=>[pos,...p.slice(0,9)]);
    toast_(`${dir} ${sel.ticker} +${target}% · ${wager} $ABRA wagered`);
    setSel(null); setTab("positions");
  }

  function settle(id:string) {
    setPositions(p=>p.map(pos=>{
      if(pos.id!==id) return pos;
      // CALL wins 58% (bullish bias), PUT wins 42%
      const won = pos.direction==="CALL"?Math.random()<0.58:Math.random()<0.42;
      if(won) onEarn(pos.payout);
      toast_(won?`${pos.direction} WON · +${pos.payout} $ABRA!`:`${pos.direction} expired worthless`);
      return {...pos,status:won?"won":"lost"};
    }));
  }

  const openCount  = positions.filter(p=>p.status==="open").length;
  const wonCount   = positions.filter(p=>p.status==="won").length;
  const totalWon   = positions.filter(p=>p.status==="won").reduce((s,p)=>s+p.payout,0);

  return (
    <div style={{ maxWidth:"620px", margin:"0 auto" }}>
      {toast&&<div style={{ position:"fixed",top:"80px",left:"50%",transform:"translateX(-50%)",zIndex:999,padding:"0.45rem 1.25rem",borderRadius:"8px",background:"rgba(20,241,149,0.15)",border:"1px solid rgba(20,241,149,0.4)",color:"#14F195",fontSize:"0.58rem",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap",boxShadow:"0 0 20px rgba(20,241,149,0.2)" }}>{toast}</div>}

      <div style={{ textAlign:"center",marginBottom:"0.875rem" }}>
        <div style={{ fontWeight:900,fontSize:"1rem",background:"linear-gradient(135deg,#14F195,#6b8cff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>Chase Markets</div>
        <div style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.4)",fontFamily:"'JetBrains Mono',monospace" }}>Bullish on RWAs · CALLs pay {Math.round((CALL_MULT-1)*100)}% more · Simplified options</div>
      </div>

      {/* Stats strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.35rem",marginBottom:"0.875rem" }}>
        {([["Open",String(openCount),"#FBBF24"],["Wins",String(wonCount),"#14F195"],["Earned",`${totalWon}$A`,"#C8A96E"],["Call Bonus",`+${Math.round((CALL_MULT-1)*100)}%`,"#6b8cff"]] as [string,string,string][]).map(([l,v,c])=>(
          <div key={l} style={{ padding:"0.35rem 0.5rem",background:"rgba(6,8,16,0.97)",border:`1px solid ${c}18`,borderRadius:"7px",textAlign:"center" }}>
            <div style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"1px" }}>{l}</div>
            <div style={{ fontSize:"0.65rem",fontWeight:700,color:c,fontFamily:"'JetBrains Mono',monospace" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{ display:"flex",gap:"0.25rem",marginBottom:"0.75rem" }}>
        {(["build","positions"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:"0.28rem 0.75rem",borderRadius:"5px",border:`1px solid ${tab===t?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.07)"}`,background:tab===t?"rgba(255,255,255,0.08)":"transparent",color:tab===t?"#f0f0f0":"rgba(255,255,255,0.35)",fontSize:"0.58rem",fontWeight:tab===t?700:400,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>
            {t==="build"?"Build Position":(`Positions (${openCount} open)`)}
          </button>
        ))}
      </div>

      {tab==="build"&&(
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.875rem" }}>
          {/* Asset picker */}
          <div style={{ background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"12px",padding:"0.875rem" }}>
            <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.35rem",textTransform:"uppercase" }}>Select Asset</div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ticker or name…" style={{ width:"100%",padding:"0.28rem 0.5rem",borderRadius:"5px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#f0f0f0",fontSize:"0.54rem",fontFamily:"'JetBrains Mono',monospace",outline:"none",boxSizing:"border-box",marginBottom:"0.35rem" }} />
            <div style={{ maxHeight:"210px",overflowY:"auto" }}>
              {list.map(a=>(
                <div key={a.id} onClick={()=>setSel(a)} style={{ padding:"0.25rem 0.4rem",borderRadius:"5px",cursor:"pointer",marginBottom:"2px",display:"flex",justifyContent:"space-between",alignItems:"center",background:sel?.id===a.id?`${CAT_COLOR[a.category]??"#6b8cff"}12`:"rgba(255,255,255,0.015)",border:`1px solid ${sel?.id===a.id?(CAT_COLOR[a.category]??"#6b8cff")+"44":"transparent"}`,transition:"background 0.1s" }}>
                  <div>
                    <span style={{ fontSize:"0.54rem",color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace",fontWeight:500 }}>{a.ticker}</span>
                    <span style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.3)",marginLeft:"0.35rem" }}>{a.name.slice(0,18)}</span>
                  </div>
                  <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.4)",fontVariantNumeric:"tabular-nums",fontFamily:"'JetBrains Mono',monospace" }}>{fmtUsd(a.priceUsd)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Builder */}
          <div style={{ background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"12px",padding:"0.875rem" }}>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.35rem",marginBottom:"0.625rem" }}>
              {(["CALL","PUT"] as const).map(d=>(
                <button key={d} onClick={()=>setDir(d)} style={{ padding:"0.4rem",borderRadius:"6px",border:`1px solid ${dir===d?(d==="CALL"?"rgba(20,241,149,0.45)":"rgba(242,107,107,0.45)"):"rgba(255,255,255,0.08)"}`,background:dir===d?(d==="CALL"?"rgba(20,241,149,0.09)":"rgba(242,107,107,0.09)"):"transparent",color:dir===d?(d==="CALL"?"#14F195":"#f26b6b"):"rgba(255,255,255,0.38)",fontWeight:dir===d?800:400,fontSize:"0.7rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>
                  {d==="CALL"?"▲ CALL":"▼ PUT"}
                </button>
              ))}
            </div>
            <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.2rem" }}>TARGET MOVE</div>
            <div style={{ display:"flex",gap:"0.2rem",marginBottom:"0.5rem" }}>
              {[5,10,15,25,50].map(t=>(
                <button key={t} onClick={()=>setTarget(t)} style={{ flex:1,padding:"0.2rem",borderRadius:"4px",border:`1px solid ${target===t?"rgba(251,191,36,0.45)":"rgba(255,255,255,0.07)"}`,background:target===t?"rgba(251,191,36,0.09)":"transparent",color:target===t?"#FBBF24":"rgba(255,255,255,0.3)",fontSize:"0.46rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>{t}%</button>
              ))}
            </div>
            <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.2rem" }}>WAGER ($ABRA)</div>
            <div style={{ display:"flex",gap:"0.2rem",marginBottom:"0.5rem" }}>
              {[25,50,100,250,500].map(w=>(
                <button key={w} onClick={()=>setWager(w)} style={{ flex:1,padding:"0.18rem",borderRadius:"4px",border:`1px solid ${wager===w?"rgba(107,140,255,0.45)":"rgba(255,255,255,0.07)"}`,background:wager===w?"rgba(107,140,255,0.09)":"transparent",color:wager===w?"#6b8cff":"rgba(255,255,255,0.3)",fontSize:"0.44rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>{w}</button>
              ))}
            </div>
            <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.2rem" }}>EXPIRY</div>
            <div style={{ display:"flex",gap:"0.2rem",flexWrap:"wrap",marginBottom:"0.625rem" }}>
              {EXPIRY.map(e=>(
                <button key={e} onClick={()=>setExpiry(e)} style={{ padding:"0.16rem 0.38rem",borderRadius:"4px",border:`1px solid ${expiry===e?"rgba(255,255,255,0.28)":"rgba(255,255,255,0.07)"}`,background:expiry===e?"rgba(255,255,255,0.07)":"transparent",color:expiry===e?"#f0f0f0":"rgba(255,255,255,0.28)",fontSize:"0.42rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>{e}</button>
              ))}
            </div>
            {sel&&(
              <div style={{ padding:"0.35rem 0.5rem",borderRadius:"6px",background:dir==="CALL"?"rgba(20,241,149,0.05)":"rgba(242,107,107,0.05)",border:`1px solid ${dir==="CALL"?"rgba(20,241,149,0.18)":"rgba(242,107,107,0.18)"}`,marginBottom:"0.5rem" }}>
                <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.45)",fontFamily:"'JetBrains Mono',monospace" }}>{dir} {sel.ticker} {dir==="CALL"?"+":""}{target}% · {expiry}</div>
                <div style={{ fontSize:"0.6rem",fontWeight:700,color:dir==="CALL"?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace" }}>Max payout: {maxPay} $ABRA{dir==="CALL"?` (+${Math.round((CALL_MULT-1)*100)}% bull bonus)`:""}</div>
              </div>
            )}
            <button onClick={place} disabled={!sel} style={{ width:"100%",padding:"0.45rem",borderRadius:"7px",border:"none",fontWeight:800,fontSize:"0.68rem",fontFamily:"'JetBrains Mono',monospace",cursor:sel?"pointer":"not-allowed",background:sel?(dir==="CALL"?"linear-gradient(135deg,#14F195,#6b8cff)":"linear-gradient(135deg,#f26b6b,#FF6B35)"):"rgba(255,255,255,0.04)",color:sel?"#000":"rgba(255,255,255,0.2)" }}>
              {sel?`Place ${dir} →`:"Select an Asset First"}
            </button>
          </div>
        </div>
      )}

      {tab==="positions"&&(
        <div>
          {positions.length===0&&<div style={{ padding:"2rem",textAlign:"center",fontSize:"0.6rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace" }}>No positions yet — build one first</div>}
          {positions.map(p=>(
            <div key={p.id} style={{ padding:"0.5rem 0.75rem",background:"rgba(6,8,16,0.97)",border:`1px solid ${p.status==="won"?"rgba(20,241,149,0.28)":p.status==="lost"?"rgba(242,107,107,0.18)":p.direction==="CALL"?"rgba(20,241,149,0.12)":"rgba(242,107,107,0.12)"}`,borderRadius:"8px",marginBottom:"0.35rem",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <span style={{ fontWeight:700,fontSize:"0.62rem",color:p.direction==="CALL"?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace" }}>{p.direction}</span>
                <span style={{ fontSize:"0.56rem",color:"rgba(255,255,255,0.55)",marginLeft:"0.4rem",fontFamily:"'JetBrains Mono',monospace" }}>{p.ticker} {p.direction==="CALL"?"+":""}{p.target}% · {p.wager}$A · {p.expiry}</span>
                {p.status!=="open"&&<div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace" }}>Open @ {fmtUsd(p.openPrice)}</div>}
              </div>
              {p.status==="open"
                ?<button onClick={()=>settle(p.id)} style={{ padding:"0.18rem 0.5rem",borderRadius:"4px",background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.3)",color:"#FBBF24",fontSize:"0.48rem",fontWeight:700,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>Settle</button>
                :<span style={{ fontSize:"0.56rem",fontWeight:700,color:p.status==="won"?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace" }}>{p.status==="won"?`+${p.payout}$A`:"EXPIRED"}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Brain Games ──────────────────────────────────────────────────────────────
const TRIVIA = [
  { q:"What blockchain is Abraxas Protocol built on?",           opts:["Ethereum","Solana","Avalanche","Base"],                a:1, r:40  },
  { q:"Spirits have which Arena buff?",                          opts:["Precision Strike","Iconic Power","Liquid Gold","Iron Shield"], a:2, r:50 },
  { q:"LTV for Gold/Metals on Loopscale?",                      opts:["55%","65%","70%","80%"],                                a:3, r:55 },
  { q:"What does x402 enable for Sophia Agents?",               opts:["NFT minting","Agentic micropayments","Bridge txs","Staking"], a:1, r:45 },
  { q:"The 1999 Charizard PSA 10 archetype is?",                opts:["Aggro","Control","Tank","Volatility"],                  a:2, r:60 },
  { q:"Watches use which arena buff?",                          opts:["Liquid Gold","Iconic Power","Precision Strike","Volt Surge"], a:2, r:45 },
  { q:"$ABRA powers which protocol fees?",                      opts:["Gas only","Arena antes + agent fees + vault yield","Lending only","Governance"], a:1, r:50 },
  { q:"What token standard does Abraxas use on Solana?",        opts:["SPL","Token-2022","Token-721","cNFT"],                  a:1, r:55 },
  { q:"Comics have which arena buff?",                          opts:["Liquid Gold","Iconic Power","Precision Strike","Iron Shield"], a:1, r:50 },
  { q:"Amazing Fantasy #15 archetype?",                         opts:["Aggro","Control","Tank","Volatility"],                  a:2, r:65 },
];

const ORACLE_ROUNDS = [
  { name:"XAUt Gold",           change:0.4,   hint:"Fed held rates. Dollar weakened slightly." },
  { name:"1999 Charizard",      change:-1.2,  hint:"eBay supply spike — 3 new graded copies listed." },
  { name:"Pappy Van Winkle",    change:2.1,   hint:"Kentucky Derby weekend. Collector demand surging." },
  { name:"Rolex Submariner",    change:-0.8,  hint:"Secondary market soft. New model rumor suppressing." },
  { name:"Amazing Fantasy #15", change:1.5,   hint:"New Spider-Man film announcement lifted all silver." },
  { name:"Caroni 1998 Rum",     change:3.2,   hint:"Distillery closed. Remaining bottles are increasingly rare." },
  { name:"NVDA Tokenized",      change:2.8,   hint:"Strong earnings beat. AI chip demand exceeding supply." },
];

// Memory match game
const MEMORY_PAIRS = ["Charizard","Blanton's","Rolex Sub","Amazing Fantasy","Luffy Gold","Mew","XAUt Gold","Sophia-Hed"];
function shuffle<T>(arr:T[]): T[] { return [...arr].sort(()=>Math.random()-0.5); }

function BrainGames({ onEarn }:{ onEarn:(n:number)=>void }) {
  const [gameMode, setGameMode] = useState<"select"|"trivia"|"oracle"|"memory">("select");
  const [qIdx,     setQIdx]     = useState(0);
  const [score,    setScore]    = useState(0);
  const [ans,      setAns]      = useState<number|null>(null);
  const [done,     setDone]     = useState(false);
  const [streak,   setStreak]   = useState(0);

  // Oracle
  const [oIdx,       setOIdx]       = useState(0);
  const [oGuess,     setOGuess]     = useState<"up"|"down"|null>(null);
  const [oResult,    setOResult]    = useState<boolean|null>(null);
  const [oScore,     setOScore]     = useState(0);

  // Memory
  const [cards,     setCards]    = useState<Array<{id:number;label:string;flipped:boolean;matched:boolean}>>([]);
  const [flipped,   setFlipped]  = useState<number[]>([]);
  const [mScore,    setMScore]   = useState(0);
  const [moves,     setMoves]    = useState(0);

  function initMemory() {
    const pairs = MEMORY_PAIRS.slice(0,6);
    const deck  = shuffle([...pairs,...pairs].map((label,i)=>({id:i,label,flipped:false,matched:false})));
    setCards(deck); setFlipped([]); setMScore(0); setMoves(0);
  }

  function flipCard(id:number) {
    if(flipped.length>=2||cards[id].flipped||cards[id].matched) return;
    const next=[...flipped,id];
    setCards(c=>c.map((x,i)=>i===id?{...x,flipped:true}:x));
    if(next.length===2) {
      setMoves(m=>m+1);
      const [a,b]=next;
      if(cards[a].label===cards[b].label) {
        setTimeout(()=>{
          setCards(c=>c.map(x=>x.label===cards[a].label?{...x,matched:true}:x));
          setFlipped([]); setMScore(s=>s+40);
          const newCards=cards.map(x=>x.label===cards[a].label?{...x,matched:true}:x);
          if(newCards.every(x=>x.matched||!x.id)){ onEarn(mScore+40); setDone(true); }
        },400);
      } else {
        setTimeout(()=>{ setCards(c=>c.map(x=>next.includes(c.indexOf(x))?x:{...x})); setFlipped([]); },800);
        setTimeout(()=>setCards(c=>c.map((x,i)=>next.includes(i)&&!x.matched?{...x,flipped:false}:x)),900);
      }
    } else { setFlipped(next); }
  }

  function answerTrivia(i:number) {
    if(ans!==null) return;
    setAns(i);
    const correct=i===TRIVIA[qIdx].a;
    const bonus=correct&&streak>=2?Math.round(TRIVIA[qIdx].r*0.5):0;
    if(correct){ setScore(s=>s+TRIVIA[qIdx].r+bonus); setStreak(k=>k+1); onEarn(TRIVIA[qIdx].r+bonus); }
    else setStreak(0);
    setTimeout(()=>{
      if(qIdx+1>=TRIVIA.length){setDone(true);}
      else{setQIdx(q=>q+1);setAns(null);}
    },1300);
  }

  function guessOracle(g:"up"|"down") {
    if(oGuess!==null) return;
    const round=ORACLE_ROUNDS[oIdx];
    const correct=g==="up"?round.change>0:round.change<0;
    setOGuess(g); setOResult(correct);
    if(correct){ setOScore(s=>s+65); onEarn(65); }
    setTimeout(()=>{
      if(oIdx+1>=ORACLE_ROUNDS.length){setDone(true);}
      else{setOIdx(o=>o+1);setOGuess(null);setOResult(null);}
    },1500);
  }

  function resetAll() { setQIdx(0);setScore(0);setAns(null);setDone(false);setStreak(0);setOIdx(0);setOGuess(null);setOResult(null);setOScore(0);setMScore(0);setMoves(0); }

  const totalScore = score+oScore+mScore;

  return (
    <div style={{ maxWidth:"520px", margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:"0.875rem" }}>
        <div style={{ fontWeight:900, fontSize:"1rem", background:"linear-gradient(135deg,#a855f7,#60A5FA)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Brain Games</div>
        <div style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>Circuit Training · Sophia Agents guide you · Win $ABRA + Arena buffs</div>
      </div>

      {gameMode==="select"&&(
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.625rem" }}>
          {[
            { id:"trivia", label:"Sovereign Trivia",   sub:`${TRIVIA.length} questions · streak bonus`,   color:"#a855f7", icon:"🏛" },
            { id:"oracle", label:"Oracle Gauntlet",    sub:`${ORACLE_ROUNDS.length} rounds · price calls`, color:"#14F195", icon:"📡" },
            { id:"memory", label:"Asset Memory Match", sub:"6 pairs · speed bonus",                        color:"#6b8cff", icon:"🧩" },
          ].map(g=>(
            <button key={g.id} onClick={()=>{setGameMode(g.id as "trivia"|"oracle"|"memory");resetAll();if(g.id==="memory")initMemory();}} style={{ textAlign:"left",padding:"1rem 0.875rem",borderRadius:"10px",background:"rgba(6,8,16,0.97)",border:`1px solid ${g.color}25`,cursor:"pointer",transition:"border-color 0.15s" }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=g.color+"55";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=g.color+"25";}}>
              <div style={{ fontSize:"1.3rem",marginBottom:"0.35rem" }}>{g.icon}</div>
              <div style={{ fontWeight:800,fontSize:"0.72rem",color:g.color,marginBottom:"0.2rem" }}>{g.label}</div>
              <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.38)",lineHeight:1.5 }}>{g.sub}</div>
            </button>
          ))}
        </div>
      )}

      {gameMode==="trivia"&&!done&&(
        <div style={{ background:"rgba(6,8,16,0.97)",border:"1px solid rgba(168,85,247,0.18)",borderRadius:"12px",padding:"1.25rem" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"0.875rem",alignItems:"center" }}>
            <div>
              <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>Q{qIdx+1}/{TRIVIA.length}</span>
              {streak>=2&&<span style={{ marginLeft:"0.5rem",fontSize:"0.44rem",color:"#FBBF24",fontFamily:"'JetBrains Mono',monospace",fontWeight:700 }}>🔥 {streak}x streak</span>}
            </div>
            <span style={{ fontSize:"0.52rem",color:"#a855f7",fontWeight:700,fontFamily:"'JetBrains Mono',monospace" }}>{score} $ABRA</span>
          </div>
          <div style={{ fontWeight:700,fontSize:"0.8rem",color:"#f0f0f0",lineHeight:1.5,marginBottom:"0.875rem" }}>{TRIVIA[qIdx].q}</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem" }}>
            {TRIVIA[qIdx].opts.map((opt,i)=>{
              const correct=i===TRIVIA[qIdx].a; const selected=ans===i; const shown=ans!==null;
              return(
                <button key={i} onClick={()=>answerTrivia(i)} disabled={shown} style={{ padding:"0.42rem 0.5rem",borderRadius:"7px",border:`1px solid ${shown?(correct?"rgba(20,241,149,0.5)":selected?"rgba(242,107,107,0.4)":"rgba(255,255,255,0.06)"):"rgba(255,255,255,0.1)"}`,background:shown?(correct?"rgba(20,241,149,0.1)":selected?"rgba(242,107,107,0.08)":"rgba(255,255,255,0.02)"):"rgba(255,255,255,0.03)",color:shown?(correct?"#14F195":selected?"#f26b6b":"rgba(255,255,255,0.28)"):"rgba(255,255,255,0.7)",fontSize:"0.58rem",cursor:shown?"default":"pointer",fontWeight:shown&&(correct||selected)?700:400,textAlign:"left" }}>{opt}</button>
              );
            })}
          </div>
          {ans!==null&&<div style={{ marginTop:"0.5rem",fontSize:"0.48rem",color:ans===TRIVIA[qIdx].a?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace",textAlign:"center" }}>{ans===TRIVIA[qIdx].a?`+${TRIVIA[qIdx].r}${streak>=2?` +${Math.round(TRIVIA[qIdx].r*0.5)} streak bonus`:""} $ABRA`:"Incorrect — no points"}</div>}
        </div>
      )}

      {gameMode==="oracle"&&!done&&(
        <div style={{ background:"rgba(6,8,16,0.97)",border:"1px solid rgba(20,241,149,0.18)",borderRadius:"12px",padding:"1.25rem" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"0.875rem" }}>
            <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>Round {oIdx+1}/{ORACLE_ROUNDS.length}</span>
            <span style={{ fontSize:"0.52rem",color:"#14F195",fontWeight:700,fontFamily:"'JetBrains Mono',monospace" }}>{oScore} $ABRA</span>
          </div>
          <div style={{ fontWeight:800,fontSize:"0.88rem",color:"#f0f0f0",marginBottom:"0.3rem" }}>{ORACLE_ROUNDS[oIdx].name}</div>
          <div style={{ fontSize:"0.54rem",color:"rgba(255,255,255,0.45)",marginBottom:"0.875rem",padding:"0.4rem 0.5rem",background:"rgba(168,85,247,0.05)",border:"1px solid rgba(168,85,247,0.15)",borderRadius:"6px" }}>
            Sophia says: "{ORACLE_ROUNDS[oIdx].hint}"
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem" }}>
            {(["up","down"] as const).map(g=>(
              <button key={g} onClick={()=>guessOracle(g)} disabled={oGuess!==null} style={{ padding:"0.625rem",borderRadius:"8px",border:`1px solid ${oGuess===null?"rgba(255,255,255,0.1)":oGuess===g?(oResult?"rgba(20,241,149,0.5)":"rgba(242,107,107,0.5)"):"rgba(255,255,255,0.05)"}`,background:oGuess===null?"rgba(255,255,255,0.03)":oGuess===g?(oResult?"rgba(20,241,149,0.1)":"rgba(242,107,107,0.1)"):"rgba(255,255,255,0.01)",color:g==="up"?"#14F195":"#f26b6b",fontWeight:700,fontSize:"0.82rem",cursor:oGuess===null?"pointer":"default",fontFamily:"'JetBrains Mono',monospace" }}>
                {g==="up"?"UP ▲":"DOWN ▼"}
              </button>
            ))}
          </div>
          {oGuess&&<div style={{ marginTop:"0.5rem",textAlign:"center",fontSize:"0.58rem",fontWeight:700,color:oResult?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace" }}>{oResult?`CORRECT! +65 $ABRA · ${ORACLE_ROUNDS[oIdx].change>0?"+":""}${ORACLE_ROUNDS[oIdx].change}%`:`Incorrect · Change: ${ORACLE_ROUNDS[oIdx].change>0?"+":""}${ORACLE_ROUNDS[oIdx].change}%`}</div>}
        </div>
      )}

      {gameMode==="memory"&&!done&&cards.length>0&&(
        <div style={{ background:"rgba(6,8,16,0.97)",border:"1px solid rgba(107,140,255,0.18)",borderRadius:"12px",padding:"1.25rem" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"0.75rem" }}>
            <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>Moves: {moves}</span>
            <span style={{ fontSize:"0.52rem",color:"#6b8cff",fontWeight:700,fontFamily:"'JetBrains Mono',monospace" }}>{mScore} $ABRA</span>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.4rem" }}>
            {cards.map((card,i)=>(
              <div key={card.id} onClick={()=>flipCard(i)} style={{ height:"72px",borderRadius:"8px",border:`1px solid ${card.matched?"rgba(20,241,149,0.4)":card.flipped?"rgba(107,140,255,0.4)":"rgba(255,255,255,0.08)"}`,background:card.matched?"rgba(20,241,149,0.08)":card.flipped?"rgba(107,140,255,0.1)":"rgba(6,8,16,0.97)",cursor:card.flipped||card.matched?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",overflow:"hidden" }}>
                {(card.flipped||card.matched)?<span style={{ fontSize:"0.48rem",fontWeight:700,color:card.matched?"#14F195":"#6b8cff",textAlign:"center",padding:"4px",fontFamily:"'JetBrains Mono',monospace" }}>{card.label}</span>:<span style={{ fontSize:"1rem",color:"rgba(255,255,255,0.15)" }}>?</span>}
              </div>
            ))}
          </div>
          <div style={{ marginTop:"0.5rem",fontSize:"0.46rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",textAlign:"center" }}>Each matched pair: +40 $ABRA</div>
        </div>
      )}

      {done&&(
        <div style={{ background:"rgba(6,8,16,0.97)",border:"1px solid rgba(168,85,247,0.28)",borderRadius:"12px",padding:"1.5rem",textAlign:"center" }}>
          <div style={{ fontWeight:900,fontSize:"1.1rem",color:"#a855f7",marginBottom:"0.4rem" }}>Session Complete</div>
          <div style={{ fontSize:"0.82rem",fontWeight:700,color:"#D4AF37",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.875rem" }}>+{totalScore} $ABRA earned</div>
          <div style={{ display:"flex",gap:"0.5rem",justifyContent:"center" }}>
            <button onClick={()=>{resetAll();if(gameMode==="memory")initMemory();}} style={{ padding:"0.35rem 0.875rem",borderRadius:"7px",background:"rgba(168,85,247,0.1)",border:"1px solid rgba(168,85,247,0.28)",color:"#a855f7",fontSize:"0.62rem",fontWeight:700,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>Play Again</button>
            <button onClick={()=>{resetAll();setGameMode("select");}} style={{ padding:"0.35rem 0.875rem",borderRadius:"7px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.4)",fontSize:"0.62rem",fontWeight:700,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>All Modes</button>
          </div>
        </div>
      )}

      {gameMode!=="select"&&!done&&<button onClick={()=>{resetAll();setGameMode("select");}} style={{ marginTop:"0.75rem",display:"block",width:"100%",padding:"0.32rem",borderRadius:"6px",background:"none",border:"1px solid rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.28)",fontSize:"0.5rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",textAlign:"center" }}>← Back to Game Modes</button>}
    </div>
  );
}

// ─── Global Leaderboard ───────────────────────────────────────────────────────
const MOCK_LEADERS = [
  { wallet:"7xA3...mK9f", rank:"Sovereign", score:9820, wins:34, abra:4420 },
  { wallet:"Db6R...xQ2p", rank:"Platinum",  score:7140, wins:27, abra:3210 },
  { wallet:"CQ1U...dJGd", rank:"Platinum",  score:6890, wins:24, abra:2980 },
  { wallet:"9G4k...Fa2m", rank:"Gold",      score:5330, wins:19, abra:2100 },
  { wallet:"HeFq...wZq",  rank:"Gold",      score:4810, wins:16, abra:1880 },
  { wallet:"8bBx...pf58", rank:"Silver",    score:3620, wins:12, abra:1420 },
  { wallet:"CmWV...tdDk", rank:"Silver",    score:2940, wins:9,  abra:1100 },
  { wallet:"You",         rank:"Bronze",    score:1000, wins:0,  abra:0    },
];

function Leaderboard({ abraEarned, wins }:{ abraEarned:number; wins:number }) {
  const leaders = MOCK_LEADERS.map(l=>l.wallet==="You"?{...l,score:1000+wins*120,wins,abra:abraEarned}:l)
    .sort((a,b)=>b.score-a.score);

  return (
    <div style={{ maxWidth:"500px", margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:"0.875rem" }}>
        <div style={{ fontWeight:900,fontSize:"1rem",background:"linear-gradient(135deg,#D4AF37,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>Sovereign Leaderboard</div>
        <div style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.4)",fontFamily:"'JetBrains Mono',monospace" }}>Global ELO rankings · Season 1</div>
      </div>
      {leaders.map((l,i)=>{
        const rc = RANK_COLORS[l.rank as keyof typeof RANK_COLORS]??"#f0f0f0";
        const isYou = l.wallet==="You";
        return (
          <div key={l.wallet} style={{ padding:"0.5rem 0.75rem",background:isYou?"rgba(212,175,55,0.06)":"rgba(6,8,16,0.97)",border:`1px solid ${isYou?"rgba(212,175,55,0.3)":"rgba(255,255,255,0.05)"}`,borderRadius:"8px",marginBottom:"0.3rem",display:"grid",gridTemplateColumns:"1.5rem 1fr auto",gap:"0.5rem",alignItems:"center" }}>
            <span style={{ fontSize:"0.6rem",fontWeight:900,color:i<3?"#FBBF24":"rgba(255,255,255,0.3)",textAlign:"center",fontFamily:"'JetBrains Mono',monospace" }}>{i+1}</span>
            <div>
              <div style={{ fontSize:"0.58rem",fontWeight:isYou?800:500,color:isYou?"#D4AF37":"#f0f0f0",fontFamily:"'JetBrains Mono',monospace" }}>{l.wallet}</div>
              <div style={{ display:"flex",gap:"0.5rem" }}>
                <span style={{ fontSize:"0.44rem",fontWeight:700,color:rc,fontFamily:"'JetBrains Mono',monospace" }}>{l.rank}</span>
                <span style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace" }}>{l.wins}W · {l.abra}$A</span>
              </div>
            </div>
            <span style={{ fontSize:"0.6rem",fontWeight:700,color:rc,fontFamily:"'JetBrains Mono',monospace",fontVariantNumeric:"tabular-nums" }}>{l.score.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Game Modes Hub ───────────────────────────────────────────────────────────
export function GameModesHub({ assets }:{ assets:GameAsset[] }) {
  const [mode,       setMode]       = useState<"hub"|"claw"|"chase"|"brain"|"leaderboard">("hub");
  const [totalAbra,  setTotalAbra]  = useState(0);
  const [totalWins,  setTotalWins]  = useState(0);
  const [session,    setSession]    = useState(0);

  function earn(n:number) { setTotalAbra(a=>a+n); setSession(s=>s+n); }
  function win() { setTotalWins(w=>w+1); }

  const MODES = [
    { id:"claw",        label:"AbraxClaw",       sub:"Arcade gacha pulls · rarity-weighted",     color:"#FBBF24", icon:"🔧" },
    { id:"chase",       label:"Chase Markets",    sub:"CALL/PUT price predictions · bull bias",   color:"#14F195", icon:"📈" },
    { id:"brain",       label:"Brain Games",      sub:"Trivia · Oracle · Memory Match",           color:"#a855f7", icon:"🧠" },
    { id:"leaderboard", label:"Leaderboard",       sub:"Global ELO · Season 1",                   color:"#D4AF37", icon:"🏆" },
  ] as const;

  return (
    <div>
      {/* Session earnings strip */}
      {session>0&&<div style={{ marginBottom:"0.875rem",padding:"0.4rem 0.875rem",background:"rgba(212,175,55,0.07)",border:"1px solid rgba(212,175,55,0.2)",borderRadius:"8px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <span style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.45)",fontFamily:"'JetBrains Mono',monospace" }}>Session earnings</span>
        <span style={{ fontSize:"0.68rem",fontWeight:800,color:"#D4AF37",fontFamily:"'JetBrains Mono',monospace" }}>+{session} $ABRA</span>
      </div>}

      {/* Mode tabs */}
      <div style={{ display:"flex",gap:"0.25rem",marginBottom:"1.25rem",flexWrap:"wrap" }}>
        <button onClick={()=>setMode("hub")} style={{ padding:"0.28rem 0.75rem",borderRadius:"5px",border:`1px solid ${mode==="hub"?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.07)"}`,background:mode==="hub"?"rgba(255,255,255,0.08)":"transparent",color:mode==="hub"?"#f0f0f0":"rgba(255,255,255,0.34)",fontSize:"0.58rem",fontWeight:mode==="hub"?700:400,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>All Modes</button>
        {MODES.map(m=>(
          <button key={m.id} onClick={()=>setMode(m.id)} style={{ padding:"0.28rem 0.75rem",borderRadius:"5px",border:`1px solid ${mode===m.id?m.color+"55":"rgba(255,255,255,0.07)"}`,background:mode===m.id?`${m.color}10`:"transparent",color:mode===m.id?m.color:"rgba(255,255,255,0.34)",fontSize:"0.58rem",fontWeight:mode===m.id?700:400,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {mode==="hub"&&(
        <div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:"0.75rem" }}>
            {MODES.map(m=>(
              <button key={m.id} onClick={()=>setMode(m.id)} style={{ textAlign:"left",padding:"1.125rem 1rem",borderRadius:"12px",background:"rgba(6,8,16,0.97)",border:`1px solid ${m.color}20`,cursor:"pointer",transition:"border-color 0.15s,box-shadow 0.15s" }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=m.color+"50";(e.currentTarget as HTMLElement).style.boxShadow=`0 0 16px ${m.color}10`;}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=m.color+"20";(e.currentTarget as HTMLElement).style.boxShadow="none";}}>
                <div style={{ fontSize:"1.4rem",marginBottom:"0.4rem" }}>{m.icon}</div>
                <div style={{ fontWeight:800,fontSize:"0.82rem",color:m.color,marginBottom:"0.2rem" }}>{m.label}</div>
                <div style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.36)",lineHeight:1.5 }}>{m.sub}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode==="claw"        &&<AbraxClaw    assets={assets} onEarn={earn} />}
      {mode==="chase"       &&<ChaseMarkets assets={assets} onEarn={earn} />}
      {mode==="brain"       &&<BrainGames   onEarn={earn} />}
      {mode==="leaderboard" &&<Leaderboard  abraEarned={totalAbra} wins={totalWins} />}
    </div>
  );
}