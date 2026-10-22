"use client";

import {
  HOLDER_PRESENTATION_STAGE_LABELS,
  HOLDER_PRESENTATION_STAGE_ORDER,
  holderPresentationStageStatus,
  type HolderPresentationStageId,
} from "@/lib/partner/holderExperience/holderPresentationStage";

export function HolderVerificationStepNav({
  activeStage,
  reviewComplete = true,
}: {
  activeStage: HolderPresentationStageId;
  /** When false, Review stays pending until the user reaches wallet. */
  reviewComplete?: boolean;
}) {
  return (
    <nav
      className="abx-studio-workspace__nav abx-holder-verification__nav"
      aria-label="Holder verification steps"
    >
      {HOLDER_PRESENTATION_STAGE_ORDER.map((stageId) => {
        const status = holderPresentationStageStatus(stageId, activeStage);
        const complete = stageId === "review" ? reviewComplete && status !== "current" : status === "complete";
        const active = status === "current";
        const className = [
          "abx-studio-workspace__nav-item",
          active ? "abx-studio-workspace__nav-item--active" : "",
          complete && !active ? "abx-launchpad-focused__nav-item--complete" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <span
            key={stageId}
            className={className}
            aria-current={active ? "step" : undefined}
            style={{ cursor: "default" }}
          >
            {complete && !active ? (
              <span className="abx-launchpad-focused__nav-check" aria-hidden="true">
                ✓{" "}
              </span>
            ) : null}
            {HOLDER_PRESENTATION_STAGE_LABELS[stageId]}
          </span>
        );
      })}
    </nav>
  );
}
