"use client";
// FILE: components/passport/PassportSetupStepRail.tsx
// Compact holder onboarding rail derived from PassportSetupState (no new backend state).

import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";

const STEPS = [
  { id: 1 as const, key: "sign_in", label: "Sign in", sub: "Google · zkLogin" },
  { id: 2 as const, key: "bind_wallet", label: "Bind wallet", sub: "Signed control proof" },
  { id: 3 as const, key: "verify_identity", label: "Verify identity", sub: "Only when required" },
  { id: 4 as const, key: "use_credential", label: "Use credential", sub: "Share proofs" },
] as const;

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

function stepInReview(setup: PassportSetupState, stepId: number): boolean {
  return stepId === 3 && setup.nextAction === "wait_review";
}

export function PassportSetupStepRail({ setup }: { setup: PassportSetupState }) {
  return (
    <nav aria-label="Passport setup progress" style={{ marginBottom: "1.25rem" }}>
      <div style={{
        display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.65rem",
      }}>
        {STEPS.map(step => {
          const done = stepDone(setup, step.id);
          const current = stepCurrent(setup, step.id);
          const inReview = stepInReview(setup, step.id);
          const col = done ? ACCENT : inReview ? AMBER : current ? ACCENT : "var(--text-muted)";
          const status = done ? "Done" : inReview ? "In review" : current ? "Now" : step.id === 3 ? "Optional" : "Next";

          return (
            <div
              key={step.key}
              aria-current={current ? "step" : undefined}
              style={{
                flex: "1 1 120px",
                minWidth: 100,
                padding: "0.65rem 0.75rem",
                borderRadius: 10,
                border: `1px solid ${current ? `${ACCENT}55` : "var(--border)"}`,
                background: done ? `${ACCENT}10` : "var(--surface)",
                minHeight: 44,
              }}
            >
              <div style={{
                fontFamily: MONO, fontSize: "0.5rem", color: col,
                fontWeight: 700, marginBottom: "0.2rem", textTransform: "uppercase",
              }}>
                {step.id}. {status}
              </div>
              <div style={{
                fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
                color: "var(--text-primary)",
              }}>
                {step.label}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)" }}>
                {step.sub}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem",
        padding: "0.55rem 0.75rem", borderRadius: 10,
        background: "var(--surface-inset)", border: "1px solid var(--border)",
      }}>
        <span style={{
          fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase", color: ACCENT,
        }}>
          Next
        </span>
        <span style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {setup.nextActionLabel}
        </span>
        <span style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>
          · {setup.stepLabel}
        </span>
      </div>
    </nav>
  );
}
