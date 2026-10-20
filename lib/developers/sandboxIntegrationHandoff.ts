// FILE: lib/developers/sandboxIntegrationHandoff.ts
// Safe, nonsensitive handoff from Developer Workspace sandbox tests to Integration Studio.

import { INTEGRATION_STUDIO_PATH } from "@/lib/partner/integrationStudio/contract";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import { isPolicyPackId, type PolicyPackId } from "@/lib/partner/launchpad/policyPacks";

/** Query marker only — never carries secrets or receipt identifiers. */
export const DEVELOPER_WORKSPACE_STUDIO_SOURCE = "developer-workspace";

const SANDBOX_CREATE_SECTION_HASH = "#sandbox";

export function sandboxPolicyToStudioPack(policyId: string): PolicyPackId | null {
  return isPolicyPackId(policyId) ? policyId : null;
}

export function defaultStudioPathForSandboxPolicy(policyId: string): IntegrationStudioPathId {
  if (policyId === "wallet_control") return "verify_with_abraxas";
  if (policyId === "age_21_retail") return "hosted_partner_flow";
  return "verify_with_abraxas";
}

export function buildIntegrationStudioHandoffUrl(input: {
  policyId: string;
  pathId?: IntegrationStudioPathId;
  focusCreateSandbox?: boolean;
}): string {
  const pack = sandboxPolicyToStudioPack(input.policyId);
  const params = new URLSearchParams({
    source: DEVELOPER_WORKSPACE_STUDIO_SOURCE,
  });
  if (pack) params.set("pack", pack);
  params.set("path", input.pathId ?? defaultStudioPathForSandboxPolicy(input.policyId));
  if (input.focusCreateSandbox !== false) {
    params.set("step", "create_sandbox");
  }
  return `${INTEGRATION_STUDIO_PATH}?${params.toString()}${SANDBOX_CREATE_SECTION_HASH}`;
}

export function developerWorkspaceStudioHandoffNotice(input: {
  policyId: string | null;
  policyLabel?: string | null;
}): string {
  const label =
    input.policyLabel?.trim()
    || (input.policyId ? input.policyId.replace(/_/g, " ") : "sandbox policy");
  return `You completed a Developer Workspace sandbox test for ${label}. The matching policy pack and integration path are preselected below. Create a private sandbox application to run the same verification from your server — Production access still requires partner review.`;
}

export function integrationStudioReturnToWorkspaceHref(): string {
  return "/developers/ephemeral-sandbox";
}
