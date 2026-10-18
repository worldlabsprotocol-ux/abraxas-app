// FILE: lib/partner/launchpad/sovereign/healthContext.ts
import "server-only";

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { harnessPassedFromActivity } from "@/lib/partner/launchpad/partnerTestHarness";
import type { PartnerHarnessScenarioId } from "@/lib/partner/launchpad/partnerTestHarness";
import {
  pgGetApiKeyRevoked,
  pgListLaunchpadActivity,
} from "@/lib/partner/launchpad/sovereign/launchpadPgStore";

export async function loadSovereignLaunchpadHealthContext(
  app: LaunchpadApplicationRow,
  partnerId: string,
): Promise<{
  activeSandboxKey: boolean;
  activeProductionKey: boolean;
  verifiedHostnames: string[];
  harnessCompleted: PartnerHarnessScenarioId[];
  verifiedReceiptCount: number;
  activityRows: Array<{ event_type: string; public_code: string | null; metadata?: Record<string, unknown> }>;
}> {
  let activeSandboxKey = false;
  if (app.api_key_id) {
    const revoked = await pgGetApiKeyRevoked(app.api_key_id);
    activeSandboxKey = !revoked;
  }
  const activityRows = await pgListLaunchpadActivity(app.id, partnerId, 200);
  const harness = harnessPassedFromActivity(
    activityRows.map((row) => ({
      event_type: row.event_type,
      public_code: row.public_code,
      metadata: row.metadata,
    })),
  );
  const verifiedReceiptCount = activityRows.filter((row) => row.event_type === "receipt_verified").length;
  return {
    activeSandboxKey,
    activeProductionKey: false,
    verifiedHostnames: app.allowed_return_urls
      .map((url) => {
        try {
          return new URL(url).hostname;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as string[],
    harnessCompleted: harness.completed,
    verifiedReceiptCount,
    activityRows,
  };
}
