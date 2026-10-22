"use client";

import { Btn } from "@/components/redesign/ui";
import type { MerchantJourneyStageId } from "@/lib/partner/launchpad/journeyState";

const STEP_ORDER: MerchantJourneyStageId[] = ["verify", "test_app", "connect", "test", "go_live"];

const STEP_LABELS: Record<MerchantJourneyStageId, string> = {
  verify: "Verify",
  test_app: "Application",
  connect: "Connect",
  test: "Verify flow",
  go_live: "Complete",
};

export function LaunchpadStageFooter({
  activeStep,
  onBack,
  onContinue,
  continueLabel,
  continueDisabled,
  showContinue = true,
}: {
  activeStep: MerchantJourneyStageId;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  showContinue?: boolean;
}) {
  const index = STEP_ORDER.indexOf(activeStep);
  const prev = index > 0 ? STEP_ORDER[index - 1] : null;
  const next = index >= 0 && index < STEP_ORDER.length - 1 ? STEP_ORDER[index + 1] : null;

  return (
    <nav className="abx-studio-stage-footer abx-launchpad-focused__footer" aria-label="Stage navigation">
      {prev && onBack ? (
        <button type="button" className="abx-launchpad-focused__footer-link" onClick={onBack}>
          ← Back
        </button>
      ) : (
        <span />
      )}
      {showContinue && onContinue ? (
        <Btn size="sm" onClick={onContinue} disabled={continueDisabled}>
          {continueLabel ?? (next ? `Continue →` : "Done")}
        </Btn>
      ) : next ? (
        <span className="abx-launchpad-focused__footer-hint">Next: {STEP_LABELS[next]}</span>
      ) : null}
    </nav>
  );
}
