"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export default function Home() {
  const router = useRouter();
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setPct(p => {
        if (p >= 100) { clearInterval(t); return 100; }
        return p + 2;
      });
    }, 30);
    const redirect = setTimeout(() => router.push("/auth/signin"), 2200);
    return () => { clearInterval(t); clearTimeout(redirect); };
  }, [router]);

  return (
    <div style={{
      height:"100vh", background:"#0C0E12",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      fontFamily:M, userSelect:"none",
    }}>
      <div style={{ textAlign:"center", marginBottom:"3rem" }}>
        <div style={{
          fontSize:"clamp(2.4rem,7vw,4.8rem)", fontWeight:900,
          color:"#f0f0f0", letterSpacing:"-0.04em", lineHeight:1,
          marginBottom:"0.75rem",
        }}>
          <span style={{ color:"#10B981" }}>◈</span> ABRAXAS
        </div>
        <div style={{
          fontSize:"clamp(0.4rem,1.4vw,0.56rem)", fontWeight:700,
          color:"rgba(255,255,255,0.2)", textTransform:"uppercase",
          letterSpacing:"0.25em",
        }}>
          Verifiable Onchain Collateral Infrastructure · Solana
        </div>
      </div>

      <div style={{ width:280, marginBottom:"1.5rem" }}>
        <div style={{ height:1, background:"rgba(255,255,255,0.06)", borderRadius:1, overflow:"hidden" }}>
          <div style={{
            height:"100%", borderRadius:1,
            background:"linear-gradient(90deg,#10B981,#3182CE)",
            width:, transition:"width 0.05s linear",
          }}/>
        </div>
      </div>

      <div style={{
        fontSize:"0.36rem", color:"rgba(255,255,255,0.15)",
        textTransform:"uppercase", letterSpacing:"0.2em",
      }}>
        INITIALIZING TERMINAL
      </div>

      <button
        onClick={() => router.push("/auth/signin")}
        style={{
          marginTop:"2rem", padding:"0.625rem 1.5rem",
          borderRadius:"4px", border:"1px solid rgba(16,185,129,0.2)",
          background:"transparent", color:"rgba(16,185,129,0.5)",
          fontFamily:M, fontSize:"0.38rem", fontWeight:700,
          cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.12em",
        }}>
        ENTER TERMINAL →
      </button>
    </div>
  );
}
