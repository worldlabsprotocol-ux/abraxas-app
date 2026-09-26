"use client";
// FILE: components/passport/PassportRecentActivity.tsx
// Plain-language Passport setup progress for holders.

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PUBLIC_SURFACE } from "@/lib/design/publicSurface";
import type { IdentityUiState } from "@/lib/passport/identityUiState";

const FONT = ABRAXAS_FONT_SANS;

type SetupStep = {
  label: string;
  complete: boolean;
  status: string;
};

export function PassportRecentActivity({
  suiAddress,
  walletBound,
  identityUi,
}: {
  suiAddress: string | null;
  walletBound: boolean;
  identityUi: IdentityUiState;
}) {
  const identityComplete = identityUi === "verified";
  const identityPending = identityUi === "pending";
  const steps: SetupStep[] = [
    {
      label: "Create your Passport",
      complete: Boolean(suiAddress),
      status: suiAddress ? "Done" : "Start here",
    },
    {
      label: "Secure your account",
      complete: walletBound,
      status: walletBound ? "Done" : suiAddress ? "Next" : "Waiting",
    },
    {
      label: "Add verified information",
      complete: identityComplete,
      status: identityComplete ? "Ready to reuse" : identityPending ? "In review" : walletBound ? "Next" : "Waiting",
    },
  ];

  return (
    <section
      aria-labelledby="passport-setup-activity-heading"
      style={{
        background: PUBLIC_SURFACE.cardBackground,
        border: PUBLIC_SURFACE.cardBorder,
        borderRadius: PUBLIC_SURFACE.cardRadius,
        padding: PUBLIC_SURFACE.cardPadding,
        marginBottom: "1rem",
      }}
    >
      <p style={{
        fontFamily: FONT,
        fontSize: "0.72rem",
        fontWeight: 700,
        color: "var(--text-muted)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        margin: "0 0 0.35rem",
      }}>
        Three steps
      </p>
      <h2 id="passport-setup-activity-heading" style={{
        fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.35rem",
      }}>
        Set up your Passport
      </h2>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.8rem",
        color: "var(--text-secondary)",
        lineHeight: 1.55,
        margin: "0 0 0.8rem",
      }}>
        Complete these once, then reuse verified results without sharing your private documents.
      </p>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.5rem" }}>
        {steps.map((step, index) => (
          <li
            key={step.label}
            style={{
              display: "grid",
              gridTemplateColumns: "1.75rem minmax(0, 1fr) auto",
              gap: "0.6rem",
              alignItems: "center",
              padding: "0.55rem 0.6rem",
              borderRadius: 10,
              border: step.complete ? "1px solid rgba(94,234,212,0.22)" : "1px solid rgba(255,255,255,0.08)",
              background: step.complete ? "rgba(94,234,212,0.06)" : "rgba(8,10,18,0.35)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "1.6rem",
                height: "1.6rem",
                borderRadius: "999px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT,
                fontSize: "0.75rem",
                fontWeight: 800,
                color: step.complete ? "#07110f" : "var(--text-secondary)",
                background: step.complete ? "#5EEAD4" : "rgba(255,255,255,0.08)",
              }}
            >
              {step.complete ? "✓" : index + 1}
            </span>
            <span style={{
              fontFamily: FONT,
              fontSize: "0.82rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}>
              {step.label}
            </span>
            <span style={{
              fontFamily: FONT,
              fontSize: "0.72rem",
              fontWeight: 700,
              color: step.complete ? "#5EEAD4" : step.status === "Next" ? "#FBBF24" : "var(--text-muted)",
              whiteSpace: "nowrap",
            }}>
              {step.status}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
