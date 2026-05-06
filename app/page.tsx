// FILE: app/page.tsx
// Control entry point. Handshake onboarding flow:
// Identity → Capital Activation → Sovereign Autonomy.
// Everything operational within 60 seconds of landing.
"use client";

import Link from "next/link";
import { useState } from "react";
import { useSystemState } from "@/lib/systemState";

type HandshakePhase = "identity" | "activate" | "autonomous" | "done";

const STATE_CONFIG = {
  NO_VAULTS:         { label: "Undeployed",  color: "var(--subtle)", msg: "No capital is protected. Deploy a vault to begin." },
  UNPROTECTED:       { label: "Exposed",     color: "#FBBF24",       msg: "Vaults deployed. Circuit inactive. Assets exposed." },
  PROTECTED:         { label: "Protected",   color: "#14F195",       msg: "Circuit armed. Sophia agents monitoring." },
  AT_RISK:           { label: "At Risk",     color: "var(--gold)",   msg: "Risk event detected. Review vault." },
  CIRCUIT_TRIGGERED: { label: "Triggered",   color: "#f26b6b",       msg: "Circuit triggered. Simulated freeze applied." },
};

// Handshake SVG — the deal being closed
function HandshakeSVG({ size = 64, color = "var(--gold)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="hsGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C8A96E"/>
          <stop offset="1" stopColor="#FBBF24"/>
        </linearGradient>
      </defs>
      {/* Left arm */}
      <path d="M4 38 C8 34 14 30 20 32 L28 36" stroke="url(#hsGrad)" strokeWidth="3" strokeLinecap="round"/>
      {/* Right arm */}
      <path d="M60 38 C56 34 50 30 44 32 L36 36" stroke="url(#hsGrad)" strokeWidth="3" strokeLinecap="round"/>
      {/* Clasped hands */}
      <path d="M28 36 C30 34 32 33 34 34 L36 36 C38 37 38 40 36 41 L28 43 C26 44 24 42 24 40 L24 38 C24 36 26 35 28 36Z" fill="url(#hsGrad)" opacity="0.9"/>
      {/* Fingers suggestion */}
      <path d="M26 38 L24 35 M28 37 L26 34 M30 37 L29 34" stroke="url(#hsGrad)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
      <path d="M38 38 L40 35 M36 37 L38 34 M34 37 L35 34" stroke="url(#hsGrad)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
      {/* Shield above */}
      <path d="M32 8 L26 11 L26 17 C26 21 29 24 32 25 C35 24 38 21 38 17 L38 11 Z" fill="rgba(200,169,110,0.2)" stroke="url(#hsGrad)" strokeWidth="1.2"/>
      <path d="M29.5 17 L31.5 19 L34.5 15" stroke="url(#hsGrad)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// 60-second handshake onboarding
function HandshakeFlow({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<HandshakePhase>("identity");
  const { vaults } = useSystemState();

  const steps = [
    {
      phase: "identity" as HandshakePhase,
      title: "Identity Handshake",
      sub: "Sovereign access requires a wallet. No accounts. No custody.",
      cta: "Connect Wallet →",
      next: "activate" as HandshakePhase,
    },
    {
      phase: "activate" as HandshakePhase,
      title: "Capital Activation",
      sub: "Deploy a vault. Assign a Sophia agent. Arm the Circuit.",
      cta: vaults.length > 0 ? "Vault Active →" : "Deploy Vault →",
      next: "autonomous" as HandshakePhase,
      href: "/protect",
    },
    {
      phase: "autonomous" as HandshakePhase,
      title: "Sovereign Autonomy",
      sub: "OpenClaw agents execute 24/7. No approval required. No middlemen.",
      cta: "Activate Autonomy →",
      next: "done" as HandshakePhase,
    },
  ];

  const current = steps.find((s) => s.phase === phase);
  const idx     = steps.findIndex((s) => s.phase === phase);

  return (
    <div style={{ background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "16px", padding: "1.5rem 1.5rem 1.25rem", marginBottom: "1.5rem" }}>
      {/* Progress dots */}
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.25rem" }}>
        {steps.map((s, i) => (
          <div key={s.phase} style={{ width: i <= idx ? "20px" : "6px", height: "6px", borderRadius: "3px", background: i <= idx ? "var(--gold)" : "rgba(255,255,255,0.1)", transition: "all 0.4s ease" }} />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem", flexWrap: "wrap" }}>
        <div style={{ animation: "pulse 3s ease-in-out infinite" }}>
          <HandshakeSVG size={56} />
        </div>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <div style={{ fontSize: "0.56rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--gold)", marginBottom: "0.3rem" }}>
            Step {idx + 1} of {steps.length} · {current?.phase.toUpperCase()}
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.01em", margin: "0 0 0.35rem" }}>
            {current?.title}
          </h2>
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: "0 0 1rem", lineHeight: 1.5 }}>
            {current?.sub}
          </p>

          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
            {current?.href ? (
              <Link href={current.href} style={{ textDecoration: "none" }}>
                <button style={{ background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "8px", padding: "0.55rem 1.125rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif" }}>
                  {current.cta}
                </button>
              </Link>
            ) : (
              <button
                onClick={() => { if (current?.next === "done") { onComplete(); } else { setPhase(current!.next); } }}
                style={{ background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "8px", padding: "0.55rem 1.125rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif" }}>
                {current?.cta}
              </button>
            )}
            {idx > 0 && (
              <button onClick={() => setPhase(steps[idx - 1].phase)} style={{ background: "none", border: "1px solid var(--line)", borderRadius: "8px", padding: "0.5rem 0.875rem", color: "var(--subtle)", fontSize: "0.75rem", cursor: "pointer" }}>
                ← Back
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { vaults, events, heliusEvents, systemState, simulateHeliusEvent } = useSystemState();
  const [showHandshake, setShowHandshake] = useState(vaults.length === 0);
  const sc = STATE_CONFIG[systemState];
  const recentEvents = [...heliusEvents, ...events].sort((a, b) => b.ts - a.ts).slice(0, 5);

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem 1.25rem 3rem" }}>

      {/* Handshake onboarding — shown until vault is deployed */}
      {showHandshake && <HandshakeFlow onComplete={() => setShowHandshake(false)} />}

      {/* System state */}
      <div style={{ padding: "1rem 1.25rem", background: `${sc.color}0d`, border: `1px solid ${sc.color}33`, borderRadius: "14px", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: sc.color, animation: systemState !== "PROTECTED" && systemState !== "NO_VAULTS" ? "pulse 1s ease-in-out infinite" : "none" }} />
            <span style={{ fontSize: "0.62rem", fontWeight: 700, color: sc.color, letterSpacing: "0.12em", textTransform: "uppercase" }}>{sc.label}</span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>{sc.msg}</p>
        </div>
        <Link href="/protect" style={{ textDecoration: "none" }}>
          <button style={{ background: "#14F195", color: "var(--void)", border: "none", borderRadius: "8px", padding: "0.55rem 1.1rem", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
            {vaults.length === 0 ? "Deploy Vault →" : "Open Vaults →"}
          </button>
        </Link>
      </div>

      {/* 3-step flow */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,200px),1fr))", gap: "0.625rem", marginBottom: "1.5rem" }}>
        {[
          { step: "01", label: "Deploy Vault",   sub: "Container for asset + agent + policy",  href: "/protect", done: vaults.length > 0 },
          { step: "02", label: "Arm Circuit",     sub: "Activate protection · assign Sophia",   href: "/protect", done: vaults.some((v) => v.state !== "UNPROTECTED") },
          { step: "03", label: "Monitor Events",  sub: "Helius events drive state in real time", href: "/circuit", done: heliusEvents.length > 0 },
        ].map((s) => (
          <Link key={s.step} href={s.href} style={{ textDecoration: "none" }}>
            <div style={{ background: s.done ? "rgba(20,241,149,0.05)" : "var(--surface)", border: `1px solid ${s.done ? "rgba(20,241,149,0.2)" : "var(--line)"}`, borderRadius: "10px", padding: "0.875rem 1rem", cursor: "pointer", transition: "border-color 0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: s.done ? "#14F195" : "var(--subtle)" }}>{s.step}</span>
                {s.done && <span style={{ fontSize: "0.6rem", color: "#14F195" }}>✓</span>}
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.2rem" }}>{s.label}</div>
              <div style={{ fontSize: "0.62rem", color: "var(--subtle)" }}>{s.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Event log */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ padding: "0.625rem 1rem", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#14F195", animation: "pulse 1.5s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Event Log</span>
          </div>
          <button onClick={() => simulateHeliusEvent(vaults[0]?.id)} style={{ background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "5px", padding: "0.2rem 0.5rem", fontSize: "0.6rem", color: "var(--gold)", cursor: "pointer" }}>
            Simulate event
          </button>
        </div>
        {recentEvents.length === 0 ? (
          <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--subtle)", fontSize: "0.72rem" }}>
            No events yet — deploy a vault to start monitoring.
          </div>
        ) : (
          recentEvents.map((e, i) => {
            const isHelius = "riskSignal" in e;
            const ago = Math.max(1, Math.floor((Date.now() - e.ts) / 1000));
            const msg = isHelius ? `[HELIUS] ${(e as {type:string}).type}: ${(e as {description:string}).description}` : `${(e as {source:string}).source} ${(e as {message:string}).message}`;
            const risk = isHelius ? (e as {riskSignal:string}).riskSignal : (e as {severity:string}).severity;
            const c = risk === "high" || risk === "alert" ? "#f26b6b" : risk === "medium" || risk === "warn" ? "#FBBF24" : "var(--muted)";
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem", padding: "0.45rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <span style={{ fontSize: "0.7rem", color: c, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg}</span>
                <span style={{ fontSize: "0.58rem", color: "var(--subtle)", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>{ago}s</span>
              </div>
            );
          })
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
        <span style={{ fontSize: "0.6rem", color: "var(--subtle)", padding: "0.2rem 0.6rem", borderRadius: "4px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)" }}>
          Simulation Mode · Abraxas Protocol · abraxas-app.vercel.app
        </span>
      </div>
    </div>
  );
}