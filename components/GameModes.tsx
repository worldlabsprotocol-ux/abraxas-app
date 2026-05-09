// FILE: components/GameModes.tsx
// Game Modes selector + AbraxClaw + Chase Markets (Calls/Puts) + Brain Games
// All modes accessible from one hub. No external deps.
"use client";

import { useState, useEffect, useRef } from "react";
import { getLoopscaleLiquidity } from "@/lib/loopscale";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GameAsset { id:string; name:string; category:string; priceUsd:number; ticker:string; imagePath?:string|null; videoPath?:string|null; rarity:string; archetype?:string; archetype_color?:string; arena_buff?:string; can_borrow?:boolean; ltv?:number; }

const CAT_COLOR: Record<string,string> = { Pokemon:"#FBBF24","One Piece":"#f26b6b",Comics:"#a855f7",Metals:"#D4AF37",Stocks:"#14F195",Watches:"#6b8cff",Sports:"#fb923c",Spirits:"#FF8C00" };
function fmtUsd(v:number):string { if(v>=1_000_000) return `$${(v/1_000_000).toFixed(2)}M`; if(v>=1_000) return `$${(v/1_000).toFixed(1)}K`; return `$${v.toFixed(2)}`; }

// ─── AbraxClaw Machine ────────────────────────────────────────────────────────
function AbraxClaw({ assets }:{ assets:GameAsset[] }) {
  const [state,    setState]    = useState<"idle"|"dropping"|"grabbing"|"revealing"|"done">("idle");
  const [revealed, setRevealed] = useState<GameAsset|null>(null);
  const [clawX,    setClawX]    = useState(50);   // % across machine
  const [tickets,  setTickets]  = useState(3);
  const timerRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  function pull() {
    if (tickets <= 0 || state !== "idle") return;
    setTickets(t => t-1);
    setState("dropping");
    // Animate claw across
    const targetX = 20 + Math.random()*60;
    setClawX(targetX);
    timerRef.current = setTimeout(()=>{ setState("grabbing"); }, 900);
    timerRef.current = setTimeout(()=>{
      const eligible = assets.filter(a=>a.priceUsd<20000);
      const weights  = eligible.map(a=>{ if(a.rarity==="Legendary")return 2; if(a.rarity==="Ultra Rare")return 8; return 25; });
      const total    = weights.reduce((s,w)=>s+w,0);
      let r = Math.random()*total, picked = eligible[0];
      for(let i=0;i<eligible.length;i++){ r-=weights[i]; if(r<=0){picked=eligible[i];break;} }
      setRevealed(picked);
      setState("revealing");
    }, 1800);
    timerRef.current = setTimeout(()=>setState("done"), 2800);
  }

  useEffect(()=>()=>{if(timerRef.current)clearTimeout(timerRef.current)},[]);

  const catColor = revealed ? (CAT_COLOR[revealed.category]??"#6b8cff") : "#6b8cff";

  return (
    <div style={{ maxWidth:"420px", margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:"0.75rem" }}>
        <div style={{ fontWeight:900, fontSize:"1rem", background:"linear-gradient(135deg,#FBBF24,#FF6B35)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>AbraxClaw Machine</div>
        <div style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>
          Arcade-style gacha pulls · {tickets} tickets remaining
        </div>
      </div>

      {/* Machine body */}
      <div style={{ position:"relative", background:"rgba(6,8,16,0.97)", border:"2px solid rgba(251,191,36,0.3)", borderRadius:"16px", overflow:"hidden", height:"320px" }}>
        {/* Claw arm */}
        <div style={{ position:"absolute", top:0, left:`${clawX}%`, transform:"translateX(-50%)", transition:"left 0.8s ease-in-out", zIndex:10 }}>
          <div style={{ width:"3px", height:state==="grabbing"||state==="revealing"?"160px":state==="idle"?"60px":"120px", background:"rgba(212,175,55,0.8)", margin:"0 auto", transition:"height 0.5s ease-in-out" }} />
          <div style={{ fontSize:"1.2rem", textAlign:"center", marginTop:"-4px" }}>🔧</div>
        </div>

        {/* Prize window — assets floating */}
        <div style={{ position:"absolute", inset:"0", display:"flex", flexWrap:"wrap", gap:"8px", padding:"1rem", alignContent:"flex-end", justifyContent:"center" }}>
          {assets.slice(0,12).map((a,i) => (
            <div key={a.id} style={{ width:"54px", height:"72px", borderRadius:"6px", background:`${CAT_COLOR[a.category]??"#6b8cff"}18`, border:`1px solid ${CAT_COLOR[a.category]??"#6b8cff"}33`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
              {a.imagePath ? <img src={a.imagePath} alt={a.name} style={{ width:"100%", height:"100%", objectFit:"contain" }} loading="lazy" /> : <span style={{ fontSize:"0.4rem", color:CAT_COLOR[a.category]??"#6b8cff", fontWeight:700, textAlign:"center", padding:"2px" }}>{a.name.slice(0,12)}</span>}
            </div>
          ))}
        </div>

        {/* Reveal overlay */}
        {(state==="revealing"||state==="done")&&revealed&&(
          <div style={{ position:"absolute", inset:0, background:"rgba(2,3,10,0.92)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"0.5rem", animation:"fadeIn 0.3s ease-in" }}>
            <div style={{ fontSize:"0.6rem", fontWeight:700, color:"#FBBF24", letterSpacing:"0.2em", fontFamily:"'JetBrains Mono',monospace" }}>YOU GRABBED</div>
            <div style={{ width:"100px", height:"130px", borderRadius:"10px", border:`2px solid ${catColor}`, overflow:"hidden", background:`${catColor}12`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 30px ${catColor}44` }}>
              {revealed.imagePath ? <img src={revealed.imagePath} alt={revealed.name} style={{ width:"100%", height:"100%", objectFit:"contain" }} /> : <span style={{ fontSize:"0.52rem", color:catColor, fontWeight:700, textAlign:"center", padding:"8px" }}>{revealed.name}</span>}
            </div>
            <div style={{ fontWeight:800, fontSize:"0.88rem", color:catColor }}>{revealed.name}</div>
            <div style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.5)", fontFamily:"'JetBrains Mono',monospace" }}>{revealed.rarity} · {fmtUsd(revealed.priceUsd)}</div>
            {revealed.arena_buff&&<div style={{ fontSize:"0.46rem", padding:"0.1rem 0.35rem", borderRadius:"3px", background:"rgba(168,85,247,0.15)", border:"1px solid rgba(168,85,247,0.35)", color:"#a855f7", fontFamily:"'JetBrains Mono',monospace" }}>{revealed.arena_buff}</div>}
            <button onClick={()=>{setState("idle");setRevealed(null);setClawX(50);}} style={{ marginTop:"0.5rem", padding:"0.3rem 0.875rem", borderRadius:"7px", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.14)", color:"rgba(255,255,255,0.5)", fontSize:"0.6rem", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>Drop to Vault</button>
          </div>
        )}

        {/* Status strip */}
        <div style={{ position:"absolute", top:"0.5rem", right:"0.5rem", padding:"0.15rem 0.4rem", borderRadius:"4px", background:`rgba(251,191,36,0.12)`, border:"1px solid rgba(251,191,36,0.3)", fontSize:"0.44rem", fontWeight:700, color:"#FBBF24", fontFamily:"'JetBrains Mono',monospace" }}>
          {state==="idle"?"READY":state==="dropping"?"CLAW MOVING":state==="grabbing"?"GRABBING...":state==="revealing"?"RETRIEVING...":"DONE"}
        </div>
      </div>

      {/* Pull button */}
      <button onClick={pull} disabled={tickets<=0||state!=="idle"} style={{ width:"100%", marginTop:"0.75rem", padding:"0.625rem", borderRadius:"9px", border:"none", fontWeight:900, fontSize:"0.82rem", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em", cursor:tickets>0&&state==="idle"?"pointer":"not-allowed", background:tickets>0&&state==="idle"?"linear-gradient(135deg,#FBBF24,#FF6B35)":"rgba(255,255,255,0.05)", color:tickets>0&&state==="idle"?"#000":"rgba(255,255,255,0.2)", boxShadow:tickets>0&&state==="idle"?"0 0 24px rgba(251,191,36,0.4)":"none" }}>
        {tickets>0?`Drop the Claw! (${tickets} left)`:"No Tickets — Win Battles to Earn More"}
      </button>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}

// ─── Chase Markets (Call/Put prediction) ──────────────────────────────────────
const EXPIRY_OPTIONS = ["1 Day","3 Days","1 Week","2 Weeks"];
const CALL_BOOST = 1.15; // calls pay 15% more (bullish RWA thesis)

interface Position { id:string; asset:string; ticker:string; direction:"CALL"|"PUT"; target:number; wager:number; expiry:string; openPrice:number; status:"open"|"won"|"lost"; }

function ChaseMarkets({ assets }:{ assets:GameAsset[] }) {
  const [asset,     setAsset]     = useState<GameAsset|null>(null);
  const [direction, setDirection] = useState<"CALL"|"PUT">("CALL");
  const [target,    setTarget]    = useState(10);
  const [wager,     setWager]     = useState(50);
  const [expiry,    setExpiry]    = useState(EXPIRY_OPTIONS[2]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [search,    setSearch]    = useState("");
  const [toast,     setToast]     = useState<string|null>(null);

  function showToast(msg:string) { setToast(msg); setTimeout(()=>setToast(null),2800); }

  const filtered = assets.filter(a=>a.name.toLowerCase().includes(search.toLowerCase())||a.ticker.toLowerCase().includes(search.toLowerCase())).slice(0,12);

  function placePosition() {
    if(!asset||wager<=0) return;
    const pos:Position = { id:Date.now().toString(), asset:asset.name, ticker:asset.ticker, direction, target, wager, expiry, openPrice:asset.priceUsd, status:"open" };
    setPositions(p=>[pos,...p.slice(0,9)]);
    showToast(`${direction} on ${asset.ticker} @ +${target}% placed · ${wager} $ABRA wagered`);
    setAsset(null);
  }

  function settlePosition(id:string) {
    setPositions(p=>p.map(pos=>{
      if(pos.id!==id) return pos;
      const won = pos.direction==="CALL" ? Math.random()>0.4 : Math.random()>0.55; // slight call bias
      const payout = won ? Math.round(pos.wager*(pos.direction==="CALL"?CALL_BOOST:1.0)*1.8) : 0;
      showToast(won ? `CALL won! +${payout} $ABRA` : `PUT settled — position closed`);
      return { ...pos, status:won?"won":"lost" };
    }));
  }

  const payout = Math.round(wager*(direction==="CALL"?CALL_BOOST:1.0)*1.8);

  return (
    <div style={{ maxWidth:"600px", margin:"0 auto" }}>
      {/* Toast */}
      {toast&&<div style={{ position:"fixed", top:"80px", left:"50%", transform:"translateX(-50%)", zIndex:999, padding:"0.5rem 1.25rem", borderRadius:"8px", background:"rgba(20,241,149,0.15)", border:"1px solid rgba(20,241,149,0.4)", color:"#14F195", fontSize:"0.6rem", fontWeight:700, fontFamily:"'JetBrains Mono',monospace", whiteSpace:"nowrap", boxShadow:"0 0 20px rgba(20,241,149,0.2)" }}>{toast}</div>}

      <div style={{ textAlign:"center", marginBottom:"0.875rem" }}>
        <div style={{ fontWeight:900, fontSize:"1rem", background:"linear-gradient(135deg,#14F195,#6b8cff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Chase Markets</div>
        <div style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>Bullish on RWAs · CALLs pay {Math.round((CALL_BOOST-1)*100)}% more · Place price predictions</div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.875rem" }}>
        {/* Left — asset picker */}
        <div style={{ background:"rgba(6,8,16,0.97)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"12px", padding:"0.875rem" }}>
          <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"0.4rem", textTransform:"uppercase" }}>Select Asset</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{ width:"100%", padding:"0.3rem 0.5rem", borderRadius:"5px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#f0f0f0", fontSize:"0.56rem", fontFamily:"'JetBrains Mono',monospace", outline:"none", boxSizing:"border-box", marginBottom:"0.4rem" }} />
          <div style={{ maxHeight:"200px", overflowY:"auto" }}>
            {filtered.map(a=>(
              <div key={a.id} onClick={()=>setAsset(a)} style={{ padding:"0.28rem 0.4rem", borderRadius:"5px", cursor:"pointer", marginBottom:"2px", background:asset?.id===a.id?`${CAT_COLOR[a.category]??"#6b8cff"}14`:"rgba(255,255,255,0.02)", border:`1px solid ${asset?.id===a.id?(CAT_COLOR[a.category]??"#6b8cff")+"44":"transparent"}`, display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:"0.52rem", color:"#f0f0f0", fontFamily:"'JetBrains Mono',monospace" }}>{a.ticker}</span>
                <span style={{ fontSize:"0.48rem", color:"rgba(255,255,255,0.4)", fontVariantNumeric:"tabular-nums" }}>{fmtUsd(a.priceUsd)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — position builder */}
        <div style={{ background:"rgba(6,8,16,0.97)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"12px", padding:"0.875rem" }}>
          {/* Direction */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.35rem", marginBottom:"0.625rem" }}>
            {(["CALL","PUT"] as const).map(d=>(
              <button key={d} onClick={()=>setDirection(d)} style={{ padding:"0.4rem", borderRadius:"6px", border:`1px solid ${direction===d?(d==="CALL"?"rgba(20,241,149,0.5)":"rgba(242,107,107,0.5)"):"rgba(255,255,255,0.08)"}`, background:direction===d?(d==="CALL"?"rgba(20,241,149,0.1)":"rgba(242,107,107,0.1)"):"transparent", color:direction===d?(d==="CALL"?"#14F195":"#f26b6b"):"rgba(255,255,255,0.4)", fontWeight:direction===d?800:400, fontSize:"0.7rem", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em" }}>
                {d==="CALL"?"CALL ▲":"PUT ▼"}
              </button>
            ))}
          </div>

          {/* Target % */}
          <div style={{ marginBottom:"0.5rem" }}>
            <div style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"3px" }}>TARGET % MOVE</div>
            <div style={{ display:"flex", gap:"0.25rem" }}>
              {[5,10,15,25,50].map(t=>(
                <button key={t} onClick={()=>setTarget(t)} style={{ flex:1, padding:"0.2rem", borderRadius:"4px", border:`1px solid ${target===t?"rgba(251,191,36,0.5)":"rgba(255,255,255,0.07)"}`, background:target===t?"rgba(251,191,36,0.1)":"transparent", color:target===t?"#FBBF24":"rgba(255,255,255,0.35)", fontSize:"0.5rem", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>+{t}%</button>
              ))}
            </div>
          </div>

          {/* Wager */}
          <div style={{ marginBottom:"0.5rem" }}>
            <div style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"3px" }}>WAGER ($ABRA)</div>
            <div style={{ display:"flex", gap:"0.25rem" }}>
              {[25,50,100,250].map(w=>(
                <button key={w} onClick={()=>setWager(w)} style={{ flex:1, padding:"0.2rem", borderRadius:"4px", border:`1px solid ${wager===w?"rgba(107,140,255,0.5)":"rgba(255,255,255,0.07)"}`, background:wager===w?"rgba(107,140,255,0.1)":"transparent", color:wager===w?"#6b8cff":"rgba(255,255,255,0.35)", fontSize:"0.5rem", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>{w}</button>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div style={{ marginBottom:"0.625rem" }}>
            <div style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"3px" }}>EXPIRY</div>
            <div style={{ display:"flex", gap:"0.2rem", flexWrap:"wrap" }}>
              {EXPIRY_OPTIONS.map(e=>(
                <button key={e} onClick={()=>setExpiry(e)} style={{ padding:"0.18rem 0.4rem", borderRadius:"4px", border:`1px solid ${expiry===e?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.07)"}`, background:expiry===e?"rgba(255,255,255,0.07)":"transparent", color:expiry===e?"#f0f0f0":"rgba(255,255,255,0.3)", fontSize:"0.44rem", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>{e}</button>
              ))}
            </div>
          </div>

          {/* Summary */}
          {asset&&(
            <div style={{ padding:"0.35rem 0.5rem", borderRadius:"6px", background:direction==="CALL"?"rgba(20,241,149,0.06)":"rgba(242,107,107,0.06)", border:`1px solid ${direction==="CALL"?"rgba(20,241,149,0.2)":"rgba(242,107,107,0.2)"}`, marginBottom:"0.5rem" }}>
              <div style={{ fontSize:"0.48rem", color:"rgba(255,255,255,0.5)", fontFamily:"'JetBrains Mono',monospace" }}>
                {direction} {asset.ticker} {direction==="CALL"?"+":"-"}{target}% by {expiry}
              </div>
              <div style={{ fontSize:"0.6rem", fontWeight:700, color:direction==="CALL"?"#14F195":"#f26b6b", fontFamily:"'JetBrains Mono',monospace" }}>
                Max payout: {payout} $ABRA {direction==="CALL"?`(${Math.round((CALL_BOOST-1)*100)}% CALL bonus)`:""}
              </div>
            </div>
          )}

          <button onClick={placePosition} disabled={!asset} style={{ width:"100%", padding:"0.45rem", borderRadius:"7px", border:"none", fontWeight:800, fontSize:"0.68rem", fontFamily:"'JetBrains Mono',monospace", cursor:asset?"pointer":"not-allowed", background:asset?(direction==="CALL"?"linear-gradient(135deg,#14F195,#6b8cff)":"linear-gradient(135deg,#f26b6b,#FF6B35)"):"rgba(255,255,255,0.04)", color:asset?"#000":"rgba(255,255,255,0.2)" }}>
            {asset?`Place ${direction}`:"Select an Asset"}
          </button>
        </div>
      </div>

      {/* Open positions */}
      {positions.length>0&&(
        <div style={{ marginTop:"1rem" }}>
          <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"0.4rem" }}>Open Positions</div>
          {positions.map(pos=>(
            <div key={pos.id} style={{ padding:"0.4rem 0.625rem", background:"rgba(6,8,16,0.97)", border:`1px solid ${pos.status==="won"?"rgba(20,241,149,0.3)":pos.status==="lost"?"rgba(242,107,107,0.2)":pos.direction==="CALL"?"rgba(20,241,149,0.12)":"rgba(242,107,107,0.12)"}`, borderRadius:"7px", marginBottom:"0.3rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <span style={{ fontWeight:700, fontSize:"0.6rem", color:pos.direction==="CALL"?"#14F195":"#f26b6b", fontFamily:"'JetBrains Mono',monospace" }}>{pos.direction}</span>
                <span style={{ fontSize:"0.56rem", color:"rgba(255,255,255,0.6)", marginLeft:"0.4rem", fontFamily:"'JetBrains Mono',monospace" }}>{pos.ticker} {pos.direction==="CALL"?"+":"-"}{pos.target}% · {pos.wager}$ABRA · {pos.expiry}</span>
              </div>
              {pos.status==="open"?<button onClick={()=>settlePosition(pos.id)} style={{ padding:"0.18rem 0.5rem", borderRadius:"4px", background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.3)", color:"#FBBF24", fontSize:"0.48rem", fontWeight:700, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>Settle</button>:<span style={{ fontSize:"0.52rem", fontWeight:700, color:pos.status==="won"?"#14F195":"#f26b6b", fontFamily:"'JetBrains Mono',monospace" }}>{pos.status==="won"?"WON":"LOST"}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Brain Games ──────────────────────────────────────────────────────────────
const TRIVIA: Array<{ q:string; opts:string[]; a:number; reward:number }> = [
  { q:"What blockchain does Abraxas Protocol run on?", opts:["Ethereum","Solana","Avalanche","Base"], a:1, reward:40 },
  { q:"What is the LTV for Gold/Metals on Loopscale?", opts:["55%","65%","70%","80%"], a:3, reward:50 },
  { q:"Which spirit has the 'Liquid Gold' arena buff?", opts:["Watches","Comics","Spirits","Sports"], a:2, reward:45 },
  { q:"What archetype is the 1999 Charizard PSA 10?", opts:["Aggro","Control","Tank","Volatility"], a:2, reward:60 },
  { q:"What does x402 enable in Abraxas?", opts:["NFT minting","Agentic micropayments","Bridge transfers","Token swaps"], a:1, reward:55 },
  { q:"What payment standard do Sophia Agents use?", opts:["ERC-20","Token-2022","Token-721","BEP-20"], a:1, reward:45 },
  { q:"Which comic has the highest borrow limit?", opts:["MAD #1","Sensation Comics #1","Crime SuspenStories","Batman #1"], a:3, reward:70 },
  { q:"What is the Abraxas $ABRA token contract address start?", opts:["5c1F...","9G4k...","7xA3...","Db6R..."], a:0, reward:65 },
];

function BrainGames() {
  const [gameMode, setGameMode] = useState<"select"|"trivia"|"memory"|"oracle">("select");
  const [qIdx,   setQIdx]   = useState(0);
  const [score,  setScore]  = useState(0);
  const [ans,    setAns]    = useState<number|null>(null);
  const [done,   setDone]   = useState(false);

  // Oracle game: guess if price goes up or down
  const [oracleAsset,  setOracleAsset]  = useState(0);
  const [oracleGuess,  setOracleGuess]  = useState<"up"|"down"|null>(null);
  const [oracleResult, setOracleResult] = useState<boolean|null>(null);
  const [oracleScore,  setOracleScore]  = useState(0);
  const ORACLE_ASSETS = [
    { name:"XAUt Gold",         change:0.4,  hint:"Fed held rates. Dollar weakened." },
    { name:"1999 Charizard",    change:-1.2, hint:"Supply spike on eBay." },
    { name:"Pappy Van Winkle",  change:2.1,  hint:"Kentucky Derby weekend. Demand surge." },
    { name:"Rolex Submariner",  change:-0.8, hint:"Secondary market soft. New model hype." },
    { name:"Amazing Fantasy #15",change:1.5, hint:"New Spider-Man film announced." },
  ];

  function answerTrivia(i:number) {
    if(ans!==null) return;
    setAns(i);
    if(i===TRIVIA[qIdx].a) setScore(s=>s+TRIVIA[qIdx].reward);
    setTimeout(()=>{
      if(qIdx+1>=TRIVIA.length) setDone(true);
      else { setQIdx(q=>q+1); setAns(null); }
    }, 1200);
  }

  function guessOracle(guess:"up"|"down") {
    if(oracleGuess!==null) return;
    const asset = ORACLE_ASSETS[oracleAsset];
    const correct = guess==="up" ? asset.change>0 : asset.change<0;
    setOracleGuess(guess); setOracleResult(correct);
    if(correct) setOracleScore(s=>s+60);
    setTimeout(()=>{
      if(oracleAsset+1>=ORACLE_ASSETS.length) setDone(true);
      else { setOracleAsset(a=>a+1); setOracleGuess(null); setOracleResult(null); }
    },1400);
  }

  function reset() { setQIdx(0); setScore(0); setAns(null); setDone(false); setOracleAsset(0); setOracleGuess(null); setOracleResult(null); setOracleScore(0); }

  return (
    <div style={{ maxWidth:"500px", margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:"0.875rem" }}>
        <div style={{ fontWeight:900, fontSize:"1rem", background:"linear-gradient(135deg,#a855f7,#60A5FA)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Brain Games</div>
        <div style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>Circuit Training · Guided by Sophia Agents · Win $ABRA + Prestige</div>
      </div>

      {gameMode==="select"&&(
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.625rem" }}>
          {[
            { id:"trivia",  label:"Sovereign Trivia",  desc:"Protocol & RWA lore questions", color:"#a855f7", agent:"Sophia-Cgd" },
            { id:"oracle",  label:"Oracle Predictions", desc:"Guess daily RWA price moves",   color:"#14F195", agent:"Sophia-Yld" },
          ].map(g=>(
            <button key={g.id} onClick={()=>{setGameMode(g.id as "trivia"|"oracle");reset();}} style={{ textAlign:"left", padding:"0.875rem", borderRadius:"10px", background:"rgba(6,8,16,0.97)", border:`1px solid ${g.color}28`, cursor:"pointer", transition:"border-color 0.15s" }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=g.color+"55";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=g.color+"28";}}>
              <div style={{ fontWeight:800, fontSize:"0.82rem", color:g.color, marginBottom:"0.25rem" }}>{g.label}</div>
              <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.38)", lineHeight:1.5, marginBottom:"0.35rem" }}>{g.desc}</div>
              <div style={{ fontSize:"0.44rem", color:g.color, fontFamily:"'JetBrains Mono',monospace", opacity:0.7 }}>Guide: {g.agent}</div>
            </button>
          ))}
        </div>
      )}

      {gameMode==="trivia"&&!done&&(
        <div style={{ background:"rgba(6,8,16,0.97)", border:"1px solid rgba(168,85,247,0.2)", borderRadius:"12px", padding:"1.25rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.875rem" }}>
            <span style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace" }}>Q{qIdx+1}/{TRIVIA.length}</span>
            <span style={{ fontSize:"0.5rem", color:"#a855f7", fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>{score} $ABRA</span>
          </div>
          <div style={{ fontWeight:700, fontSize:"0.78rem", color:"#f0f0f0", lineHeight:1.5, marginBottom:"0.875rem" }}>{TRIVIA[qIdx].q}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.4rem" }}>
            {TRIVIA[qIdx].opts.map((opt,i)=>{
              const isCorrect = i===TRIVIA[qIdx].a;
              const isSelected = ans===i;
              const revealed = ans!==null;
              return (
                <button key={i} onClick={()=>answerTrivia(i)} disabled={revealed} style={{ padding:"0.4rem 0.5rem", borderRadius:"7px", border:`1px solid ${revealed?(isCorrect?"rgba(20,241,149,0.5)":isSelected?"rgba(242,107,107,0.4)":"rgba(255,255,255,0.06)"):"rgba(255,255,255,0.1)"}`, background:revealed?(isCorrect?"rgba(20,241,149,0.1)":isSelected?"rgba(242,107,107,0.08)":"rgba(255,255,255,0.02)"):"rgba(255,255,255,0.03)", color:revealed?(isCorrect?"#14F195":isSelected?"#f26b6b":"rgba(255,255,255,0.3)"):"rgba(255,255,255,0.7)", fontSize:"0.58rem", cursor:revealed?"default":"pointer", fontWeight:revealed&&(isCorrect||isSelected)?700:400, textAlign:"left" }}>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {gameMode==="oracle"&&!done&&(
        <div style={{ background:"rgba(6,8,16,0.97)", border:"1px solid rgba(20,241,149,0.2)", borderRadius:"12px", padding:"1.25rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.875rem" }}>
            <span style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace" }}>Asset {oracleAsset+1}/{ORACLE_ASSETS.length}</span>
            <span style={{ fontSize:"0.5rem", color:"#14F195", fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>{oracleScore} $ABRA</span>
          </div>
          <div style={{ fontWeight:700, fontSize:"0.82rem", color:"#f0f0f0", marginBottom:"0.35rem" }}>{ORACLE_ASSETS[oracleAsset].name}</div>
          <div style={{ fontSize:"0.54rem", color:"rgba(255,255,255,0.45)", marginBottom:"0.875rem", padding:"0.4rem 0.5rem", background:"rgba(255,255,255,0.03)", borderRadius:"6px" }}>
            Sophia says: "{ORACLE_ASSETS[oracleAsset].hint}"
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
            {(["up","down"] as const).map(g=>(
              <button key={g} onClick={()=>guessOracle(g)} disabled={oracleGuess!==null} style={{ padding:"0.625rem", borderRadius:"8px", border:`1px solid ${oracleGuess===null?"rgba(255,255,255,0.1)":oracleGuess===g?(oracleResult?"rgba(20,241,149,0.5)":"rgba(242,107,107,0.5)"):"rgba(255,255,255,0.06)"}`, background:oracleGuess===null?"rgba(255,255,255,0.03)":oracleGuess===g?(oracleResult?"rgba(20,241,149,0.1)":"rgba(242,107,107,0.1)"):"rgba(255,255,255,0.02)", color:g==="up"?"#14F195":"#f26b6b", fontWeight:700, fontSize:"0.82rem", cursor:oracleGuess===null?"pointer":"default", fontFamily:"'JetBrains Mono',monospace" }}>
                {g==="up"?"UP ▲":"DOWN ▼"}
              </button>
            ))}
          </div>
          {oracleGuess&&<div style={{ marginTop:"0.5rem", textAlign:"center", fontSize:"0.6rem", fontWeight:700, color:oracleResult?"#14F195":"#f26b6b", fontFamily:"'JetBrains Mono',monospace" }}>{oracleResult?`CORRECT! +60 $ABRA · Change: ${ORACLE_ASSETS[oracleAsset].change>0?"+":""}${ORACLE_ASSETS[oracleAsset].change}%`:`INCORRECT · Change was ${ORACLE_ASSETS[oracleAsset].change>0?"+":""}${ORACLE_ASSETS[oracleAsset].change}%`}</div>}
        </div>
      )}

      {done&&(
        <div style={{ background:"rgba(6,8,16,0.97)", border:"1px solid rgba(168,85,247,0.3)", borderRadius:"12px", padding:"1.5rem", textAlign:"center" }}>
          <div style={{ fontWeight:900, fontSize:"1.1rem", color:"#a855f7", marginBottom:"0.5rem" }}>Session Complete</div>
          <div style={{ fontSize:"0.78rem", fontWeight:700, color:"#D4AF37", fontFamily:"'JetBrains Mono',monospace", marginBottom:"0.875rem" }}>+{score+oracleScore} $ABRA earned</div>
          <div style={{ display:"flex", gap:"0.5rem", justifyContent:"center" }}>
            <button onClick={()=>{reset();}} style={{ padding:"0.35rem 0.875rem", borderRadius:"7px", background:"rgba(168,85,247,0.1)", border:"1px solid rgba(168,85,247,0.3)", color:"#a855f7", fontSize:"0.62rem", fontWeight:700, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>Play Again</button>
            <button onClick={()=>{reset();setGameMode("select");}} style={{ padding:"0.35rem 0.875rem", borderRadius:"7px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.4)", fontSize:"0.62rem", fontWeight:700, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>All Modes</button>
          </div>
        </div>
      )}

      {gameMode!=="select"&&!done&&(
        <button onClick={()=>{reset();setGameMode("select");}} style={{ marginTop:"0.625rem", display:"block", width:"100%", textAlign:"center", padding:"0.35rem", borderRadius:"6px", background:"none", border:"1px solid rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.3)", fontSize:"0.52rem", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>Back to Game Modes</button>
      )}
    </div>
  );
}

// ─── Game Modes Hub ───────────────────────────────────────────────────────────
export function GameModesHub({ assets }:{ assets:GameAsset[] }) {
  const [mode, setMode] = useState<"hub"|"claw"|"chase"|"brain">("hub");

  const MODES = [
    { id:"claw",  label:"AbraxClaw",      sub:"Arcade gacha pulls",            color:"#FBBF24", emoji:"🔧" },
    { id:"chase", label:"Chase Markets",  sub:"CALL/PUT price predictions",     color:"#14F195", emoji:"📈" },
    { id:"brain", label:"Brain Games",    sub:"Circuit Training · $ABRA rewards",color:"#a855f7", emoji:"🧠" },
  ] as const;

  return (
    <div style={{ padding:"0 0 2rem" }}>
      {/* Tab bar */}
      <div style={{ display:"flex", gap:"0.35rem", marginBottom:"1.25rem", flexWrap:"wrap" }}>
        <button onClick={()=>setMode("hub")} style={{ padding:"0.3rem 0.75rem", borderRadius:"6px", border:`1px solid ${mode==="hub"?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.07)"}`, background:mode==="hub"?"rgba(255,255,255,0.08)":"transparent", color:mode==="hub"?"#f0f0f0":"rgba(255,255,255,0.36)", fontSize:"0.6rem", fontWeight:mode==="hub"?700:400, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>All Modes</button>
        {MODES.map(m=>(
          <button key={m.id} onClick={()=>setMode(m.id)} style={{ padding:"0.3rem 0.75rem", borderRadius:"6px", border:`1px solid ${mode===m.id?m.color+"55":"rgba(255,255,255,0.07)"}`, background:mode===m.id?`${m.color}12`:"transparent", color:mode===m.id?m.color:"rgba(255,255,255,0.36)", fontSize:"0.6rem", fontWeight:mode===m.id?700:400, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {mode==="hub"&&(
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"0.75rem" }}>
          {MODES.map(m=>(
            <button key={m.id} onClick={()=>setMode(m.id)} style={{ textAlign:"left", padding:"1.25rem", borderRadius:"12px", background:"rgba(6,8,16,0.97)", border:`1px solid ${m.color}22`, cursor:"pointer", transition:"border-color 0.15s,box-shadow 0.15s" }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=m.color+"55";(e.currentTarget as HTMLElement).style.boxShadow=`0 0 18px ${m.color}12`;}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=m.color+"22";(e.currentTarget as HTMLElement).style.boxShadow="none";}}>
              <div style={{ fontSize:"1.5rem", marginBottom:"0.5rem" }}>{m.emoji}</div>
              <div style={{ fontWeight:800, fontSize:"0.88rem", color:m.color, marginBottom:"0.25rem" }}>{m.label}</div>
              <div style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.38)", lineHeight:1.5 }}>{m.sub}</div>
            </button>
          ))}
        </div>
      )}

      {mode==="claw"&&<AbraxClaw assets={assets} />}
      {mode==="chase"&&<ChaseMarkets assets={assets} />}
      {mode==="brain"&&<BrainGames />}
    </div>
  );
}