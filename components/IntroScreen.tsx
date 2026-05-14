// FILE: components/IntroScreen.tsx
"use client";
// 3-4 second minimalist institutional loading screen.
// Shows once per session. Skippable after 1.5s.
"use client";

import { useState, useEffect } from "react";

const LINES = [
  "Initializing issuance layer…",
  "Connecting to Solana mainnet…",
  "Loading asset registry…",
  "Verifying custody partners…",
  "Protocol ready.",
];

export function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const [lineIdx,   setLineIdx]   = useState(0);
  const [done,      setDone]      = useState(false);
  const [visible,   setVisible]   = useState(true);
  const [canSkip,   setCanSkip]   = useState(false);

  useEffect(() => {
    // Allow skip after 1.5s
    const skipTimer = setTimeout(() => setCanSkip(true), 1500);

    // Advance lines every 600ms
    const lineTimer = setInterval(() => {
      setLineIdx(i => {
        if (i >= LINES.length - 1) {
          clearInterval(lineTimer);
          setTimeout(() => {
            setDone(true);
            setTimeout(() => { setVisible(false); onComplete(); }, 500);
          }, 400);
          return i;
        }
        return i + 1;
      });
    }, 600);

    return () => { clearInterval(lineTimer); clearTimeout(skipTimer); };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div onClick={() => { if (canSkip) { setVisible(false); onComplete(); } }}
         style={{
           position:"fixed", inset:0, zIndex:9999,
           background:"#060810",
           display:"flex", flexDirection:"column",
           alignItems:"center", justifyContent:"center",
           opacity: done ? 0 : 1,
           transition:"opacity 0.5s ease",
           cursor: canSkip ? "pointer" : "default",
         }}>

      {/* Logo */}
      <div style={{ marginBottom:"2.5rem", textAlign:"center" }}>
        <div style={{ fontSize:"1.8rem", fontWeight:900, color:"#C8A96E",
                      fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.1em",
                      marginBottom:"0.3rem" }}>ABRAXAS</div>
        <div style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.2)",
                      fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.3em",
                      textTransform:"uppercase" }}>PROTOCOL</div>
      </div>

      {/* Animated bar */}
      <div style={{ width:200, height:1, background:"rgba(255,255,255,0.06)",
                    borderRadius:1, marginBottom:"2rem", overflow:"hidden" }}>
        <div style={{
          height:"100%", background:"linear-gradient(90deg,#C8A96E,#14F195)",
          borderRadius:1,
          width:`${((lineIdx + 1) / LINES.length) * 100}%`,
          transition:"width 0.5s ease",
        }}/>
      </div>

      {/* Status lines */}
      <div style={{ height:"1.5rem", display:"flex", alignItems:"center" }}>
        <span style={{ fontSize:"0.5rem", color:"rgba(20,241,149,0.5)",
                       fontFamily:"'JetBrains Mono',monospace" }}>
          {LINES[lineIdx]}
        </span>
      </div>

      {/* Skip hint */}
      {canSkip && (
        <div style={{ position:"absolute", bottom:"2rem",
                      fontSize:"0.42rem", color:"rgba(255,255,255,0.15)",
                      fontFamily:"'JetBrains Mono',monospace" }}>
          tap to enter
        </div>
      )}

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}