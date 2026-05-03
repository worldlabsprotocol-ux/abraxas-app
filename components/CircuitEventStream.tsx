// FILE: components/CircuitEventStream.tsx
// Live circuit event stream — the main storytelling layer.
// Reads from protocolStream. New events appear every 6 seconds.
"use client";

import Link from "next/link";
import { useProtocolStream, timeAgo, StreamEvent, StreamEventType } from "@/lib/protocolStream";

const TYPE_CONFIG: Record<StreamEventType, { dot: string; tag: string }> = {
  circuit_detect: { dot: "#f0d98a",      tag: "DETECT"  },
  defense:        { dot: "#f26b6b",      tag: "DEFENSE" },
  agent_act:      { dot: "var(--green)", tag: "ACTION"  },
  vault_update:   { dot: "var(--gold)",  tag: "VAULT"   },
  system:         { dot: "var(--subtle)",tag: "SYSTEM"  },
};

const SEVERITY_BORDER: Record<StreamEvent["severity"], string> = {
  info:  "rgba(255,255,255,0.04)",
  warn:  "rgba(240,217,138,0.15)",
  alert: "rgba(242,107,107,0.2)",
};

interface Props {
  limit?:  number;
  compact?: boolean;  // compact = homepage widget version
}

export function CircuitEventStream({ limit = 20, compact = false }: Props) {
  const events = useProtocolStream(limit);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: compact ? "10px" : "14px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "0.75rem 1.1rem", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", animation: "pulse 1.5s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text)" }}>
            Protocol Feed
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.58rem", color: "var(--subtle)" }}>{events.length} events</span>
          {!compact && (
            <Link href="/circuit" style={{ fontSize: "0.62rem", color: "var(--gold)", textDecoration: "none" }}>
              Circuit →
            </Link>
          )}
        </div>
      </div>

      {/* Events */}
      <div style={{ maxHeight: compact ? "320px" : "560px", overflowY: "auto" }}>
        {events.map((ev, i) => {
          const cfg = TYPE_CONFIG[ev.type];
          return (
            <div key={ev.id} style={{
              display: "grid",
              gridTemplateColumns: "8px 72px 1fr 36px",
              gap: "0.625rem",
              alignItems: "flex-start",
              padding: "0.6rem 1.1rem",
              borderBottom: `1px solid ${i < events.length - 1 ? SEVERITY_BORDER[ev.severity] : "transparent"}`,
              background: ev.severity === "alert" ? "rgba(242,107,107,0.04)" : ev.severity === "warn" ? "rgba(240,217,138,0.02)" : "transparent",
              transition: "background 0.3s",
            }}>
              {/* Dot */}
              <div style={{ paddingTop: "4px" }}>
                <span style={{ display: "block", width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot }} />
              </div>

              {/* Tag + source */}
              <div>
                <span style={{ fontSize: "0.55rem", fontFamily: "'JetBrains Mono', monospace", color: cfg.dot, letterSpacing: "0.05em", display: "block", marginBottom: "1px" }}>
                  {cfg.tag}
                </span>
                <span style={{ fontSize: "0.62rem", fontFamily: "'JetBrains Mono', monospace", color: "var(--subtle)", whiteSpace: "nowrap" }}>
                  {ev.source}
                </span>
              </div>

              {/* Message */}
              <span style={{ fontSize: "0.75rem", color: ev.severity === "alert" ? "#f26b6b" : ev.severity === "warn" ? "#f0d98a" : "var(--muted)", lineHeight: 1.4 }}>
                {ev.message}
              </span>

              {/* Timestamp */}
              <span style={{ fontSize: "0.58rem", color: "var(--subtle)", fontFamily: "'JetBrains Mono', monospace", textAlign: "right", paddingTop: "2px", whiteSpace: "nowrap" }}>
                {timeAgo(ev.ts)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}