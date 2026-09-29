"use client";
// FILE: components/product/PilotCriteriaList.tsx

import { ABX_FONT_SANS, ABX_FONT_MONO } from "@/lib/design/abraxasDesignSystem";
import { AbxStatusBadge } from "@/components/design/AbxPrimitives";
import type { AbxStatusTone } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;
const MONO = ABX_FONT_MONO;

const CRITERION_LABELS: Record<string, string> = {
  integration_completed: "Integration completed",
  first_successful_verification: "First successful verification",
  minimum_successful_verifications: "Minimum successful verifications",
  verification_success_rate: "Verification success rate",
  evidence_reuse_observed: "Evidence reuse observed",
  production_activation: "Production activated",
  policy_supported: "Policy supported",
  privacy_requirement_satisfied: "Privacy requirement satisfied",
  custom_operator_confirmed: "Operator confirmed",
};

const STATUS_TONE: Record<string, AbxStatusTone> = {
  met: "success",
  pending: "neutral",
  not_met: "error",
  unavailable: "warning",
};

export interface PilotCriterionRow {
  criterion_type: string;
  status: string;
  measured_value?: unknown;
  quality?: string;
  target?: Record<string, unknown>;
}

export function PilotCriteriaList({ criteria }: { criteria: PilotCriterionRow[] }) {
  if (criteria.length === 0) {
    return (
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", margin: 0 }}>
        No pilot success criteria configured yet.
      </p>
    );
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.55rem" }}>
      {criteria.map((c) => (
        <li
          key={c.criterion_type}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "0.5rem",
            alignItems: "start",
            padding: "0.55rem 0.65rem",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface-inset)",
          }}
        >
          <div>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, margin: "0 0 0.2rem", color: "var(--text-primary)" }}>
              {CRITERION_LABELS[c.criterion_type] ?? c.criterion_type.replace(/_/g, " ")}
            </p>
            {c.measured_value != null && c.measured_value !== "" && (
              <p style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-secondary)", margin: 0 }}>
                Measured: {formatMeasured(c.measured_value)}
              </p>
            )}
            {c.quality && (
              <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>
                Quality: {c.quality.replace(/_/g, " ")}
              </p>
            )}
          </div>
          <AbxStatusBadge label={c.status.replace(/_/g, " ")} tone={STATUS_TONE[c.status] ?? "neutral"} />
        </li>
      ))}
    </ul>
  );
}

function formatMeasured(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  return String(value);
}
