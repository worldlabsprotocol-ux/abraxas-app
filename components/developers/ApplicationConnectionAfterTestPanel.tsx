"use client";

import type { BuilderHarnessOutcome } from "@/lib/partner/launchpad/formatHarnessResultForBuilder";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import { ApplicationIntegrationJourneyPanel } from "@/components/developers/ApplicationIntegrationJourneyPanel";

const harnessStorageKey = (applicationId: string): string =>
  `abx_studio_harness_success_v1_${applicationId}`;

export function persistHarnessSuccess(applicationId: string, outcome: BuilderHarnessOutcome): void {
  if (typeof window === "undefined" || outcome.tone !== "success") return;
  window.sessionStorage.setItem(
    harnessStorageKey(applicationId),
    JSON.stringify({ outcome, savedAt: new Date().toISOString() }),
  );
}

export function readPersistedHarnessSuccess(applicationId: string): BuilderHarnessOutcome | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(harnessStorageKey(applicationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { outcome?: BuilderHarnessOutcome };
    return parsed.outcome?.tone === "success" ? parsed.outcome : null;
  } catch {
    return null;
  }
}

/** @deprecated Use ApplicationIntegrationJourneyPanel — kept for import stability. */
export function ApplicationConnectionAfterTestPanel(props: {
  applicationId: string;
  signedIn: boolean;
  packId: PolicyPackId;
  pathId: IntegrationStudioPathId;
  policyId: string;
  returnUrl: string;
  outcome: BuilderHarnessOutcome;
}) {
  return <ApplicationIntegrationJourneyPanel {...props} />;
}
