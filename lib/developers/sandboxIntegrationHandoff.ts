// FILE: lib/developers/sandboxIntegrationHandoff.ts
// Safe, nonsensitive handoff from Developer Workspace sandbox tests to Integration Studio.

import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import { buildUnifiedWorkspaceIntegrationUrl } from "@/lib/developers/unifiedWorkspaceContinuity";
import { isPolicyPackId, type PolicyPackId } from "@/lib/partner/launchpad/policyPacks";

/** Query marker only — never carries secrets or receipt identifiers. */
export const DEVELOPER_WORKSPACE_STUDIO_SOURCE = "developer-workspace";

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
  return buildUnifiedWorkspaceIntegrationUrl({
    policyId: input.policyId,
    pathId: input.pathId,
    focusCreateSandbox: input.focusCreateSandbox,
  });
}

export function developerWorkspaceStudioHandoffNotice(input: {
  policyId: string | null;
  policyLabel?: string | null;
}): string {
  const label =
    input.policyLabel?.trim()
    || (input.policyId ? input.policyId.replace(/_/g, " ") : "sandbox policy");
  return `Your wallet proof is checked. Next, create a test app in this workspace to see how your application requests verification and enforces the signed result independently. Wallet demo success does not grant partner authorization. Production still requires review.`;
}

export function integrationStudioReturnToWorkspaceHref(): string {
  return "/developers/ephemeral-sandbox";
}
