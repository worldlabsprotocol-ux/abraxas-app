// FILE: lib/partner/launchpad/policyChangeControlAvailability.ts
// Server-only schema probe for Launchpad Policies dark-launch.

import { probePolicyChangeControlSchema } from "@/lib/policy/changeControl/schemaReady";

export async function resolvePolicyChangeControlUiAvailability(): Promise<boolean> {
  const probe = await probePolicyChangeControlSchema();
  return probe.ready === true;
}
