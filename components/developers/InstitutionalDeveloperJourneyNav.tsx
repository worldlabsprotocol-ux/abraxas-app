"use client";
// FILE: components/developers/InstitutionalDeveloperJourneyNav.tsx

import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS,
  INSTITUTIONAL_DEVELOPER_JOURNEY_VERSION,
  INSTITUTIONAL_JOURNEY_SCOPE_NOTICE,
} from "@/lib/partner/launchpad/institutionalDeveloperJourney";

const FONT = ABRAXAS_FONT_SANS;

export function InstitutionalDeveloperJourneyNav(input: {
  title?: string;
  currentStepId?: string;
  compact?: boolean;
}) {
  const { title = "Institutional developer journey", currentStepId, compact = false } = input;

  return (
    <ContentCard title={title}>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.78rem",
          color: "var(--text-muted)",
          margin: "0 0 0.75rem",
          lineHeight: 1.55,
        }}
      >
        {INSTITUTIONAL_JOURNEY_SCOPE_NOTICE}
      </p>
      <ol
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "grid",
          gap: compact ? "0.55rem" : "0.75rem",
          gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
        }}
      >
        {INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS.map((step) => {
          const active = currentStepId === step.id;
          return (
            <li
              key={step.id}
              style={{
                padding: "0.75rem 0.85rem",
                borderRadius: 12,
                border: active ? "1px solid rgba(45,212,191,0.45)" : "1px solid var(--border)",
                background: active ? "rgba(45,212,191,0.06)" : "var(--surface)",
              }}
            >
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: "var(--text-muted)" }}>
                Step {step.order}
              </div>
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: "0.84rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginTop: "0.25rem",
                  lineHeight: 1.35,
                }}
              >
                {step.title}
              </div>
              {!compact && (
                <p
                  style={{
                    fontFamily: FONT,
                    fontSize: "0.76rem",
                    color: "var(--text-secondary)",
                    margin: "0.4rem 0 0.55rem",
                    lineHeight: 1.5,
                  }}
                >
                  {step.detail}
                </p>
              )}
              <Link
                href={step.href}
                style={{
                  fontFamily: FONT,
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  color: "var(--accent)",
                  textDecoration: "none",
                }}
              >
                {step.action_label} →
              </Link>
            </li>
          );
        })}
      </ol>
    </ContentCard>
  );
}
