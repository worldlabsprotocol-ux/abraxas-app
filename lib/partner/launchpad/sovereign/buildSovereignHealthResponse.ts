// FILE: lib/partner/launchpad/sovereign/buildSovereignHealthResponse.ts
import "server-only";

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { buildLaunchpadIntegrationHealth } from "@/lib/partner/launchpad/integrationHealth";
import { REQUIRED_HARNESS_SCENARIOS } from "@/lib/partner/launchpad/partnerTestHarness";
import { deriveLiveExecutionSignals } from "@/lib/partner/universalIntegration/liveExecutionSignals";
import { deriveUniversalIntegrationReadiness } from "@/lib/partner/universalIntegration/readinessDiagnostic";
import { loadSovereignLaunchpadHealthContext } from "@/lib/partner/launchpad/sovereign/healthContext";

export async function buildSovereignLaunchpadHealthResponse(
  app: LaunchpadApplicationRow,
  partnerId: string,
) {
  const ctx = await loadSovereignLaunchpadHealthContext(app, partnerId);
  const health = buildLaunchpadIntegrationHealth({
    application: app,
    activeSandboxKey: ctx.activeSandboxKey,
    activeProductionKey: ctx.activeProductionKey,
    verifiedHostnames: ctx.verifiedHostnames,
    harnessCompleted: ctx.harnessCompleted,
    webhookConfigured: false,
    webhookEnabled: false,
    signingSecretAvailable: false,
    policyChangeControl: {
      status: "pass",
      nextAction: "Policy is pinned at provisioning for sovereign sandbox.",
      blockerCode: null,
      pinnedVersion: app.policy_version,
      activeVersion: app.policy_version,
    },
  });
  const harnessPassed = REQUIRED_HARNESS_SCENARIOS.every((id) => ctx.harnessCompleted.includes(id));
  const liveExecution = deriveLiveExecutionSignals({
    harnessPassed,
    verifiedReceiptCount: ctx.verifiedReceiptCount,
    integrationEvents: [],
  });
  const readiness = deriveUniversalIntegrationReadiness({
    application: app,
    activeSandboxKey: ctx.activeSandboxKey,
    activeProductionKey: ctx.activeProductionKey,
    verifiedReceiptCount: ctx.verifiedReceiptCount,
    harnessPassed,
    liveExecution,
    productionAccessRequestStatus: null,
    integrationHealthOverall: health.overall,
  });
  return { ...health, universal_readiness: readiness, sovereign_mode: true };
}
