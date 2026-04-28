"use client";

import { useLiveFeed } from "@/lib/useLiveFeed";

const typeColor: Record<string, string> = {
  action: "var(--green)",
  defense: "var(--gold)",
  update: "var(--nebula)",
};

export function AgentFeed() {
  const { entries, secondsAgo } = useLiveFeed(8);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", overflow: "hidden" }}>
      <div style={{
        padding: "0.875rem 1.25rem",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--raise)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontWeight: 600, fontSize: "0.78rem", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text)" }}>
            Agent Activity
          </span>
        </div>
        <span style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)" }}>
          {secondsAgo === 0 ? "just now" : `${secondsAgo}s ago`}
        </span>
      </div>

      <div style={{ maxHeight: "360px", overflowY: "auto" }}>
        {entries.map((entry, i) => (
          <div
            key={entry.id}
            style={{
              padding: "0.65rem 1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.875rem",
              fontSize: "0.75rem",
              borderBottom: i < entries.length - 1 ? "1px solid var(--line)" : "none",
              background: i === 0 ? "rgba(255,255,255,0.025)" : "transparent",
              transition: "background 0.4s",
            }}
          >
            <span style={{ color: "var(--subtle)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", flexShrink: 0, width: "5.5rem" }}>
              {entry.ts}
            </span>
            <span style={{
              color: entry.agent === "SYSTEM" ? "var(--nebula)" : "var(--gold)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.65rem",
              flexShrink: 0,
              width: "5.5rem",
            }}>
              {entry.agent === "SYSTEM" ? "SYSTEM" : entry.agent}
            </span>
            <span style={{ color: "var(--subtle)", flexShrink: 0, fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace" }} className="hidden sm:block">
              {entry.vault}
            </span>
            <span style={{ color: "var(--muted)", flex: 1, lineHeight: 1.4 }}>{entry.action}</span>
            {entry.delta && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.65rem",
                flexShrink: 0,
                color: entry.delta === "defended"
                  ? "var(--gold)"
                  : entry.delta.startsWith("+")
                  ? "var(--green)"
                  : entry.delta.startsWith("-")
                  ? "var(--red)"
                  : "var(--subtle)",
              }}>
                {entry.delta}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}