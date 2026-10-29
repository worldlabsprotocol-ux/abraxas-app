// FILE: lib/developers/homepageInlineIntegration.ts
// Stay on `/` while unlocking embedded Integration Studio (no route hop).

import {
  DEVELOPER_WORKSPACE_STUDIO_SOURCE,
  defaultStudioPathForSandboxPolicy,
  sandboxPolicyToStudioPack,
} from "@/lib/developers/sandboxIntegrationHandoff";
import { UNIFIED_INTEGRATION_QUERY_FLAG } from "@/lib/developers/unifiedWorkspaceContinuity";
import { focusHomepageBuilderWorkspace } from "@/lib/home/homepageWorkspaceFocus";

export function applyHomepageInlineIntegrationSearch(policyId: string): void {
  if (typeof window === "undefined") return;
  const pack = sandboxPolicyToStudioPack(policyId);
  const params = new URLSearchParams(window.location.search);
  params.set(UNIFIED_INTEGRATION_QUERY_FLAG, "1");
  params.set("source", DEVELOPER_WORKSPACE_STUDIO_SOURCE);
  params.set("step", "create_sandbox");
  if (pack) params.set("pack", pack);
  params.set("path", defaultStudioPathForSandboxPolicy(policyId));
  const next = `/?${params.toString()}#start-sandbox`;
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== next) {
    window.history.replaceState(null, "", next);
  }
  window.requestAnimationFrame(() => {
    focusHomepageBuilderWorkspace();
  });
}
