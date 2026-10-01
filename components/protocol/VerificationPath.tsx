"use client";
// FILE: components/protocol/VerificationPath.tsx
// Holder verification progression — REQUEST → CONSENT → VERIFY → READY.

import { ABX_FONT_MONO, ABX_FONT_SANS, ABX_STATUS_COLORS } from "@/lib/design/abraxasDesignSystem";

export type VerificationPathStep = "request" | "consent" | "verify" | "ready";

const DEFAULT_STEPS: ReadonlyArray<{ id: VerificationPathStep; label: string; hint: string }> = [
  { id: "request", label: "Request", hint: "Who is asking and why" },
  { id: "consent", label: "Consent", hint: "What crosses the boundary" },
  { id: "verify", label: "Verify", hint: "Establish or reuse evidence" },
  { id: "ready", label: "Ready", hint: "Signed answer prepared" },
];

export const GOOD_TROUBLE_PURCHASE_PATH_STEPS: ReadonlyArray<{ id: VerificationPathStep; label: string; hint: string }> = [
  { id: "request", label: "Request", hint: "What Good Trouble needs" },
  { id: "verify", label: "Verify age", hint: "Private age check" },
  { id: "consent", label: "Share result", hint: "Approve the 21+ answer" },
  { id: "ready", label: "Done", hint: "Return to Good Trouble" },
];

function stepIndexIn(
  steps: ReadonlyArray<{ id: VerificationPathStep; label: string; hint: string }>,
  step: VerificationPathStep,
): number {
  return steps.findIndex((s) => s.id === step);
}

export function VerificationPath({
  active,
  completedThrough,
  compact = false,
  steps = DEFAULT_STEPS,
}: {
  active: VerificationPathStep;
  /** Steps strictly before this are marked complete */
  completedThrough?: VerificationPathStep | null;
  compact?: boolean;
  steps?: ReadonlyArray<{ id: VerificationPathStep; label: string; hint: string }>;
}) {
  const activeIdx = stepIndexIn(steps, active);
  const completedIdx = completedThrough ? stepIndexIn(steps, completedThrough) : activeIdx - 1;

  return (
    <nav
      className={`abx-verification-path ${compact ? "abx-verification-path--compact" : ""}`}
      aria-label="Verification progress"
    >
      <ol className="abx-verification-path__list">
        {steps.map((step, index) => {
          const done = index <= completedIdx;
          const current = index === activeIdx;
          const pending = index > activeIdx && !done;
          const tone = done ? "success" : current ? "pending" : "neutral";
          const colors = ABX_STATUS_COLORS[tone];

          return (
            <li
              key={step.id}
              className={`abx-verification-path__step ${current ? "abx-verification-path__step--current" : ""} ${done ? "abx-verification-path__step--done" : ""}`}
              aria-current={current ? "step" : undefined}
            >
              <div
                className="abx-verification-path__node"
                style={{
                  borderColor: current || done ? colors.border : "var(--border)",
                  background: current || done ? colors.faint : "var(--surface)",
                  boxShadow: current ? `0 0 0 1px ${colors.border}` : undefined,
                }}
              >
                <span
                  className="abx-verification-path__index"
                  style={{ fontFamily: ABX_FONT_MONO, color: colors.color }}
                >
                  {done ? "✓" : String(index + 1).padStart(2, "0")}
                </span>
                <span className="abx-verification-path__label" style={{ fontFamily: ABX_FONT_SANS }}>
                  {step.label}
                </span>
                {!compact ? (
                  <span className="abx-verification-path__hint" style={{ fontFamily: ABX_FONT_SANS }}>
                    {step.hint}
                  </span>
                ) : null}
              </div>
              {index < steps.length - 1 ? (
                <div
                  className={`abx-verification-path__connector ${done ? "abx-verification-path__connector--done" : ""}`}
                  aria-hidden
                />
              ) : null}
              {pending ? (
                <span className="sr-only">Upcoming</span>
              ) : done && !current ? (
                <span className="sr-only">Completed</span>
              ) : current ? (
                <span className="sr-only">Current step</span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function resolveVerificationPathStep(input: {
  showConsent: boolean;
  verifying: boolean;
  ready: boolean;
}): VerificationPathStep {
  if (input.ready) return "ready";
  if (input.showConsent) return "consent";
  if (input.verifying) return "verify";
  return "request";
}
