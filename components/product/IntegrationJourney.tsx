"use client";
// FILE: components/product/IntegrationJourney.tsx
// Integration lifecycle from real state — not a fake wizard.

import { ABX_FONT_SANS, ABX_FONT_MONO } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;
const MONO = ABX_FONT_MONO;

export type JourneyStageId =
  | "choose_policy"
  | "create_sandbox"
  | "integrate"
  | "verify_receipt"
  | "run_pilot"
  | "request_production"
  | "go_live";

export type JourneyStageStatus = "complete" | "current" | "pending" | "blocked";

export interface JourneyStage {
  id: JourneyStageId;
  label: string;
  status: JourneyStageStatus;
  detail?: string;
}

const STAGE_LABELS: Record<JourneyStageId, string> = {
  choose_policy: "Choose policy",
  create_sandbox: "Create sandbox",
  integrate: "Integrate",
  verify_receipt: "Verify receipt",
  run_pilot: "Run pilot",
  request_production: "Request production",
  go_live: "Go live",
};

export function buildDefaultJourneyStages(): JourneyStageId[] {
  return [
    "choose_policy",
    "create_sandbox",
    "integrate",
    "verify_receipt",
    "run_pilot",
    "request_production",
    "go_live",
  ];
}

export function IntegrationJourney({ stages }: { stages: JourneyStage[] }) {
  return (
    <nav aria-label="Integration journey" className="abx-integration-journey">
      <ol
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gap: "0.45rem",
        }}
      >
        {stages.map((stage, index) => (
          <li
            key={stage.id}
            style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr",
              gap: "0.65rem",
              alignItems: "start",
              opacity: stage.status === "pending" ? 0.72 : 1,
            }}
          >
            <StageMarker index={index + 1} status={stage.status} />
            <div>
              <p style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, margin: 0, color: stageColor(stage.status) }}>
                {stage.label || STAGE_LABELS[stage.id]}
              </p>
              {stage.detail && (
                <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.15rem 0 0", lineHeight: 1.45 }}>
                  {stage.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function StageMarker({ index, status }: { index: number; status: JourneyStageStatus }) {
  const colors: Record<JourneyStageStatus, { bg: string; border: string; color: string }> = {
    complete: { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.45)", color: "#10B981" },
    current: { bg: "rgba(96,165,250,0.15)", border: "rgba(96,165,250,0.45)", color: "#60A5FA" },
    pending: { bg: "rgba(255,255,255,0.04)", border: "var(--border)", color: "var(--text-muted)" },
    blocked: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.4)", color: "#EF4444" },
  };
  const c = colors[status];
  return (
    <span
      aria-hidden="true"
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: MONO,
        fontSize: "0.62rem",
        fontWeight: 800,
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
      }}
    >
      {status === "complete" ? "✓" : index}
    </span>
  );
}

function stageColor(status: JourneyStageStatus): string {
  if (status === "complete") return "var(--text-primary)";
  if (status === "current") return "#60A5FA";
  if (status === "blocked") return "#EF4444";
  return "var(--text-secondary)";
}
