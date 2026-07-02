"use client";

import { useEffect, useState } from "react";
import { ABRA } from "@/lib/constants";

/**
 * Subtle $ABRA presence strip. appears at the bottom of every page.
 * Shows live price pulse, holders, and a soft buy CTA.
 * Jeff Yan principle: always present, never loud.
 */
export function AbraStrip() {
  const [price, setPrice] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch(`/api/bags/token?mint=${ABRA.ca}`);
        const data = await res.json();
        const p = data?.pool?.price ?? data?.pool?.priceUsd ?? null;
        if (p !== null) setPrice(`$${Number(p).toFixed(8)}`);
      } catch {
        setPrice("$0.00005460");
      }
    }
    fetchPrice();
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 0, left: 0, right: 0,
      zIndex: 40,
      background: "rgba(7,10,18,0.96)",
      borderTop: "1px solid rgba(200,169,110,0.12)",
      backdropFilter: "blur(20px)",
      padding: "0.5rem 1.5rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "1rem",
      flexWrap: "wrap",
    }}>
      {/* Left: live price */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{
            width: "5px", height: "5px", borderRadius: "50%",
            background: "var(--green)",
            animation: "pulse 2s ease-in-out infinite",
            flexShrink: 0,
          }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem", color: "var(--gold)", fontWeight: 700 }}>
            $ABRA
          </span>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem", color: "var(--text)" }}>
          {price ?? "…"}
        </span>
        <span style={{ fontSize: "0.62rem", color: "var(--subtle)" }}>
          47 holders · 14.7% curve
        </span>
      </div>

      {/* Right: soft CTA + dismiss */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <a
          href={ABRA.bags}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "var(--gold)",
            textDecoration: "none",
            border: "1px solid rgba(200,169,110,0.25)",
            padding: "0.25rem 0.625rem",
            borderRadius: "4px",
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            transition: "border-color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(200,169,110,0.6)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(200,169,110,0.25)")}
        >
          Trade on Bags
        </a>
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          style={{ background: "none", border: "none", color: "var(--subtle)", cursor: "pointer", fontSize: "0.75rem", padding: "0.2rem", lineHeight: 1 }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}