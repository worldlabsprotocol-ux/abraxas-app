"use client";
// FILE: components/partner/launchpad/PartnerLaunchpadMerchantJourney.tsx

import type { MerchantJourneyStage } from "@/lib/partner/launchpad/journeyState";
import { ABX_FONT_SANS, ABX_FONT_MONO } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;
const MONO = ABX_FONT_MONO;

export function PartnerLaunchpadMerchantJourney({
  stages,
  completedCount,
  totalStages,
  compact = false,
}: {
  stages: MerchantJourneyStage[];
  completedCount: number;
  totalStages: number;
  compact?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: compact ? "0.55rem" : "0.85rem",
          flexWrap: "wrap",
        }}
      >
        <p style={{ fontFamily: FONT, fontSize: compact ? "0.72rem" : "0.78rem", fontWeight: 800, margin: 0 }}>
          Progress
        </p>
        <p style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0 }}>
          {completedCount} of {totalStages} steps complete
        </p>
      </div>
      <div
        role="list"
        aria-label="Merchant integration journey"
        style={{
          display: "grid",
          gap: compact ? "0.35rem" : "0.5rem",
          gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(140px, 1fr))",
        }}
      >
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            role="listitem"
            style={{
              borderRadius: 12,
              border: `1px solid ${borderColor(stage.status)}`,
              background: backgroundColor(stage.status),
              padding: compact ? "0.55rem 0.65rem" : "0.7rem 0.75rem",
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: stage.detail ? "0.25rem" : 0 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: MONO,
                  fontSize: "0.58rem",
                  fontWeight: 800,
                  color: markerColor(stage.status),
                  border: `1px solid ${borderColor(stage.status)}`,
                  background: "rgba(255,255,255,0.03)",
                  flexShrink: 0,
                }}
              >
                {stage.status === "complete" ? "✓" : index + 1}
              </span>
              <p style={{ fontFamily: FONT, fontSize: compact ? "0.72rem" : "0.76rem", fontWeight: 700, margin: 0, color: textColor(stage.status) }}>
                {stage.label}
              </p>
            </div>
            {stage.detail && (
              <p style={{ fontFamily: FONT, fontSize: "0.64rem", color: "var(--text-muted)", margin: "0.15rem 0 0 1.65rem", lineHeight: 1.45 }}>
                {stage.detail}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function borderColor(status: MerchantJourneyStage["status"]): string {
  if (status === "complete") return "rgba(16,185,129,0.35)";
  if (status === "current") return "rgba(96,165,250,0.45)";
  if (status === "blocked") return "rgba(239,68,68,0.35)";
  return "var(--border)";
}

function backgroundColor(status: MerchantJourneyStage["status"]): string {
  if (status === "complete") return "rgba(16,185,129,0.08)";
  if (status === "current") return "rgba(96,165,250,0.08)";
  if (status === "blocked") return "rgba(239,68,68,0.06)";
  return "var(--surface-inset)";
}

function markerColor(status: MerchantJourneyStage["status"]): string {
  if (status === "complete") return "#10B981";
  if (status === "current") return "#60A5FA";
  if (status === "blocked") return "#EF4444";
  return "var(--text-muted)";
}

function textColor(status: MerchantJourneyStage["status"]): string {
  if (status === "current") return "#60A5FA";
  if (status === "blocked") return "#EF4444";
  return "var(--text-primary)";
}
