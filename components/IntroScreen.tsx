// FILE: components/IntroScreen.tsx
// Billboard-grade institutional intro. 2.5 seconds total.
// Cinematic. Protocol-level. Tap anywhere to skip after 1s.
"use client";

import { useState, useEffect } from "react";

const LINES = [
  "Verification Infrastructure",
  "Collateral Intelligence",
  "Capital Access",
];

export function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    const skipTimer = setTimeout(() => setCanSkip(true), 1000);

    // Cycle through lines every 750ms
    const lineTimer = setInterval(() => {
      setLineIdx(i => {
        const next = i + 1;
        if (next >= LINES.length) {
          clearInterval(lineTimer);
          // Fade out and complete
          setTimeout(() => {
            setOpacity(0);
            setTimeout(onComplete, 400);
          }, 600);
        }
        return Math.min(next, LINES.length - 1);
      });
    }, 750);

    return () => { clearInterval(lineTimer); clearTimeout(skipTimer); };
  }, [onComplete]);

  function skip() {
    if (!canSkip) return;
    setOpacity(0);
    setTimeout(onComplete, 350);
  }

  return (
    <div onClick={skip} style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"#060810",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      opacity, transition:"opacity 0.4s ease",
      cursor: canSkip ? "pointer" : "default",
      overflow:"hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position:"absolute", inset:0,
        background:"radial-gradient(ellipse 55% 35% at 50% 65%, rgba(124,58,237,0.1) 0%, transparent 70%)",
        pointerEvents:"none",
      }}/>

      {/* Corner marks — institutional */}
      {[
        {top:24,left:24,  borderTop:"1px solid",borderLeft:"1px solid"},
        {top:24,right:24, borderTop:"1px solid",borderRight:"1px solid"},
        {bottom:24,left:24,  borderBottom:"1px solid",borderLeft:"1px solid"},
        {bottom:24,right:24, borderBottom:"1px solid",borderRight:"1px solid"},
      ].map((s,i) => (
        <div key={i} style={{
          position:"absolute", width:20, height:20,
          borderColor:"rgba(255,255,255,0.08)",
          ...s,
        }}/>
      ))}

      <div style={{
        position:"relative", zIndex:1,
        textAlign:"center", padding:"0 2rem",
        maxWidth:640,
      }}>
        {/* Protocol identifier */}
        <div style={{
          fontSize:"0.55rem", fontWeight:700,
          color:"rgba(200,169,110,0.5)",
          fontFamily:"'JetBrains Mono',monospace",
          letterSpacing:"0.3em", textTransform:"uppercase",
          marginBottom:"1.5rem",
        }}>
          ABRAXAS · AAS-1 · SOLANA
        </div>

        {/* Billboard headline */}
        <h1 style={{
          fontWeight:900,
          fontSize:"clamp(2.2rem,6vw,4rem)",
          color:"#f0f0f0",
          margin:"0 0 0.5rem",
          letterSpacing:"-0.05em",
          lineHeight:1.0,
          minHeight:"4rem",
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"opacity 0.2s",
        }}>
          {LINES[lineIdx]}
        </h1>

        <div style={{
          fontSize:"0.6rem",
          color:"rgba(255,255,255,0.2)",
          fontFamily:"'JetBrains Mono',monospace",
          marginTop:"0.75rem",
          letterSpacing:"0.08em",
        }}>
          for Real-World Assets
        </div>

        {/* Thin progress line */}
        <div style={{
          width:180, height:1,
          background:"rgba(255,255,255,0.06)",
          borderRadius:1, margin:"2rem auto 0",
          overflow:"hidden",
        }}>
          <div style={{
            height:"100%",
            background:"linear-gradient(90deg,#7c3aed,#C8A96E)",
            width:`${((lineIdx+1)/LINES.length)*100}%`,
            transition:"width 0.6s ease",
          }}/>
        </div>

        {canSkip && (
          <div style={{
            marginTop:"1.5rem", fontSize:"0.42rem",
            color:"rgba(255,255,255,0.12)",
            fontFamily:"'JetBrains Mono',monospace",
            letterSpacing:"0.1em",
          }}>
            tap to enter
          </div>
        )}
      </div>
    </div>
  );
}