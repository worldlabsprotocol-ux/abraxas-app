// FILE: components/CircuitShield.tsx
// Defense status indicator for vault cards.
// Shows: ARMED / INACTIVE / TRIGGERED with animated shield.
// ElevenLabs voice interrupt only fires on Level 1 events (liquidation < 10% or yield gap > 10%).
"use client";

import { useState, useCallback } from "react";
import { SystemVault, triggerCircuit } from "@/lib/systemState";
import { useHeliusStream } from "@/lib/useHeliusStream";

const SHIELD_STATE = {
  UNPROTECTED:       { color: "var(--subtle)", label: "NO DEFENSE",  pulse: false, shieldFill: "none"              },
  PROTECTED:         { color: "#14F195",       label: "ARMED",        pulse: true,  shieldFill: "rgba(20,241,149,0.15)" },
  AT_RISK:           { color: "#FBBF24",       label: "ALERT",        pulse: true,  shieldFill: "rgba(251,191,36,0.15)" },
  CIRCUIT_TRIGGERED: { color: "#f26b6b",       label: "TRIGGERED",    pulse: true,  shieldFill: "rgba(242,107,107,0.2)" },
};

// Only call ElevenLabs for Level 1 priority events
const LEVEL1_TRIGGERS = ["LIQUIDATION", "LOAN_FOX", "ANOMALY"];
const VOICE_ENABLED   = process.env.NEXT_PUBLIC_VOICE_ENABLED === "true";

async function speakPriorityAlert(message: string) {
  if (!VOICE_ENABLED) return;
  try {
    await fetch("/api/voice", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text: message }),
    });
  } catch {}
}

export function CircuitShield({ vault }: { vault: SystemVault }) {
  const stream  = useHeliusStream(vault.id);
  const sc      = SHIELD_STATE[vault.state];
  const [manualTriggering, setManualTriggering] = useState(false);

  // Auto-trigger circuit on Level 1 Helius events
  const lastType = stream.lastEvent?.type ?? "";
  const isLevel1 = LEVEL1_TRIGGERS.includes(lastType);

  // If a Level 1 event just arrived and vault is PROTECTED → auto-trigger
  if (isLevel1 && vault.state === "PROTECTED" && stream.lastEvent && Date.now() - stream.lastEvent.ts < 3000) {
    triggerCircuit(vault.id);
    speakPriorityAlert(
      `Priority alert on ${vault.name}. ${lastType} detected. Circuit triggered. Simulated freeze applied. Review immediately.`
    );
  }

  const handleManualTrigger = useCallback(async () => {
    setManualTriggering(true);
    await new Promise((r) => setTimeout(r, 500));
    triggerCircuit(vault.id);
    setManualTriggering(false);
  }, [vault.id]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.45rem 0.625rem", background: `${sc.color}0d`, border: `1px solid ${sc.color}25`, borderRadius: "8px" }}>
      {/* Shield SVG */}
      <svg width="16" height="18" viewBox="0 0 16 18" fill="none" style={{ flexShrink: 0 }}>
        <path d="M8 1L1 4v5c0 4.4 3 8.1 7 9 4-0.9 7-4.6 7-9V4L8 1z"
          fill={sc.shieldFill} stroke={sc.color} strokeWidth="1.2"
          style={{ filter: sc.pulse ? `drop-shadow(0 0 4px ${sc.color})` : "none", transition: "all 0.3s" }} />
        {vault.state === "CIRCUIT_TRIGGERED" && (
          <path d="M8 5v4M8 11v1" stroke={sc.color} strokeWidth="1.5" strokeLinecap="round" />
        )}
        {vault.state === "PROTECTED" && (
          <path d="M5 9l2 2 4-4" stroke={sc.color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>

      {/* Status */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: sc.color, flexShrink: 0, animation: sc.pulse ? "pulse 1s ease-in-out infinite" : "none", boxShadow: sc.pulse ? `0 0 4px ${sc.color}` : "none" }} />
          <span style={{ fontSize: "0.58rem", fontWeight: 700, color: sc.color, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace" }}>
            {sc.label}
          </span>
          {stream.status === "LIVE" && (
            <span style={{ fontSize: "0.54rem", color: "#60A5FA", letterSpacing: "0.06em", fontFamily: "'JetBrains Mono',monospace" }}>· STREAM LIVE</span>
          )}
        </div>
        {vault.state === "PROTECTED" && vault.policy && (
          <div style={{ fontSize: "0.56rem", color: "var(--subtle)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px", marginTop: "1px" }}>
            {vault.policy}
          </div>
        )}
      </div>

      {/* Manual trigger */}
      {vault.state === "AT_RISK" && (
        <button onClick={handleManualTrigger} disabled={manualTriggering} style={{ flexShrink: 0, background: "#FBBF2418", border: "1px solid #FBBF2440", borderRadius: "4px", padding: "0.12rem 0.4rem", fontSize: "0.56rem", color: "#FBBF24", cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em" }}>
          {manualTriggering ? "…" : "TRIGGER"}
        </button>
      )}
    </div>
  );
}