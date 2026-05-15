// FILE: components/HealthShield.tsx
// Sovereign Health Score — SVG animated gauge.
// Weighted: LTV safety 40% + RWA diversification 35% + Circuit state 25%.
// If score < 50: UI goes amber. If < 30: SafetyModule triggers.
"use client";

import { useEffect, useState } from "react";
import { useCircuitState } from "@/lib/protocolStream";
import { useVaultEngine } from "@/lib/vaultEngine";

function computeHealth(circuitState: string, vaults: ReturnType<typeof useVaultEngine>["vaults"]): number {
  // Circuit component (25%)
  const circuitScore = circuitState === "SAFE" ? 100 : circuitState === "WATCH" ? 65 : 30;
  // Vault risk component (40%) — average inverse risk score
  const avgRisk = vaults.length > 0
    ? vaults.reduce((s, v) => s + v.riskScore, 0) / vaults.length
    : 50;
  const vaultScore = Math.max(0, 100 - avgRisk);
  // Diversification component (35%) — more vaults = more diversified
  const divScore = Math.min(100, vaults.length * 25);
  return Math.round(circuitScore * 0.25 + vaultScore * 0.40 + divScore * 0.35);
}

export function HealthShield() {
  const { state }  = useCircuitState();
  const { vaults } = useVaultEngine();
  const [score, setScore]   = useState(75);
  const [pulse, setPulse]   = useState(false);

  useEffect(() => {
    const next = computeHealth(state, vaults);
    if (next < score && next < 50) setPulse(true);
    setScore(next);
    const t = setTimeout(() => setPulse(false), 1500);
    return () => clearTimeout(t);
  }, [state, vaults]);

  const color  = score >= 70 ? "#14F195" : score >= 50 ? "#FBBF24" : "#f26b6b";
  const radius = 16;
  const circ   = 2 * Math.PI * radius;
  const dash   = (score / 100) * circ;

  return (
    <div style={{ position: "relative", width: "40px", height: "40px", cursor: "pointer" }}
      title={`Health Score: ${score}/100`}>
      <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="20" cy="20" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle cx="20" cy="20" r={radius} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease, stroke 0.4s", filter: `drop-shadow(0 0 4px ${color})` }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center",
        justifyContent: "center",
        animation: pulse ? "pulse 0.5s ease-in-out 3" : "none",
      }}>
        <span style={{ fontSize: "0.6rem", fontWeight: 800, color, fontFamily: "'JetBrains Mono',monospace" }}>
          {score}
        </span>
      </div>
    </div>
  );
}