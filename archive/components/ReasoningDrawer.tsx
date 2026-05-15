// FILE: components/ReasoningDrawer.tsx
// Terminal-style reasoning log. Slides up from bottom.
// Pulls from /api/agent/tick logs and protocolStream events.
// 1-tap access — the trust layer.
"use client";

import { useState, useEffect } from "react";
import { useProtocolStream } from "@/lib/protocolStream";

interface LogEntry {
  ts:     number;
  phase:  "SCAN" | "CORRELATE" | "ASSESS" | "EXECUTE" | "MONITOR";
  detail: string;
}

// Derive decision chain entries from the live protocol stream
function streamToChain(events: ReturnType<typeof useProtocolStream>): LogEntry[] {
  return events.slice(0, 20).map((e) => {
    const phase: LogEntry["phase"] =
      e.type === "circuit_detect" ? "SCAN"      :
      e.type === "defense"        ? "ASSESS"    :
      e.type === "agent_act"      ? "EXECUTE"   :
      e.type === "vault_update"   ? "CORRELATE" : "MONITOR";
    return { ts: e.ts, phase, detail: `${e.source} ${e.message}` };
  });
}

const PHASE_COLOR: Record<string, string> = {
  SCAN:      "#60A5FA",
  CORRELATE: "#FBBF24",
  ASSESS:    "#f0d98a",
  EXECUTE:   "#14F195",
  MONITOR:   "#6b7280",
};

export function ReasoningDrawer() {
  const [open, setOpen]   = useState(false);
  const events            = useProtocolStream(20);
  const chain             = streamToChain(events);

  // Keyboard shortcut: R to toggle
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "r" && !e.metaKey) setOpen((v) => !v); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  return (
    <>
      {/* Trigger button — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed", bottom: "88px", left: "16px", zIndex: 60,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(96,165,250,0.3)", borderRadius: "8px",
          padding: "0.35rem 0.7rem", display: "flex", alignItems: "center", gap: "0.4rem",
          cursor: "pointer", boxShadow: "0 0 12px rgba(96,165,250,0.1)",
        }}>
        <span style={{ fontSize: "0.58rem", fontFamily: "'JetBrains Mono',monospace", color: "#60A5FA", letterSpacing: "0.06em" }}>
          DECISION CHAIN
        </span>
        <span style={{ fontSize: "0.55rem", color: "rgba(96,165,250,0.5)" }}>[R]</span>
      </button>

      {/* Drawer */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 70,
        height: open ? "60vh" : 0,
        overflow: "hidden",
        transition: "height 0.3s cubic-bezier(0.4,0,0.2,1)",
        background: "rgba(2,3,10,0.97)",
        backdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(96,165,250,0.2)",
      }}>
        {/* Drawer header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 1.25rem", borderBottom: "1px solid rgba(96,165,250,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#60A5FA", animation: "pulse 1.5s ease-in-out infinite" }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", color: "#60A5FA", fontWeight: 700, letterSpacing: "0.1em" }}>
              ABRAXAS PRIME // DECISION AUDIT TRAIL
            </span>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--subtle)", cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
        </div>

        {/* Log entries */}
        <div style={{ overflowY: "auto", height: "calc(100% - 52px)", padding: "0.75rem 1.25rem", fontFamily: "'JetBrains Mono',monospace" }}>
          {chain.length === 0 && (
            <p style={{ fontSize: "0.72rem", color: "var(--subtle)" }}>Awaiting agent activity…</p>
          )}
          {chain.map((entry, i) => {
            const d  = new Date(entry.ts);
            const ts = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "70px 90px 1fr", gap: "0.75rem", alignItems: "flex-start", padding: "0.3rem 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.2)" }}>[{ts}]</span>
                <span style={{ fontSize: "0.62rem", fontWeight: 700, color: PHASE_COLOR[entry.phase] ?? "#6b7280" }}>
                  [{entry.phase}]
                </span>
                <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                  {entry.detail}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overlay click to close */}
      {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 65, background: "rgba(0,0,0,0.4)" }} />}
    </>
  );
}