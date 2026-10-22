"use client";

import {
  HOLDER_PUBLIC_STEP_LABELS,
  HOLDER_PUBLIC_STEP_ORDER,
  holderPublicStepStatus,
  mapInternalStageToPublicStep,
  type HolderPresentationStageId,
} from "@/lib/partner/holderExperience/holderPresentationStage";

export function HolderVerificationStepNav({
  activeStage,
}: {
  activeStage: HolderPresentationStageId;
}) {
  const activePublic = mapInternalStageToPublicStep(activeStage);

  return (
    <nav
      className="abx-studio-workspace__nav abx-holder-verification__nav"
      aria-label="Verification progress"
    >
      {HOLDER_PUBLIC_STEP_ORDER.map((stepId) => {
        const status = holderPublicStepStatus(stepId, activePublic);
        const complete = status === "complete";
        const active = status === "current";
        const className = [
          "abx-studio-workspace__nav-item",
          active ? "abx-studio-workspace__nav-item--active" : "",
          complete ? "abx-launchpad-focused__nav-item--complete" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <span
            key={stepId}
            className={className}
            aria-current={active ? "step" : undefined}
          >
            {complete && !active ? (
              <span className="abx-launchpad-focused__nav-check" aria-hidden="true">
                ✓{" "}
              </span>
            ) : null}
            {HOLDER_PUBLIC_STEP_LABELS[stepId]}
          </span>
        );
      })}
    </nav>
  );
}
