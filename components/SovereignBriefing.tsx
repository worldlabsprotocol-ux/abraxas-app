// FILE: components/SovereignPulse.tsx
// Real-time blockchain event terminal.
// Replaces the "Connect Helius" setup box entirely.
// Shows: LIVE status, scrolling agent reasoning, raw event stream.
// Simulate button for demo. No setup required.
"use client";

import { useEffect, useRef } from "react";
import { useHeliusStream } from "@/lib/useHeliusStream";
import { useSystemState, simulateHeliusEvent } from "@/lib/systemState";

const STATUS_CONFIG = {
  LIVE:         { color: "#60A5FA", label: "LIVE",         pulse: true  },
  CONNECTING:   { color: "#FBBF24", label: "CONNECTING…",  pulse: true  },
  DISCONNECTED: { color: "#f26b6b", label: "DISCONNECTED", pulse: false },
  IDLE:         { color: "var(--subtle)", label: "IDLE",   pulse: false },
};

const RISK_COLOR = { high: "#f26b6b", medium: "#FBBF24", low: "#14F195", none: "var(--subtle)" };

export function SovereignPulse({ vaultId }: { vaultId?: string }) {
  const stream = useHeliusStream(vaultId);
  const { heliusEvents, vaults } = useSystemState();
  const sc      = STATUS_CONFIG[stream.status];
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll reasoning terminal to top on new events
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [stream.reasoning.length]);

  return (
    <div style={{ background: "rgba(2,3,10,0.97)", border: `1px solid ${sc.color}33`, borderRadius: "12px", overflow: "hidden", fontFamily: "'JetBrains Mono',monospace" }}>
      {/* Header bar */}
      <div style={{ padding: "0.625rem 1rem", borderBottom: `1px solid ${sc.color}22`, display: "flex", alignItems: "center", justifyContent: "space-between", background: `${sc.color}08` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: sc.color, boxShadow: `0 0 8px ${sc.color}`, animation: sc.pulse ? "pulse 1s ease-in-out infinite" : "none" }} />
          <span style={{ fontSize: "0.62rem", fontWeight: 700, color: sc.color, letterSpacing: "0.14em" }}>
            SOVEREIGN PULSE · {sc.label}
          </span>
          {stream.eventCount > 0 && (
            <span style={{ fontSize: "0.56rem", color: `${sc.color}88`, letterSpacing: "0.06em" }}>
              {stream.eventCount} events
            </span>
          )}
        </div>
        <button
          onClick={() => simulateHeliusEvent(vaultId ?? vaults[0]?.id)}
          style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: "5px", padding: "0.18rem 0.5rem", fontSize: "0.58rem", color: "#60A5FA", cursor: "pointer", letterSpacing: "0.06em" }}>
          SIM EVENT
        </button>
      </div>

      {/* Agent reasoning terminal */}
      <div ref={scrollRef} style={{ height: "160px", overflowY: "auto", padding: "0.625rem 1rem" }}>
        {stream.reasoning.length === 0 ? (
          <div>
            <p style={{ fontSize: "0.6rem", color: "var(--subtle)", margin: "0 0 0.25rem" }}>
              {`> SOVEREIGN PULSE INITIALIZED`}
            </p>
            <p style={{ fontSize: "0.6rem", color: "var(--subtle)", margin: "0 0 0.25rem" }}>
              {`> SOPHIA AGENTS STANDING BY`}
            </p>
            <p style={{ fontSize: "0.6rem", color: "#60A5FA", margin: 0, animation: "pulse 2s ease-in-out infinite" }}>
              {`> AWAITING HELIUS STREAM...`}
            </p>
          </div>
        ) : (
          stream.reasoning.map((line, i) => (
            <p key={i} style={{ margin: "0 0 0.2rem", fontSize: "0.6rem", color: i === 0 ? "#60A5FA" : `rgba(96,165,250,${Math.max(0.2, 1 - i * 0.05)})`, lineHeight: 1.5 }}>
              {line}
            </p>
          ))
        )}
      </div>

      {/* Event stream */}
      <div style={{ borderTop: "1px solid rgba(96,165,250,0.1)", maxHeight: "200px", overflowY: "auto" }}>
        {heliusEvents.length === 0 && (
          <div style={{ padding: "0.875rem 1rem", fontSize: "0.6rem", color: "var(--subtle)" }}>
            {`> NO EVENTS RECEIVED — CLICK SIM EVENT TO TEST`}
          </div>
        )}
        {heliusEvents.slice(0, 12).map((e) => {
          const ago = Math.max(1, Math.floor((Date.now() - e.ts) / 1000));
          const rc  = RISK_COLOR[e.riskSignal];
          return (
            <div key={e.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "0.625rem", alignItems: "center", padding: "0.35rem 1rem", borderBottom: "1px solid rgba(96,165,250,0.06)" }}>
              <span style={{ fontSize: "0.56rem", color: rc, fontWeight: 700, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                {e.riskSignal.toUpperCase()}
              </span>
              <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.type}: {e.description}
              </span>
              <span style={{ fontSize: "0.56rem", color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap" }}>
                {ago}s
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}