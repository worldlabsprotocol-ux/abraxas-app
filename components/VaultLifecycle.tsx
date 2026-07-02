"use client";

import { Vault } from "@/lib/mockData";

/**
 * Shows the vault lifecycle in plain language. no DeFi jargon.
 * "Graduating" = the vault has proven its strategy and is entering
 * full autonomous operation. Artists and web2 users understand
 * this framing immediately.
 */

const STAGES = [
  {
    key: "bonding",
    label: "Building",
    plain: "Strategy proven, capital pooling",
    desc: "The vault is establishing its track record. Agent is active, positions are opening, and performance history is being built on-chain.",
    icon: "◌",
  },
  {
    key: "graduating",
    label: "Graduating",
    plain: "Leaving initial phase, entering full operation",
    desc: "The vault has met its performance thresholds. This is the transition from early access to full autonomous operation. like an artist going from independent release to distribution deal.",
    icon: "◎",
  },
  {
    key: "operating",
    label: "Operating",
    plain: "Fully autonomous, actively compounding",
    desc: "Full operation. The agent executes continuously, yield compounds automatically, and circuit defense monitors every position in real time.",
    icon: "●",
  },
  {
    key: "paused",
    label: "Paused",
    plain: "Manual review in progress",
    desc: "A defense event triggered a pause for manual review. All capital is preserved. This is a feature, not a bug. the system protected your position.",
    icon: "◑",
  },
];

const STATUS_COLORS: Record<string, string> = {
  operating: "var(--green)",
  graduating: "var(--gold)",
  bonding: "#6b8cff",
  paused: "#fbbf24",
};

export function VaultLifecycle({ vault }: { vault: Vault }) {
  const currentIdx = STAGES.findIndex((s) =>
    vault.status === "graduating" ? s.key === "graduating"
    : vault.status === "operating" ? s.key === "operating"
    : vault.status === "paused" ? s.key === "paused"
    : s.key === "bonding"
  );

  const currentStage = STAGES[currentIdx] ?? STAGES[0];
  const color = STATUS_COLORS[vault.status] ?? "var(--muted)";

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)" }}>
          Vault Status
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, ...(vault.status === "operating" ? { animation: "pulse 2s ease-in-out infinite" } : {}) }} />
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {currentStage.label}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: "flex", gap: "3px", marginBottom: "1rem" }}>
        {STAGES.filter((s) => s.key !== "paused").map((stage, i) => {
          const stageIdx = STAGES.indexOf(stage);
          const isActive = stageIdx === currentIdx;
          const isPast = stageIdx < currentIdx;
          return (
            <div key={stage.key} style={{ flex: 1, height: "3px", borderRadius: "2px", background: isActive ? color : isPast ? "rgba(200,169,110,0.4)" : "var(--line)", transition: "background 0.3s" }} />
          );
        })}
      </div>

      {/* Current stage plain-language description */}
      <div style={{ background: `${color}10`, border: `1px solid ${color}25`, borderRadius: "8px", padding: "0.875rem 1rem", marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 600, color, marginBottom: "0.3rem" }}>
          {currentStage.plain}
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.6 }}>
          {currentStage.desc}
        </p>
      </div>

      {/* What this means in plain terms */}
      {vault.status === "graduating" && (
        <div style={{ fontSize: "0.72rem", color: "var(--subtle)", lineHeight: 1.6, padding: "0.75rem", background: "var(--raise)", borderRadius: "8px" }}>
          <span style={{ color: "var(--gold)", fontWeight: 600 }}>Think of it like this: </span>
          A graduating vault has proven its strategy works. It's in its final transition before full autonomous operation starts. Early depositors in graduating vaults are positioned ahead of the full launch.
        </div>
      )}

      {vault.status === "operating" && (
        <div style={{ fontSize: "0.72rem", color: "var(--subtle)", lineHeight: 1.6, padding: "0.75rem", background: "var(--raise)", borderRadius: "8px" }}>
          <span style={{ color: "var(--green)", fontWeight: 600 }}>Fully live. </span>
          Your agent is executing right now. Every distribution is captured. Every risk threshold is monitored. This is the system doing exactly what it was built to do.
        </div>
      )}
    </div>
  );
}