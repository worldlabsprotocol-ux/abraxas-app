// FILE: app/page.tsx — splash with real logo, refreshed slogan
"use client";
import { useEffect, useState } from "react";
import { useRouter }           from "next/navigation";
import Image                   from "next/image";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "system-ui,-apple-system,sans-serif";

export default function Home() {
  const router       = useRouter();
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPct(p => Math.min(p + 2, 100)), 30);
    const r = setTimeout(() => router.push("/terminal"), 2400);
    return () => { clearInterval(t); clearTimeout(r); };
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh", background: "#040608",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: M, padding: "2rem",
      backgroundImage: "radial-gradient(ellipse at center, rgba(16,185,129,0.06) 0%, transparent 70%)",
    }}>
      {/* Logo mark */}
      <div style={{
        position: "relative", width: "clamp(200px, 40vw, 320px)",
        height: "clamp(200px, 40vw, 320px)", marginBottom: "2rem",
      }}>
        <Image
          src="/icon-512.png"
          alt="Abraxas Protocol"
          fill
          priority
          style={{ objectFit: "contain" }}
        />
      </div>

      {/* Wordmark */}
      <div style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "clamp(2.5rem, 8vw, 5rem)",
        fontWeight: 800,
        color: "#F8FAFC", letterSpacing: "0.04em", lineHeight: 1,
        marginBottom: "0.875rem",
      }}>
        ABRAXAS
      </div>

      {/* Underline accent */}
      <div style={{
        width: 80, height: 2, background: "#10B981",
        marginBottom: "1.25rem",
        boxShadow: "0 0 8px rgba(16,185,129,0.6)",
      }}/>

      {/* Slogan */}
      <div style={{
        fontFamily: S, fontSize: "clamp(0.85rem, 2vw, 1.15rem)",
        fontWeight: 700, color: "rgba(255,255,255,0.9)",
        textAlign: "center", marginBottom: "0.5rem",
        letterSpacing: "0.02em",
      }}>
        Where assets become collateral.
      </div>

      {/* Sub-tag */}
      <div style={{
        fontSize: "clamp(0.32rem, 1.1vw, 0.42rem)", fontWeight: 700,
        color: "rgba(16,185,129,0.7)", textTransform: "uppercase",
        letterSpacing: "0.25em", marginBottom: "3rem", textAlign: "center",
      }}>
        VERIFICATION · COLLATERAL · OWNERSHIP
      </div>

      {/* Progress bar */}
      <div style={{ width: "clamp(240px, 60vw, 320px)", marginBottom: "1rem" }}>
        <div style={{
          height: 2, background: "rgba(255,255,255,0.06)",
          borderRadius: 1, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 1,
            background: "linear-gradient(90deg, #10B981, #3182CE)",
            width: `${pct}%`, transition: "width 0.05s linear",
            boxShadow: "0 0 6px rgba(16,185,129,0.5)",
          }}/>
        </div>
      </div>

      <div style={{
        fontSize: "0.32rem", color: "rgba(255,255,255,0.18)",
        textTransform: "uppercase", letterSpacing: "0.25em",
        marginBottom: "2rem",
      }}>
        INITIALIZING TERMINAL · {pct}%
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push("/terminal")}
        style={{
          padding: "0.75rem 2rem", borderRadius: 4,
          border: "1px solid rgba(16,185,129,0.35)",
          background: "rgba(16,185,129,0.06)",
          color: "#10B981", fontFamily: M, fontSize: "0.42rem",
          fontWeight: 800, cursor: "pointer", textTransform: "uppercase",
          letterSpacing: "0.15em",
          transition: "all 0.15s",
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = "rgba(16,185,129,0.12)";
          e.currentTarget.style.borderColor = "rgba(16,185,129,0.6)";
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = "rgba(16,185,129,0.06)";
          e.currentTarget.style.borderColor = "rgba(16,185,129,0.35)";
        }}
      >
        ENTER TERMINAL →
      </button>

      {/* Status strip at bottom */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#020406", borderTop: "1px solid #0F1929",
        padding: "0.5rem 1.5rem", display: "flex",
        alignItems: "center", gap: "1.25rem", flexWrap: "wrap",
        fontSize: "0.28rem", color: "rgba(255,255,255,0.25)",
        fontFamily: M, letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#10B981",
            boxShadow: "0 0 4px rgba(16,185,129,0.6)",
          }}/>
          SOLANA MAINNET
        </span>
        <span>·</span>
        <span>AAS-1 PROTOCOL</span>
        <span>·</span>
        <span>BUILD 2025.1</span>
      </div>
    </div>
  );
}
