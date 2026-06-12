"use client";
// FILE: app/page.tsx — Abraxas landing page. No auto-redirect.
import { useState, useEffect } from "react";
import Link                    from "next/link";

const M  = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S  = "system-ui,-apple-system,sans-serif";
const G  = "#10B981";

export default function Home() {
  const [pct,   setPct]   = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPct(p => {
      if (p >= 100) { clearInterval(t); setReady(true); return 100; }
      return Math.min(p + 3, 100);
    }), 28);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ minHeight:"100vh", background:"#060810", display:"flex",
                   flexDirection:"column", alignItems:"center",
                   justifyContent:"center", fontFamily:M,
                   userSelect:"none", padding:"2rem 1rem" }}>

      {/* Diamond logo */}
      <div style={{ marginBottom:"2rem" }}>
        <svg width={56} height={56} viewBox="0 0 40 40" fill="none">
          <polygon points="20,2 38,20 20,38 2,20"
            stroke={G} strokeWidth="1.5" fill="none"/>
          <polygon points="20,8 32,20 20,32 8,20"
            stroke={G} strokeWidth="1" fill={`${G}12`}/>
          <circle cx="20" cy="20" r="3" fill={G}
            style={{ filter:`drop-shadow(0 0 6px ${G})` }}/>
        </svg>
      </div>

      {/* Wordmark */}
      <div style={{ textAlign:"center", marginBottom:"1.5rem" }}>
        <div style={{ fontFamily:"Georgia,serif",
                       fontSize:"clamp(2.5rem,8vw,4.5rem)",
                       fontWeight:700, color:"#F8FAFC",
                       letterSpacing:"-0.03em", lineHeight:1,
                       marginBottom:"0.75rem" }}>ABRAXAS</div>
        <div style={{ fontFamily:S, fontSize:"clamp(0.82rem,2vw,1rem)",
                       color:"rgba(255,255,255,0.45)", lineHeight:1.6,
                       maxWidth:420, margin:"0 auto" }}>
          The verification and identity layer<br/>
          for real-world assets onchain.
        </div>
      </div>

      {/* Live protocol stats */}
      <div style={{ display:"grid",
                     gridTemplateColumns:"repeat(3,1fr)",
                     gap:"1px", background:"#1C2333",
                     borderRadius:8, overflow:"hidden",
                     width:"min(380px,90vw)", marginBottom:"2rem",
                     border:"1px solid #1C2333" }}>
        {[
          ["3",     "Assets Verified"],
          ["$2.2M+","Value Attested"],
          ["W3C",   "VC Standard"],
        ].map(([val,label]) => (
          <div key={label} style={{ background:"#0D1117",
                                     padding:"0.75rem 0.5rem",
                                     textAlign:"center" }}>
            <div style={{ fontFamily:M, fontSize:"clamp(1rem,3vw,1.35rem)",
                           fontWeight:900, color:G, marginBottom:2 }}>{val}</div>
            <div style={{ fontFamily:M, fontSize:"0.5rem",
                           color:"rgba(255,255,255,0.25)",
                           letterSpacing:"0.08em",
                           textTransform:"uppercase" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tags */}
      <div style={{ display:"flex", gap:"0.375rem", flexWrap:"wrap",
                     justifyContent:"center", marginBottom:"2rem" }}>
        {["Real Estate","Literary IP","Mineral Rights",
          "Music Royalties","Wyoming LLC"].map(t => (
          <div key={t} style={{ padding:"0.22rem 0.6rem", borderRadius:4,
            border:"1px solid rgba(255,255,255,0.08)",
            background:"rgba(255,255,255,0.02)",
            fontFamily:M, fontSize:"0.55rem",
            color:"rgba(255,255,255,0.25)",
            letterSpacing:"0.06em" }}>{t}</div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ width:"min(280px,80vw)", marginBottom:"2rem" }}>
        <div style={{ height:2, background:"rgba(255,255,255,0.06)",
                       borderRadius:1, overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:1,
                         background:`linear-gradient(90deg,${G},#3B82F6)`,
                         width:`${pct}%`, transition:"width 0.03s linear" }}/>
        </div>
        <div style={{ textAlign:"center", marginTop:"0.5rem",
                       fontSize:"0.5rem", color:"rgba(255,255,255,0.2)",
                       letterSpacing:"0.15em", textTransform:"uppercase" }}>
          {ready ? "PROTOCOL READY" : `INITIALIZING · ${pct}%`}
        </div>
      </div>

      {/* CTAs */}
      <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap",
                     justifyContent:"center" }}>
        <Link href="/terminal" style={{
          padding:"0.75rem 1.75rem", borderRadius:6, border:"none",
          background:G, color:"#000", fontFamily:M,
          fontSize:"0.82rem", fontWeight:900,
          letterSpacing:"0.05em", textTransform:"uppercase",
          textDecoration:"none", display:"inline-block",
          boxShadow:`0 0 20px ${G}40`,
          opacity: ready ? 1 : 0.5,
          pointerEvents: ready ? "auto" : "none",
          transition:"opacity 0.3s",
        }}>ENTER PROTOCOL →</Link>
        <Link href="/dashboard" style={{
          padding:"0.75rem 1.25rem", borderRadius:6,
          border:"1px solid rgba(255,255,255,0.12)",
          background:"transparent", color:"rgba(255,255,255,0.4)",
          fontFamily:M, fontSize:"0.78rem", fontWeight:700,
          letterSpacing:"0.05em", textTransform:"uppercase",
          textDecoration:"none", display:"inline-block",
          opacity: ready ? 1 : 0.3,
          pointerEvents: ready ? "auto" : "none",
          transition:"opacity 0.3s",
        }}>DASHBOARD</Link>
      </div>

      <div style={{ position:"fixed", bottom:"1.5rem",
                     fontFamily:M, fontSize:"0.5rem",
                     color:"rgba(255,255,255,0.1)",
                     letterSpacing:"0.12em", textAlign:"center" }}>
        ABRAXAS PROTOCOL · SOLANA MAINNET · BUILD 2025.1
      </div>
    </div>
  );
}
