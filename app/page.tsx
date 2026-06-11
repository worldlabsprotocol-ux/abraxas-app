// FILE: app/page.tsx
// Abraxas landing page — no auto-redirect.
// Users see the brand, read the positioning, then choose to enter.
"use client";

import { useState, useEffect } from "react";
import { useRouter }          from "next/navigation";
import Link                   from "next/link";

const M  = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S  = "system-ui,-apple-system,sans-serif";
const G  = "#10B981";

export default function Home() {
  const router        = useRouter();
  const [pct, setPct] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setPct(p => {
      if (p >= 100) { clearInterval(timer); setReady(true); return 100; }
      return Math.min(p + 3, 100);
    }), 28);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: "#060810",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: M, userSelect: "none", padding: "2rem 1rem",
    }}>
      {/* Diamond logo */}
      <div style={{ marginBottom: "2rem" }}>
        <svg width={56} height={56} viewBox="0 0 40 40" fill="none">
          <polygon points="20,2 38,20 20,38 2,20"
            stroke={G} strokeWidth="1.5" fill="none"/>
          <polygon points="20,8 32,20 20,32 8,20"
            stroke={G} strokeWidth="1" fill={`${G}12`}/>
          <circle cx="20" cy="20" r="3" fill={G}
            style={{ filter: `drop-shadow(0 0 6px ${G})` }}/>
        </svg>
      </div>

      {/* Wordmark */}
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{
          fontFamily: "Georgia, serif",
          fontSize: "clamp(2.5rem,8vw,4.5rem)",
          fontWeight: 700, color: "#F8FAFC",
          letterSpacing: "-0.03em", lineHeight: 1,
          marginBottom: "0.75rem",
        }}>
          ABRAXAS
        </div>
        <div style={{
          fontFamily: S, fontSize: "clamp(0.78rem,2vw,1rem)",
          fontWeight: 400, color: "rgba(255,255,255,0.45)",
          lineHeight: 1.5, maxWidth: 420, margin: "0 auto",
        }}>
          The verification and identity layer<br/>
          for real-world assets onchain.
        </div>
      </div>

      {/* Tag line */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap",
                     justifyContent: "center", marginBottom: "2.5rem" }}>
        {["W3C Verifiable Credentials","Solana Mainnet","10-Stage V5 Pipeline"].map(t => (
          <div key={t} style={{
            padding: "0.25rem 0.625rem", borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            fontFamily: M, fontSize: "0.58rem",
            color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em",
          }}>{t}</div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ width: "min(280px,80vw)", marginBottom: "2rem" }}>
        <div style={{ height: 2, background: "rgba(255,255,255,0.06)",
                       borderRadius: 1, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 1,
                         background: `linear-gradient(90deg,${G},#3B82F6)`,
                         width: `${pct}%`, transition: "width 0.03s linear" }}/>
        </div>
        <div style={{ textAlign: "center", marginTop: "0.5rem",
                       fontSize: "0.52rem", color: "rgba(255,255,255,0.2)",
                       letterSpacing: "0.15em", textTransform: "uppercase" }}>
          {ready ? "PROTOCOL READY" : `INITIALIZING · ${pct}%`}
        </div>
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap",
                     justifyContent: "center" }}>
        <Link href="/terminal" style={{
          padding: "0.75rem 1.75rem", borderRadius: 6, border: "none",
          background: G, color: "#000", fontFamily: M,
          fontSize: "0.82rem", fontWeight: 900, cursor: "pointer",
          letterSpacing: "0.05em", textTransform: "uppercase",
          textDecoration: "none", display: "inline-block",
          boxShadow: `0 0 20px ${G}40`,
          opacity: ready ? 1 : 0.5,
          pointerEvents: ready ? "auto" : "none",
          transition: "opacity 0.3s",
        }}>
          ENTER TERMINAL →
        </Link>
        <Link href="/dashboard" style={{
          padding: "0.75rem 1.25rem", borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "transparent", color: "rgba(255,255,255,0.4)",
          fontFamily: M, fontSize: "0.78rem", fontWeight: 700,
          cursor: "pointer", letterSpacing: "0.05em",
          textTransform: "uppercase", textDecoration: "none",
          display: "inline-block",
          opacity: ready ? 1 : 0.3,
          pointerEvents: ready ? "auto" : "none",
          transition: "opacity 0.3s",
        }}>
          DASHBOARD
        </Link>
      </div>

      {/* Footer */}
      <div style={{
        position: "fixed", bottom: "1.5rem",
        fontFamily: M, fontSize: "0.52rem",
        color: "rgba(255,255,255,0.12)",
        letterSpacing: "0.12em", textAlign: "center",
      }}>
        ABRAXAS PROTOCOL · SOLANA MAINNET · BUILD 2025.1
      </div>
    </div>
  );
}
