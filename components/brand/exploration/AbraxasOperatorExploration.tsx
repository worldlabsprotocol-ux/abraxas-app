"use client";

import type { OperatorDirectionId } from "@/lib/brand/exploration/brandExplorationMeta";
import { BRAND_EXPLORATION_COLORS } from "@/lib/brand/exploration/brandExplorationMeta";
import { AbraxasExplorationMark } from "./AbraxasExplorationMark";

const C = BRAND_EXPLORATION_COLORS;

export function AbraxasOperatorExploration({
  direction,
  size = 120,
  reducedMotion = false,
}: {
  direction: OperatorDirectionId;
  size?: number;
  reducedMotion?: boolean;
}) {
  const idleClass = reducedMotion ? "" : "abx-operator-idle";
  return (
    <div
      className={idleClass}
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "grid",
        placeItems: "center",
      }}
      aria-hidden
    >
      {direction === "sentinel" ? (
        <svg width={size} height={size} viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="44" fill="#0F1419" stroke="#2A3440" strokeWidth="2" />
          <circle cx="48" cy="54" r="9" fill="#F8FAFC" />
          <circle cx="72" cy="54" r="9" fill="#F8FAFC" />
          <rect x="52" y="72" width="16" height="4" rx="2" fill={C.institutionalTeal} opacity={0.7} />
        </svg>
      ) : null}
      {direction === "protocol-entity" ? (
        <>
          <svg width={size} height={size} viewBox="0 0 120 120" style={{ position: "absolute" }}>
            <circle cx="60" cy="58" r="42" fill="#101820" stroke="#334155" strokeWidth="2" />
            <circle cx="47" cy="52" r="8" fill="#F1F5F9" />
            <circle cx="73" cy="52" r="8" fill="#F1F5F9" />
            <path d="M28 78 L38 68 M92 78 L82 68" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div style={{ position: "absolute", opacity: 0.85, pointerEvents: "none" }}>
            <AbraxasExplorationMark direction="living-protocol" level="permanent" size={size * 0.36} variant="dark" />
          </div>
        </>
      ) : null}
      {direction === "living-intelligence" ? (
        <svg width={size} height={size} viewBox="0 0 120 120">
          <defs>
            <radialGradient id="op-core" cx="45%" cy="40%" r="55%">
              <stop offset="0%" stopColor={C.livingLime} stopOpacity={0.5} />
              <stop offset="50%" stopColor={C.livingViolet} stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0B1218" stopOpacity={0.9} />
            </radialGradient>
          </defs>
          <circle cx="60" cy="60" r="44" fill="url(#op-core)" stroke="#1E293B" strokeWidth="2" />
          <circle cx="60" cy="60" r="36" fill="#0B1218" opacity={0.55} />
          <circle cx="48" cy="54" r="7" fill="#F8FAFC" />
          <circle cx="72" cy="54" r="7" fill="#F8FAFC" />
        </svg>
      ) : null}
    </div>
  );
}
