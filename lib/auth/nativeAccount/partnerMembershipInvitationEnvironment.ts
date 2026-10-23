// FILE: lib/auth/nativeAccount/partnerMembershipInvitationEnvironment.ts
// Fail-closed: sandbox recovery grants must not run from Production app origins.

import {
  isProductionAppOrigin,
  resolveConfiguredAppOrigin,
} from "@/lib/demo/partnerSandboxDemoEnvironmentGuard";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

export type InvitationEnvironmentGateResult =
  | { ok: true }
  | { ok: false; code: "production_origin_forbidden" | "application_not_sandbox" | "origin_not_configured" };

export function assertPartnerMembershipInvitationEnvironment(
  app: Pick<LaunchpadApplicationRow, "environment">,
  env: Record<string, string | undefined> = process.env,
): InvitationEnvironmentGateResult {
  const configured = resolveConfiguredAppOrigin(env);
  if (!configured) {
    return { ok: false, code: "origin_not_configured" };
  }
  if (isProductionAppOrigin(configured)) {
    return { ok: false, code: "production_origin_forbidden" };
  }
  if (app.environment !== "sandbox") {
    return { ok: false, code: "application_not_sandbox" };
  }
  return { ok: true };
}
