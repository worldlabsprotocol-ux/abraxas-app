// FILE: components/Nav.tsx
"use client";

import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useCircuitState } from "@/lib/protocolStream";

export function Nav() {
  const { state } = useCircuitState();
  const pulseColor = state === "RISK" ? "#f26b6b" : state === "WATCH" ? "#FBBF24" : "#14F195";

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      height: "56px",
      display: "flex", alignItems: "center",
      padding: "0 1rem",
      justifyContent: "space-between",
      background: "rgba(0,0,0,0.4)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1px solid rgba(200,169,110,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 10px rgba(200,169,110,0.9)" }} />
        </div>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "0.875rem", letterSpacing: "0.12em", color: "var(--gold)", textTransform: "uppercase" }}>
          Abraxas
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.15rem 0.5rem", borderRadius: "100px", background: `${pulseColor}14`, border: `1px solid ${pulseColor}30` }}>
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: pulseColor, animation: "pulse 1.5s ease-in-out infinite", boxShadow: `0 0 6px ${pulseColor}` }} />
          <span style={{ fontSize: "0.58rem", fontWeight: 700, color: pulseColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {state === "RISK" ? "Alert" : state === "WATCH" ? "Watch" : "Online"}
          </span>
        </div>
      </div>
      <div style={{ boxShadow: "0 0 15px rgba(20,241,149,0.25)", borderRadius: "8px" }}>
        <ConnectWalletButton size="sm" compact />
      </div>
    </nav>
  );
}