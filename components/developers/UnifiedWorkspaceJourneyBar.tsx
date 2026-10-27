"use client";

import {
  GUIDED_INTEGRATION_JOURNEY,
  guidedJourneyProgressLabel,
  type GuidedIntegrationJourneyStepId,
} from "@/lib/developers/guidedIntegrationJourney";
import styles from "@/components/account/EphemeralDeveloperWorkspace.module.css";

export function UnifiedWorkspaceJourneyBar({
  currentStepId,
}: {
  currentStepId: GuidedIntegrationJourneyStepId;
}) {
  const index = GUIDED_INTEGRATION_JOURNEY.findIndex((s) => s.id === currentStepId);
  const step = GUIDED_INTEGRATION_JOURNEY[Math.max(0, index)] ?? GUIDED_INTEGRATION_JOURNEY[0];
  return (
    <div className={styles.panel} role="status">
      <p className={styles.journeyKicker}>
        Your Abraxas workspace · Sandbox · {guidedJourneyProgressLabel(step.step)}
      </p>
      <h2 className={styles.sectionTitle}>{step.title}</h2>
      <p className={styles.muted}>{step.outcome}</p>
    </div>
  );
}
