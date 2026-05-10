// FILE: components/AbraVault.tsx
// $ABRA Vault — live staking, rewards, and Loopscale borrow against staked $ABRA.
// Vault Address: 63LGWS2JSK5CawZt6iPchVU6wj63v3DtsTR1jaRnjMaY
"use client";
import { useState, useEffect } from "react";

const VAULT_ADDR = "63LGWS2JSK5CawZt6iPchVU6wj63v3DtsTR1jaRnjMaY";
const ABRA_CA    = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";

type LockTier = "flexible"|"30d"|"90d";
const TIERS: Record<LockTier,{label:string;apy:number;boost:string;ltv:number}> = {
  flexible: { label:"Flexible",   apy:18, boost:"",       ltv:0.40 },
  "30d":    { label:"30-Day Lock", apy:21, boost:"+3% APY", ltv:0.45 },
  "90d":    { label:"90-Day Lock", apy:25, boost:"+7% APY", ltv:0.50 },
};

export function AbraVault() {
  const [tier,       setTier]       = useState<LockTier>("flexible");
  const [staked,     setStaked]     = useState(82450);
  const [pending,    setPending]    = useState(1247.32);
  const [input,      setInput]      = useState("");
  const [action,     setAction]     = useState<"deposit"|"withdraw"|"borrow">("deposit");
  const [toast,      setToast]      = useState<string|null>(null);
  const [animating,  setAnimating]  = useState(false);

  // Tick pending rewards
  useEffect(() => {
    const iv = setInterval(() => setPending(p => +(p + 0.0003).toFixed(4)), 1000);
    return () => clearInterval(iv);
  }, []);

  function showToast(msg:string) { setToast(msg); setTimeout(()=>setToast(null), 3000); }

  function handleAction() {
    const amt = parseFloat(input);
    if (!amt || amt<=0) return;
    setAnimating(true);
    setTimeout(() => {
      if (action==="deposit")  { setStaked(s=>s+amt); showToast(`Deposited ${amt.toLocaleString()} $ABRA at ${TIERS[tier].apy}% APY`); }
      if (action==="withdraw") { setStaked(s=>Math.max(0,s-amt)); showToast(`Withdrawn ${amt.toLocaleString()} $ABRA`); }
      if (action==="borrow")   { showToast(`Borrowed ${(amt*TIERS[tier].ltv).toFixed(0)} USDC against ${amt.toLocaleString()} $ABRA`); }
      setInput(""); setAnimating(false);
    }, 900);
  }

  function claimRewards() {
    setAnimating(true);
    setTimeout(() => {
      showToast(`Claimed ${pending.toFixed(2)} $ABRA → Compounding to vault`);
      setPending(0);
      setStaked(s => s + pending);
      setAnimating(false);
    }, 800);
  }

  const t = TIERS[tier];
  const borrowMax = Math.round(staked * t.ltv);
  const yearlyEarn = Math.round(staked * t.apy / 100);

  return (
    <div style={{ background:"rgba(6,8,16,0.97)", border:"1px solid rgba(200,169,110,0.22)", borderRadius:"14px", padding:"1.25rem", marginBottom:"1.5rem", position:"relative", overflow:"hidden" }}>
      {toast&&<div style={{ position:"fixed",top:"80px",left:"50%",transform:"translateX(-50%)",zIndex:999,padding:"0.5rem 1.25rem",borderRadius:"8px",background:"rgba(200,169,110,0.15)",border:"1px solid rgba(200,169,110,0.4)",color:"#C8A96E",fontSize:"0.6rem",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap",boxShadow:"0 0 20px rgba(200,169,110,0.2)" }}>{toast}</div>}

      {/* Glow */}
      <div style={{ position:"absolute",top:"-30%",right:"-10%",width:"200px",height:"200px",borderRadius:"50%",background:"radial-gradient(circle,rgba(200,169,110,0.08) 0%,transparent 70%)",pointerEvents:"none" }} />

      {/* Header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem",flexWrap:"wrap",gap:"0.5rem" }}>
        <div>
          <div style={{ fontSize:"0.44rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.15rem" }}>
            Vault · {VAULT_ADDR.slice(0,8)}…{VAULT_ADDR.slice(-6)}
          </div>
          <div style={{ fontWeight:900,fontSize:"1.1rem",background:"linear-gradient(135deg,#C8A96E,#FBBF24)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
            $ABRA Vault
          </div>
          <div style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.35)",marginTop:"0.15rem" }}>
            Earn {t.apy}% APY · Borrow USDC at {Math.round(t.ltv*100)}% LTV · Arena rewards auto-stake here
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.22)",fontFamily:"'JetBrains Mono',monospace" }}>STAKED</div>
          <div style={{ fontSize:"1.5rem",fontWeight:900,color:"#C8A96E",lineHeight:1,fontFamily:"'JetBrains Mono',monospace" }}>{staked.toLocaleString()}</div>
          <div style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>$ABRA</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.4rem",marginBottom:"1rem" }}>
        {[
          ["APY",         `${t.apy}%`,              "#C8A96E"],
          ["Yearly",      `+${yearlyEarn.toLocaleString()}`,  "#14F195"],
          ["Borrow Max",  `$${borrowMax.toLocaleString()}`,   "#6b8cff"],
          ["Pending",     `${pending.toFixed(2)}`,            "#FBBF24"],
        ].map(([l,v,c])=>(
          <div key={l} style={{ padding:"0.4rem",background:"rgba(255,255,255,0.02)",border:`1px solid ${c}15`,borderRadius:"7px",textAlign:"center" }}>
            <div style={{ fontSize:"0.4rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"2px" }}>{l}</div>
            <div style={{ fontSize:"0.7rem",fontWeight:700,color:c,fontFamily:"'JetBrains Mono',monospace" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Lock tiers */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.35rem",marginBottom:"1rem" }}>
        {(Object.entries(TIERS) as [LockTier,typeof TIERS[LockTier]][]).map(([k,v])=>(
          <button key={k} onClick={()=>setTier(k)} style={{ padding:"0.5rem 0.4rem",borderRadius:"7px",border:`1px solid ${tier===k?"rgba(200,169,110,0.5)":"rgba(255,255,255,0.08)"}`,background:tier===k?"rgba(200,169,110,0.08)":"rgba(255,255,255,0.02)",cursor:"pointer",textAlign:"center" }}>
            <div style={{ fontSize:"0.58rem",fontWeight:700,color:tier===k?"#C8A96E":"rgba(255,255,255,0.4)",fontFamily:"'JetBrains Mono',monospace" }}>{v.label}</div>
            <div style={{ fontSize:"0.52rem",fontWeight:700,color:tier===k?"#FBBF24":"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace" }}>{v.apy}% APY</div>
            {v.boost&&<div style={{ fontSize:"0.42rem",color:"#14F195",fontFamily:"'JetBrains Mono',monospace" }}>{v.boost}</div>}
          </button>
        ))}
      </div>

      {/* Arena → Vault flow notice */}
      <div style={{ padding:"0.4rem 0.625rem",background:"rgba(20,241,149,0.05)",border:"1px solid rgba(20,241,149,0.12)",borderRadius:"6px",marginBottom:"0.875rem",display:"flex",alignItems:"center",gap:"0.5rem" }}>
        <span style={{ fontSize:"0.6rem" }}>⚔</span>
        <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.4)",fontFamily:"'JetBrains Mono',monospace" }}>
          $ABRA earned from Arena battles, Gacha pulls &amp; Brain Games auto-stakes here
        </span>
        <span style={{ marginLeft:"auto",fontSize:"0.48rem",color:"#14F195",fontWeight:700,fontFamily:"'JetBrains Mono',monospace" }}>AUTO</span>
      </div>

      {/* Action tabs */}
      <div style={{ display:"flex",gap:"0.25rem",marginBottom:"0.625rem" }}>
        {(["deposit","withdraw","borrow"] as const).map(a=>(
          <button key={a} onClick={()=>setAction(a)} style={{ flex:1,padding:"0.32rem",borderRadius:"5px",border:`1px solid ${action===a?"rgba(200,169,110,0.4)":"rgba(255,255,255,0.07)"}`,background:action===a?"rgba(200,169,110,0.08)":"transparent",color:action===a?"#C8A96E":"rgba(255,255,255,0.3)",fontSize:"0.54rem",fontWeight:action===a?700:400,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",textTransform:"capitalize" }}>{a}</button>
        ))}
      </div>

      <div style={{ display:"flex",gap:"0.5rem",marginBottom:"0.625rem" }}>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder={action==="borrow"?`Max ${borrowMax.toLocaleString()} USDC`:"Amount $ABRA"} type="number" style={{ flex:1,padding:"0.45rem 0.625rem",borderRadius:"7px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#f0f0f0",fontSize:"0.62rem",fontFamily:"'JetBrains Mono',monospace",outline:"none" }} onFocus={e=>{e.currentTarget.style.borderColor="rgba(200,169,110,0.4)";}} onBlur={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";}} />
        <button onClick={handleAction} disabled={animating||!input} style={{ padding:"0.45rem 1rem",borderRadius:"7px",border:"none",background:input&&!animating?"linear-gradient(135deg,#C8A96E,#FBBF24)":"rgba(255,255,255,0.05)",color:input&&!animating?"#000":"rgba(255,255,255,0.2)",fontWeight:800,fontSize:"0.62rem",cursor:input&&!animating?"pointer":"not-allowed",fontFamily:"'JetBrains Mono',monospace",transition:"all 0.15s" }}>
          {animating?"…":action==="deposit"?"Deposit":action==="withdraw"?"Withdraw":"Borrow"}
        </button>
      </div>

      {/* Claim rewards */}
      <button onClick={claimRewards} disabled={pending<0.01||animating} style={{ width:"100%",padding:"0.5rem",borderRadius:"7px",border:"1px solid rgba(251,191,36,0.25)",background:"rgba(251,191,36,0.06)",color:pending>=0.01?"#FBBF24":"rgba(255,255,255,0.2)",fontSize:"0.62rem",fontWeight:700,cursor:pending>=0.01?"pointer":"not-allowed",fontFamily:"'JetBrains Mono',monospace" }}>
        Claim {pending.toFixed(2)} $ABRA Rewards → Auto-Compound
      </button>

      <div style={{ marginTop:"0.4rem",display:"flex",gap:"0.5rem",justifyContent:"center" }}>
        <a href={`https://explorer.solana.com/address/${VAULT_ADDR}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",textDecoration:"none" }}>Explorer ↗</a>
        <a href={`https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=${ABRA_CA}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:"0.44rem",color:"rgba(255,133,0,0.6)",fontFamily:"'JetBrains Mono',monospace",textDecoration:"none" }}>Buy $ABRA ↗</a>
      </div>
    </div>
  );
}