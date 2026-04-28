"use client";

import { useLiveFeed } from "@/lib/useLiveFeed";

/**
 * Minimal "Last updated Xs ago" heartbeat strip.
 * Resets whenever a new live entry fires.
 */
export function Heartbeat() {
  const { secondsAgo } = useLiveFeed(0);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span style={{
        width: "5px", height: "5px", borderRadius: "50%",
        background: "var(--green)",
        display: "inline-block",
        animation: "pulse 2s ease-in-out infinite",
        flexShrink: 0,
      }} />
      <span style={{ fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)" }}>
        Updated {secondsAgo === 0 ? "just now" : `${secondsAgo}s ago`}
      </span>
    </div>
  );
}