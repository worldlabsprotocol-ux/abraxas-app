// FILE: lib/developers/unifiedWorkspaceContinuity.ts
// Build 877 — one workspace UX; separate routes/authorization unchanged.

import { INTEGRATION_STUDIO_PATH } from "@/lib/partner/integrationStudio/contract";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import {
  DEVELOPER_WORKSPACE_STUDIO_SOURCE,
  defaultStudioPathForSandboxPolicy,
  sandboxPolicyToStudioPack,
} from "@/lib/developers/sandboxIntegrationHandoff";
import type { IntegrationStudioStageId } from "@/lib/developers/useIntegrationStudioStage";

export const UNIFIED_DEVELOPER_WORKSPACE_PATH = "/developers/ephemeral-sandbox" as const;
export const UNIFIED_INTEGRATION_QUERY_FLAG = "integration";

export function isUnifiedWorkspaceIntegrationSearch(params: URLSearchParams): boolean {
  return (
    params.get(UNIFIED_INTEGRATION_QUERY_FLAG) === "1"
    || params.get("source") === DEVELOPER_WORKSPACE_STUDIO_SOURCE
  );
}

/** Guided handoff stays on Developer Workspace (no Integration Studio route hop). */
export function buildUnifiedWorkspaceIntegrationUrl(input: {
  policyId: string;
  pathId?: IntegrationStudioPathId;
  stage?: IntegrationStudioStageId;
  focusCreateSandbox?: boolean;
}): string {
  const pack = sandboxPolicyToStudioPack(input.policyId);
  const params = new URLSearchParams({
    [UNIFIED_INTEGRATION_QUERY_FLAG]: "1",
    source: DEVELOPER_WORKSPACE_STUDIO_SOURCE,
  });
  if (pack) params.set("pack", pack);
  params.set("path", input.pathId ?? defaultStudioPathForSandboxPolicy(input.policyId));
  if (input.focusCreateSandbox !== false) {
    params.set("step", "create_sandbox");
  }
  const stage = input.stage ?? (input.focusCreateSandbox !== false ? "sandbox" : "policy");
  const hash = stage === "policy" ? "" : `#${stage}`;
  return `${UNIFIED_DEVELOPER_WORKSPACE_PATH}?${params.toString()}${hash}`;
}

export function buildIntegrationStageUrl(input: {
  basePath: string;
  stage: IntegrationStudioStageId | "receipt" | "verify" | "production";
  query?: Record<string, string>;
}): string {
  const params = new URLSearchParams(input.query ?? {});
  const qs = params.toString();
  const path = `${input.basePath}${qs ? `?${qs}` : ""}`;
  if (input.stage === "policy") return path;
  if (input.stage === "receipt") return "/verify?mode=receipt";
  if (input.stage === "verify") return "/verify";
  if (input.stage === "production") return "/developers/launchpad";
  return `${path}#${input.stage}`;
}

/** Deep link to full Integration Studio (advanced / compatibility). */
export function integrationStudioDeepLink(stage?: IntegrationStudioStageId): string {
  if (!stage || stage === "policy") return INTEGRATION_STUDIO_PATH;
  return `${INTEGRATION_STUDIO_PATH}#${stage}`;
}
