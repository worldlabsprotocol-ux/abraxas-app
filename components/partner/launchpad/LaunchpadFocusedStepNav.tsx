"use client";

import type { MerchantJourneyStage, MerchantJourneyStageId } from "@/lib/partner/launchpad/journeyState";

const STEPS: MerchantJourneyStageId[] = ["verify", "test_app", "connect", "test", "go_live"];

const STEP_LABELS: Record<MerchantJourneyStageId, string> = {
  verify: "Verify",
  test_app: "Application",
  connect: "Connect",
  test: "Verify flow",
  go_live: "Complete",
};

export function LaunchpadFocusedStepNav({
  activeStep,
  stages,
  onNavigate,
}: {
  activeStep: MerchantJourneyStageId;
  stages?: MerchantJourneyStage[];
  onNavigate: (step: MerchantJourneyStageId) => void;
}) {
  const stageById = new Map(stages?.map((s) => [s.id, s]) ?? []);

  return (
    <nav className="abx-studio-workspace__nav abx-launchpad-focused__nav" aria-label="Launchpad integration steps">
      {STEPS.map((stepId, index) => {
        const meta = stageById.get(stepId);
        const active = activeStep === stepId;
        const complete = meta?.status === "complete";
        const blocked = meta?.status === "blocked";
        const disabled = meta ? !meta.navigable && !active : false;
        const className = [
          "abx-studio-workspace__nav-item",
          active ? "abx-studio-workspace__nav-item--active" : "",
          complete && !active ? "abx-launchpad-focused__nav-item--complete" : "",
          blocked ? "abx-launchpad-focused__nav-item--blocked" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={stepId}
            type="button"
            className={className}
            aria-current={active ? "step" : undefined}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            title={meta?.detail}
            onClick={() => onNavigate(stepId)}
          >
            <span className="sr-only">Step {index + 1}: </span>
            {complete && !active ? (
              <span className="abx-launchpad-focused__nav-check" aria-hidden="true">
                ✓{" "}
              </span>
            ) : null}
            {STEP_LABELS[stepId]}
          </button>
        );
      })}
    </nav>
  );
}
