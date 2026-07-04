"use client";
// FILE: components/passport/VerifyStepRail.tsx
// 4-step onboarding rail aligned with walkthrough + optional stamp extensions.

import { PASSPORT_FLOW_STEPS } from "@/lib/passportCompletion";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";

const EXT_STEPS = [
  { id: "business", label: "Business", sub: "If applicable" },
  { id: "asset_owner", label: "Asset owner", sub: "Title review" },
] as const;

export function VerifyStepRail({
  walletDone,
  active,
  earned,
  enhancedTrust,
  verifyState,
  currentFlowStep,
  onStepClick,
}: {
  walletDone: boolean;
  active: string | null;
  earned: Record<string, "earned" | "in_progress" | "not_started">;
  enhancedTrust?: boolean;
  verifyState?: "idle" | "checking" | "valid" | "invalid";
  currentFlowStep?: 1 | 2 | 3 | 4;
  onStepClick?: (step: 1 | 2 | 3 | 4) => void;
}) {
  return (
    <nav aria-label="Verification progress" style={{ marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
        {PASSPORT_FLOW_STEPS.map(step => {
          const done =
            step.id === 1 ? walletDone
            : step.id === 2 ? enhancedTrust || earned.identity === "earned"
            : step.id === 3 ? enhancedTrust
            : verifyState === "valid";
          const current = currentFlowStep === step.id;
          const inProgress = step.id === 2 && earned.identity === "in_progress";
          const col = done ? ACCENT : inProgress ? AMBER : current ? ACCENT : "var(--text-muted)";

          const content = (
            <>
              <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: col, fontWeight: 700, marginBottom: "0.2rem" }}>
                {step.id}. {done ? "DONE" : inProgress ? "IN REVIEW" : current ? "NOW" : step.id === 2 ? "OPTIONAL" : "NEXT"}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {step.label}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)" }}>{step.sub}</div>
            </>
          );

          const boxStyle = {
            flex: "1 1 120px" as const,
            minWidth: 100,
            padding: "0.65rem 0.75rem",
            borderRadius: 10,
            border: `1px solid ${current ? `${ACCENT}55` : "var(--border)"}`,
            background: done ? `${ACCENT}10` : "var(--surface)",
            minHeight: 44,
            textAlign: "left" as const,
          };

          if (onStepClick) {
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => onStepClick(step.id)}
                aria-current={current ? "step" : undefined}
                className="abx-interactive"
                style={{ ...boxStyle, cursor: "pointer" }}
              >
                {content}
              </button>
            );
          }

          return (
            <div key={step.key} style={boxStyle} aria-current={current ? "step" : undefined}>
              {content}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", opacity: walletDone ? 1 : 0.55 }}>
        {EXT_STEPS.map(step => {
          const status = earned[step.id];
          const done = status === "earned";
          const inProgress = status === "in_progress";
          return (
            <div key={step.id} style={{
              flex: "1 1 100px", minWidth: 90,
              padding: "0.5rem 0.65rem", borderRadius: 8,
              border: "1px dashed var(--border)", background: "var(--surface)",
              minHeight: 40,
            }}>
              <div style={{ fontFamily: MONO, fontSize: "0.45rem", color: done ? ACCENT : inProgress ? AMBER : "var(--text-muted)", fontWeight: 700 }}>
                {done ? "EARNED" : inProgress ? "REVIEW" : "OPTIONAL"}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                {step.label}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.58rem", color: "var(--text-muted)" }}>{step.sub}</div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
