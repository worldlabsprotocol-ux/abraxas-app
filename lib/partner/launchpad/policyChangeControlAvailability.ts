// FILE: lib/partner/launchpad/policyChangeControlAvailability.ts
// Server-only schema probe for Launchpad Policies dark-launch.

import { probePolicyChangeControlSchema } from "@/lib/policy/changeControl/schemaReady";
import { launchpadUsesSovereignPostgres } from "@/lib/partner/launchpad/launchpadPersistence";

export async function resolvePolicyChangeControlUiAvailability(): Promise<boolean> {
  if (launchpadUsesSovereignPostgres()) {
    return false;
  }
  const probe = await probePolicyChangeControlSchema();
  return probe.ready === true;
}
