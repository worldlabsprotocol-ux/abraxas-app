// FILE: components/SovereignPulse.tsx
// Sovereign Pulse — always alive. Nuclear reactor at idle, not a dead terminal.
// IDLE state: "MONITORING GLOBAL RAILS" with heartbeat.
// CONNECTING: "SYSTEM INITIALIZING" with build-up animation.
// LIVE: full event stream.
"use client";

import { useEffect, useRef, useState } from "react";
import { useHeliusStream } from "@/lib/useHeliusStream";
import { useSystemState, simulateHeliusEvent } from "@/lib/systemState";

const STATUS_CONFIG = {
  LIVE:         { color: "#60A5FA", label: "LIVE · MONITORING GLOBAL RAILS",  pulse: true,  fast: true  },
  CONNECTING:   { color: "#FBBF24", label: "SYSTEM INITIALIZING",              pulse: true,  fast: true  },
  DISCONNECTED: { color: "#FBBF24", label: "MONITORING ACTIVE · LOCAL MODE",   pulse: true,  fast: false },
  IDLE:         { color: "#14F195", label: "SYSTEM READY · MONITORING ACTIVE", pulse: true,  fast: false },
};

// Idle heartbeat messages — shown when stream is quiet
const HEARTBEAT_LINES = [
  "[00:00:00] [CIRCUIT]  All circuits nominal — monitoring vault PDAs on-chain",
  "[00:00:01] [SOPHIA]   Agent evaluation cycle complete — no anomalies",
  "[00:00:02] [SCAN]     Helius telemetry active — awaiting on-chain events",
  "[00:00:03] [CIRCUIT]  Liquidity depth nominal across all monitored pools",
  "[00:00:04] [SOPHIA]   Strategy bounds verified — portfolio within policy",
  "[00:00:05] [SCAN]     Oracle price feeds stable — no deviation detected",
  "[00:00:06] [CIRCUIT]  Circuit breaker armed — threshold monitoring active",
  "[00:00:07] [SOPHIA]   Counterparty credit scores within acceptable range",
  "[00:00:08] [SCAN]     Block progression nominal — 0 missed slots",
  "[00:00:09] [CIRCUIT]  Reserve buffer at 22% — above minimum threshold",
];

const RISK_COLOR: Record<string, string> = {
  high: "#f26b6b", medium: "#FBBF24", low: "#14F195", none: "rgba(96,165,250,0.6)",
};

export function SovereignPulse({ vaultId }: { vaultId?: string }) {
  const stream       = useHeliusStream(vaultId);
  const { heliusEvents, vaults } = useSystemState();
  const sc           = STATUS_CONFIG[stream.status];
  const scrollRef    = useRef<HTMLDivElement>(null);
  const [heartbeatIdx, setHeartbeatIdx] = useState(0);
  const [heartbeatLines, setHeartbeatLines] = useState<string[]>([HEARTBEAT_LINES[0]]);

  // Always-alive heartbeat — fires even when stream is quiet
  useEffect(() => {
    const ts = new Date().toISOString().slice(11, 19);
    const iv = setInterval(() => {
      setHeartbeatIdx((i) => {
        const next = (i + 1) % HEARTBEAT_LINES.length;
        const line = `[${new Date().toISOString().slice(11,19)}]${HEARTBEAT_LINES[next].slice(10)}`;
        setHeartbeatLines((prev) => [line, ...prev].slice(0, 20));
        return next;
      });
    }, 4_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [stream.reasoning.length, heartbeatLines.length]);

  // Merge real reasoning with heartbeat — real events take priority at top
  const terminalLines = stream.reasoning.length > 0
    ? [...stream.reasoning, ...heartbeatLines].slice(0, 20)
    : heartbeatLines;

  return (
    <div style={{ background: "rgba(2,3,10,0.97)", border: `1px solid ${sc.color}33`, borderRadius: "12px", overflow: "hidden", fontFamily: "'JetBrains Mono',monospace" }}>
      {/* Header */}
      <div style={{ padding: "0.625rem 1rem", borderBottom: `1px solid ${sc.color}22`, display: "flex", alignItems: "center", justifyContent: "space-between", background: `${sc.color}08` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Pulsing ring for always-alive feel */}
          <div style={{ position: "relative", width: "10px", height: "10px", flexShrink: 0 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: sc.color, opacity: 0.3, animation: "pulse 1.5s ease-in-out infinite" }} />
            <span style={{ position: "absolute", inset: "2px", borderRadius: "50%", background: sc.color, boxShadow: `0 0 6px ${sc.color}` }} />
          </div>
          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: sc.color, letterSpacing: "0.12em" }}>
            SOVEREIGN PULSE · {sc.label}
          </span>
          {stream.eventCount > 0 && (
            <span style={{ fontSize: "0.56rem", color: `${sc.color}88` }}>{stream.eventCount} events</span>
          )}
        </div>
        <button
          onClick={() => simulateHeliusEvent(vaultId ?? vaults[0]?.id)}
          style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: "5px", padding: "0.18rem 0.5rem", fontSize: "0.58rem", color: "#60A5FA", cursor: "pointer", letterSpacing: "0.06em" }}>
          STRESS TEST
        </button>
      </div>

      {/* Terminal — always has content */}
      <div ref={scrollRef} style={{ height: "150px", overflowY: "auto", padding: "0.625rem 1rem" }}>
        {terminalLines.map((line, i) => (
          <p key={i} style={{ margin: "0 0 0.2rem", fontSize: "0.6rem", color: i === 0 ? sc.color : `rgba(96,165,250,${Math.max(0.15, 0.8 - i * 0.04)})`, lineHeight: 1.5 }}>
            {line}
          </p>
        ))}
      </div>

      {/* Event stream — shows real events, gracefully empty */}
      <div style={{ borderTop: "1px solid rgba(96,165,250,0.1)", maxHeight: "180px", overflowY: "auto" }}>
        {heliusEvents.length === 0 ? (
          <div style={{ padding: "0.75rem 1rem", fontSize: "0.6rem", color: "rgba(96,165,250,0.4)" }}>
            {`> NO ANOMALIES DETECTED — SYSTEM OPERATING NORMALLY`}
          </div>
        ) : (
          heliusEvents.slice(0, 10).map((e) => {
            const ago = Math.max(1, Math.floor((Date.now() - e.ts) / 1000));
            return (
              <div key={e.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "0.625rem", alignItems: "center", padding: "0.3rem 1rem", borderBottom: "1px solid rgba(96,165,250,0.06)" }}>
                <span style={{ fontSize: "0.56rem", color: RISK_COLOR[e.riskSignal], fontWeight: 700, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                  {e.riskSignal.toUpperCase()}
                </span>
                <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.type}: {e.description}
                </span>
                <span style={{ fontSize: "0.56rem", color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap" }}>{ago}s</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}