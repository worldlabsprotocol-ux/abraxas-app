"use client";

import type { MerchantJourneyStageId } from "@/lib/partner/launchpad/journeyState";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const STEP_HEADINGS: Record<MerchantJourneyStageId, string> = {
  verify: "What do you need to verify?",
  test_app: "Configure your sandbox application",
  connect: "Connect your application",
  test: "Run a holder verification",
  go_live: "Prepare for production review",
};

const STEP_ORDER: MerchantJourneyStageId[] = ["verify", "test_app", "connect", "test", "go_live"];

export function LaunchpadStageGuide({
  activeStep,
  statusLine,
  environmentLabel,
}: {
  activeStep: MerchantJourneyStageId;
  statusLine?: string;
  environmentLabel?: string;
}) {
  const index = STEP_ORDER.indexOf(activeStep);
  const stepNumber = index >= 0 ? index + 1 : 1;

  return (
    <header className="abx-launchpad-focused__guide">
      <div className="abx-launchpad-focused__guide-meta">
        <p className="abx-launchpad-focused__guide-eyebrow">
          Step {stepNumber} of {STEP_ORDER.length}
          {environmentLabel ? (
            <>
              {" · "}
              <span className="abx-launchpad-focused__guide-env">{environmentLabel}</span>
            </>
          ) : null}
        </p>
        <h2 className="abx-launchpad-focused__guide-title">{STEP_HEADINGS[activeStep]}</h2>
        {statusLine ? (
          <p className="abx-launchpad-focused__guide-status">{statusLine}</p>
        ) : null}
      </div>
    </header>
  );
}

export function launchpadStageGuideStyles(): { font: string; mono: string } {
  return { font: FONT, mono: MONO };
}
