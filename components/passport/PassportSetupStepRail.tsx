"use client";
// FILE: components/passport/PassportSetupStepRail.tsx
// Compact setup progress — customer language, hidden when redundant with setup panel.

import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";
import { PASSPORT_SETUP_STEPS } from "@/lib/passport/passportCustomerCopy";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const ACCENT = "var(--accent)";

function stepDone(setup: PassportSetupState, stepId: number): boolean {
  if (stepId === 1) return setup.accountComplete;
  if (stepId === 2) return setup.walletBound;
  if (stepId === 3) return setup.identityComplete;
  return setup.profileComplete && setup.identityComplete;
}

function stepCurrent(setup: PassportSetupState, stepId: number): boolean {
  if (stepId === 1) return setup.step === 1;
  if (stepId === 2) return setup.step === 2;
  if (stepId === 3) return setup.step === 3 && !setup.identityComplete;
  return setup.identityComplete && setup.nextAction === "ready";
}

export function PassportSetupStepRail({
  setup,
  compact = false,
}: {
  setup: PassportSetupState;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <p
        role="status"
        style={{
          fontFamily: FONT,
          fontSize: "0.84rem",
          color: "var(--text-secondary)",
          margin: "0 0 1rem",
          padding: "0.75rem 1rem",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <strong style={{ color: "var(--text-primary)" }}>Next:</strong> {setup.nextActionLabel}
      </p>
    );
  }

  return (
    <nav aria-label="Passport setup progress" style={{ marginBottom: "1.25rem" }}>
      <ol style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        gap: "0.5rem",
        flexWrap: "wrap",
      }}>
        {PASSPORT_SETUP_STEPS.map((step, index) => {
          const id = index + 1;
          const done = stepDone(setup, id);
          const current = stepCurrent(setup, id);
          return (
            <li
              key={step.key}
              aria-current={current ? "step" : undefined}
              style={{
                flex: "1 1 140px",
                minWidth: 120,
                padding: "0.75rem 0.85rem",
                borderRadius: 12,
                border: `1px solid ${current ? "rgba(232,197,71,0.35)" : "var(--border)"}`,
                background: done ? "rgba(232,197,71,0.08)" : "var(--surface)",
              }}
            >
              <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {step.label}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                {done ? "Complete" : step.sub}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
