// FILE: app/page.tsx
// Control entry point. Forces user into: Deploy Vault → Assign Agent → Arm Circuit.
// No passive browsing. Every section ends in an action.
"use client";

import Link from "next/link";
import { useSystemState } from "@/lib/systemState";

const STATE_CONFIG = {
  NO_VAULTS:         { label: "No Vaults", color: "var(--subtle)", msg: "Deploy a vault to begin." },
  UNPROTECTED:       { label: "Exposed",    color: "#FBBF24",       msg: "Assets deployed but unprotected. Activate Circuit." },
  PROTECTED:         { label: "Protected",  color: "#14F195",       msg: "Circuit active. Monitoring blockchain events." },
  AT_RISK:           { label: "At Risk",    color: "var(--gold)",   msg: "Risk event detected. Review vault and trigger Circuit." },
  CIRCUIT_TRIGGERED: { label: "Triggered",  color: "#f26b6b",       msg: "Circuit triggered. Simulated freeze applied. Review logs." },
};

export default function HomePage() {
  const { vaults, events, heliusEvents, systemState, simulateHeliusEvent } = useSystemState();
  const sc  = STATE_CONFIG[systemState];
  const recentEvents = [...heliusEvents, ...events].sort((a, b) => b.ts - a.ts).slice(0, 5);

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem 1.25rem 3rem" }}>

      {/* System state — always first */}
      <div style={{ padding: "1.25rem 1.5rem", background: `${sc.color}0d`, border: `1px solid ${sc.color}33`, borderRadius: "14px", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: sc.color, animation: systemState !== "PROTECTED" && systemState !== "NO_VAULTS" ? "pulse 1s ease-in-out infinite" : "none" }} />
            <span style={{ fontSize: "0.62rem", fontWeight: 700, color: sc.color, letterSpacing: "0.12em", textTransform: "uppercase" }}>{sc.label}</span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>{sc.msg}</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/protect" style={{ textDecoration: "none" }}>
            <button style={{ background: "#14F195", color: "var(--void)", border: "none", borderRadius: "8px", padding: "0.6rem 1.25rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
              {vaults.length === 0 ? "Deploy Vault →" : "Open Vaults →"}
            </button>
          </Link>
        </div>
      </div>

      {/* 3-step control flow */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,200px),1fr))", gap: "0.625rem", marginBottom: "1.5rem" }}>
        {[
          { step: "01", label: "Deploy Vault",    sub: "Container for asset + agent + policy", href: "/protect", done: vaults.length > 0, cta: "Deploy →" },
          { step: "02", label: "Arm Circuit",     sub: "Activate protection and assign Sophia", href: "/protect", done: vaults.some((v) => v.state === "PROTECTED" || v.state === "AT_RISK" || v.state === "CIRCUIT_TRIGGERED"), cta: "Arm →" },
          { step: "03", label: "Monitor Events",  sub: "Helius blockchain events drive state", href: "/circuit", done: heliusEvents.length > 0, cta: "View →" },
        ].map((s) => (
          <Link key={s.step} href={s.href} style={{ textDecoration: "none" }}>
            <div style={{ background: s.done ? "rgba(20,241,149,0.05)" : "var(--surface)", border: `1px solid ${s.done ? "rgba(20,241,149,0.2)" : "var(--line)"}`, borderRadius: "10px", padding: "0.875rem 1rem", cursor: "pointer" }}>
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

      {/* Live event snapshot */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden", marginBottom: "1.25rem" }}>
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
            const c    = risk === "high" || risk === "alert" ? "#f26b6b" : risk === "medium" || risk === "warn" ? "#FBBF24" : "var(--muted)";
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem", padding: "0.45rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <span style={{ fontSize: "0.7rem", color: c, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg}</span>
                <span style={{ fontSize: "0.58rem", color: "var(--subtle)", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>{ago}s</span>
              </div>
            );
          })
        )}
      </div>

      {/* Simulation label */}
      <div style={{ textAlign: "center" }}>
        <span style={{ fontSize: "0.6rem", color: "var(--subtle)", padding: "0.2rem 0.6rem", borderRadius: "4px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)" }}>
          Simulation Mode — no funds moved · Deterministic system
        </span>
      </div>
    </div>
  );
}