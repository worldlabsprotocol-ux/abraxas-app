"use client";
// FILE: components/passport/PassportRecentActivity.tsx
// Plain-language Passport setup progress and next action for holders.

import Link from "next/link";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PUBLIC_SURFACE } from "@/lib/design/publicSurface";
import { resolvePassportHomeGuide } from "@/lib/passport/passportHomeGuide";
import type { IdentityUiState } from "@/lib/passport/identityUiState";

const FONT = ABRAXAS_FONT_SANS;

type SetupStep = {
  label: string;
  complete: boolean;
  status: string;
  current: boolean;
};

export function PassportRecentActivity({
  suiAddress,
  walletBound,
  identityUi,
  identityRequired,
}: {
  suiAddress: string | null;
  walletBound: boolean;
  identityUi: IdentityUiState;
  identityRequired: boolean;
}) {
  const identityComplete = identityUi === "verified";
  const identityPending = identityUi === "under_review";
  const identityNeedsAction = identityUi === "needs_action";
  const guide = resolvePassportHomeGuide({ walletBound, identityUi, identityRequired });

  const steps: SetupStep[] = [
    {
      label: "Create your Passport",
      complete: Boolean(suiAddress),
      status: suiAddress ? "Done" : "Start here",
      current: !suiAddress,
    },
    {
      label: "Secure your account",
      complete: walletBound,
      status: walletBound ? "Done" : suiAddress ? "Next" : "Waiting",
      current: Boolean(suiAddress) && !walletBound,
    },
    {
      label: "Add verified information",
      complete: identityComplete,
      status: identityComplete
        ? "Ready to reuse"
        : identityPending
          ? "In review"
          : identityRequired
            ? identityNeedsAction ? "Update needed" : "Next"
            : "Optional",
      current: walletBound && identityRequired && !identityComplete && !identityPending,
    },
  ];

  const quickLinks = [
    { href: "/passport?view=activity", label: "Activity", detail: "See where your Passport was used" },
    { href: "/passport?view=privacy", label: "Privacy", detail: "Control your data and requests" },
    { href: "/passport?view=support", label: "Help", detail: "Get support and protect this session" },
  ] as const;

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
        {guide.eyebrow}
      </p>
      <h2 id="passport-setup-activity-heading" style={{
        fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.35rem",
      }}>
        {guide.title}
      </h2>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.8rem",
        color: "var(--text-secondary)",
        lineHeight: 1.55,
        margin: "0 0 0.75rem",
      }}>
        {guide.summary}
      </p>
      <Link
        href={guide.action_href}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 42,
          padding: "0 0.9rem",
          borderRadius: 10,
          background: "#10B981",
          color: "#04130C",
          textDecoration: "none",
          fontFamily: FONT,
          fontSize: "0.78rem",
          fontWeight: 800,
          marginBottom: "1rem",
        }}
      >
        {guide.action_label} →
      </Link>

      <details>
        <summary style={{
          fontFamily: FONT,
          fontSize: "0.76rem",
          fontWeight: 700,
          color: "var(--text-secondary)",
          cursor: "pointer",
          marginBottom: "0.65rem",
        }}>
          See all three setup steps
        </summary>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.5rem" }}>
          {steps.map((step, index) => (
            <li
              key={step.label}
              aria-current={step.current ? "step" : undefined}
              style={{
                display: "grid",
                gridTemplateColumns: "1.75rem minmax(0, 1fr) auto",
                gap: "0.6rem",
                alignItems: "center",
                padding: "0.55rem 0.6rem",
                borderRadius: 10,
                border: step.current
                  ? "1px solid rgba(251,191,36,0.38)"
                  : step.complete
                    ? "1px solid rgba(94,234,212,0.22)"
                    : "1px solid rgba(255,255,255,0.08)",
                background: step.current
                  ? "rgba(251,191,36,0.07)"
                  : step.complete
                    ? "rgba(94,234,212,0.06)"
                    : "rgba(8,10,18,0.35)",
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
                color: step.complete ? "#5EEAD4" : step.current ? "#FBBF24" : "var(--text-muted)",
                whiteSpace: "nowrap",
              }}>
                {step.status}
              </span>
            </li>
          ))}
        </ol>
      </details>

      <div style={{
        borderTop: "1px solid var(--border)",
        marginTop: "1rem",
        paddingTop: "0.85rem",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "0.55rem",
      }}>
        {quickLinks.map(item => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: "0.65rem",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              textDecoration: "none",
            }}
          >
            <span style={{ display: "block", fontFamily: FONT, fontSize: "0.76rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {item.label}
            </span>
            <span style={{ display: "block", fontFamily: FONT, fontSize: "0.66rem", lineHeight: 1.45, color: "var(--text-muted)", marginTop: "0.2rem" }}>
              {item.detail}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}