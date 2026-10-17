"use client";
// FILE: components/developers/InstitutionalTaskOnboardingPanel.tsx

import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type {
  InstitutionalTaskOnboardingView,
  InstitutionalTaskStep,
} from "@/lib/partner/launchpad/institutionalTaskOnboarding";

const FONT = ABRAXAS_FONT_SANS;

function statusColor(status: InstitutionalTaskStep["status"]): string {
  if (status === "complete") return "#10B981";
  if (status === "blocked") return "#F87171";
  if (status === "current") return "var(--accent)";
  return "var(--text-muted)";
}

export function InstitutionalTaskOnboardingPanel(input: {
  onboarding: InstitutionalTaskOnboardingView;
  compact?: boolean;
}) {
  const { onboarding, compact = false } = input;
  const current = onboarding.steps.find((s) => s.id === onboarding.current_step_id);

  return (
    <ContentCard title={onboarding.connect_your_application_heading}>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.78rem",
          color: "var(--text-secondary)",
          margin: "0 0 0.85rem",
          lineHeight: 1.55,
        }}
      >
        Guided path for institutional protocol verification and signed decision receipts. Advanced controls remain available without leaving this sequence.
      </p>

      {current && !compact && (
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
            Next action · Step {current.order}
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
          {current.action_href && current.action_label && (
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
          gap: compact ? "0.45rem" : "0.55rem",
        }}
        aria-label="Institutional integration steps"
      >
        {onboarding.steps.map((step) => {
          const active = step.id === onboarding.current_step_id;
          return (
            <li
              key={step.id}
              style={{
                display: "grid",
                gridTemplateColumns: compact ? "1fr" : "auto 1fr auto",
                gap: "0.5rem",
                alignItems: compact ? "stretch" : "center",
                padding: "0.65rem 0.75rem",
                borderRadius: 10,
                border: active ? "1px solid rgba(45,212,191,0.45)" : "1px solid var(--border)",
                background: active ? "rgba(45,212,191,0.04)" : "var(--surface)",
              }}
              aria-current={active ? "step" : undefined}
            >
              <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: statusColor(step.status), minWidth: 88 }}>
                {step.status.replace("_", " ")}
              </span>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
                  Step {step.order}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {step.title}
                </div>
                {!compact && (
                  <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0.25rem 0 0", lineHeight: 1.5 }}>
                    {step.detail}
                  </p>
                )}
              </div>
              {step.action_href && step.action_label && (
                <Link
                  href={step.action_href}
                  style={{
                    fontFamily: FONT,
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    color: "var(--accent)",
                    textDecoration: "none",
                    alignSelf: compact ? "flex-start" : "center",
                  }}
                >
                  {step.action_label} →
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </ContentCard>
  );
}
