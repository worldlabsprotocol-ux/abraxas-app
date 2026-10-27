// FILE: lib/developers/unifiedWorkspacePreservedQuery.ts
// Build 879 — merge server-authoritative sandbox policy into embed query (UI deep-link only).

import {
  DEVELOPER_WORKSPACE_STUDIO_SOURCE,
  defaultStudioPathForSandboxPolicy,
  sandboxPolicyToStudioPack,
} from "@/lib/developers/sandboxIntegrationHandoff";
import { UNIFIED_INTEGRATION_QUERY_FLAG } from "@/lib/developers/unifiedWorkspaceContinuity";

export function mergeUnifiedWorkspacePreservedQuery(input: {
  existing: Record<string, string>;
  authoritativePolicyId?: string | null;
  walletProofRecorded?: boolean;
}): Record<string, string> {
  const out = { ...input.existing };
  if (!out[UNIFIED_INTEGRATION_QUERY_FLAG]) {
    out[UNIFIED_INTEGRATION_QUERY_FLAG] = "1";
  }
  if (!out.source) {
    out.source = DEVELOPER_WORKSPACE_STUDIO_SOURCE;
  }
  const policyId = input.authoritativePolicyId?.trim();
  if (policyId) {
    const pack = sandboxPolicyToStudioPack(policyId);
    if (pack && !out.pack) {
      out.pack = pack;
    }
    if (!out.path) {
      out.path = defaultStudioPathForSandboxPolicy(policyId);
    }
  }
  if (input.walletProofRecorded && !out.step) {
    out.step = "create_sandbox";
  }
  return out;
}
