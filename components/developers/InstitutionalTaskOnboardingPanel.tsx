"use client";
// FILE: components/developers/InstitutionalTaskOnboardingPanel.tsx

import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type {
  InstitutionalTaskOnboardingView,
  InstitutionalTaskStep,
  InstitutionalTaskStepId,
} from "@/lib/partner/launchpad/institutionalTaskOnboarding";

const FONT = ABRAXAS_FONT_SANS;

function statusLabel(status: InstitutionalTaskStep["status"]): string {
  if (status === "complete") return "Done";
  if (status === "current") return "Now";
  if (status === "blocked") return "Blocked";
  return "Next";
}

function statusColor(status: InstitutionalTaskStep["status"]): string {
  if (status === "complete") return "#10B981";
  if (status === "blocked") return "#F87171";
  if (status === "current") return "var(--accent)";
  return "var(--text-muted)";
}

export function InstitutionalTaskOnboardingPanel(input: {
  onboarding: InstitutionalTaskOnboardingView;
  compact?: boolean;
  launchpad?: boolean;
  onStepSelect?: (stepId: InstitutionalTaskStepId) => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string | null;
}) {
  const { onboarding, compact = false, launchpad = false } = input;
  const current = onboarding.steps.find((s) => s.id === onboarding.current_step_id);

  return (
    <ContentCard title={onboarding.connect_your_application_heading}>
      {current && (launchpad || !compact) && (
        <div
          style={{
            marginBottom: "0.85rem",
            padding: "0.75rem 0.85rem",
            borderRadius: 12,
            border: "1px solid rgba(45,212,191,0.35)",
            background: "rgba(45,212,191,0.06)",
          }}
        >
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: "var(--text-muted)", margin: 0 }}>
            Now · Step {current.order}
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", margin: "0.35rem 0" }}>
            {current.title}
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 0.65rem", lineHeight: 1.55 }}>
            {current.detail}
          </p>
          {current.recovery_hint && (
            <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "#F87171", margin: "0 0 0.65rem", lineHeight: 1.5 }} role="status">
              {current.recovery_hint}
            </p>
          )}
          {launchpad && input.onPrimaryAction && (
            <Btn size="sm" onClick={input.onPrimaryAction}>
              {input.primaryActionLabel ?? current.action_label ?? "Continue"}
            </Btn>
          )}
          {!launchpad && current.action_href && current.action_label && (
            <Btn href={current.action_href} size="sm">
              {current.action_label}
            </Btn>
          )}
        </div>
      )}

      <ol
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "grid",
          gap: launchpad ? "0.35rem" : compact ? "0.45rem" : "0.55rem",
        }}
        aria-label="Integration steps"
      >
        {onboarding.steps.map((step) => {
          const active = step.id === onboarding.current_step_id;
          const showRowAction = !launchpad || step.status === "complete";
          return (
            <li
              key={step.id}
              style={{
                display: "grid",
                gridTemplateColumns: launchpad ? "auto 1fr auto" : compact ? "1fr" : "auto 1fr auto",
                gap: "0.5rem",
                alignItems: "center",
                padding: "0.55rem 0.65rem",
                borderRadius: 10,
                border: active ? "1px solid rgba(45,212,191,0.45)" : "1px solid var(--border)",
                background: active ? "rgba(45,212,191,0.04)" : "var(--surface)",
              }}
              aria-current={active ? "step" : undefined}
            >
              <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: statusColor(step.status), minWidth: 56 }}>
                {statusLabel(step.status)}
              </span>
              <button
                type="button"
                onClick={() => input.onStepSelect?.(step.id)}
                style={{
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: input.onStepSelect ? "pointer" : "default",
                  font: "inherit",
                  color: "inherit",
                }}
              >
                <div style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {step.order}. {step.title}
                </div>
                {!compact && !launchpad && (
                  <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0.25rem 0 0", lineHeight: 1.5 }}>
                    {step.detail}
                  </p>
                )}
              </button>
              {showRowAction && step.status === "complete" && input.onStepSelect && (
                <button
                  type="button"
                  onClick={() => input.onStepSelect?.(step.id)}
                  style={{
                    fontFamily: FONT,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "var(--accent)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Review
                </button>
              )}
              {showRowAction && !launchpad && step.action_href && step.action_label && step.status !== "complete" && (
                <Link
                  href={step.action_href}
                  style={{
                    fontFamily: FONT,
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    color: "var(--accent)",
                    textDecoration: "none",
                  }}
                >
                  {step.action_label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </ContentCard>
  );
}
