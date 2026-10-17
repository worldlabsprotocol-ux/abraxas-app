// FILE: lib/partner/launchpad/launchpadConnectNavigation.ts
// Primary-action routing for Launchpad connect stage (institutional vs merchant).

import {
  INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF,
  INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID,
} from "@/lib/partner/launchpad/institutionalActivationEntry";

export function institutionalIntegrationWorkspaceHref(applicationId: string): string {
  return `${INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF}?application=${encodeURIComponent(applicationId)}`;
}

export function resolveLaunchpadConnectPrimaryHref(input: {
  policyTemplateId: string;
  applicationId: string;
  primaryCta: string;
  stage: string;
}): string | null {
  if (input.policyTemplateId !== INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID) return null;
  const cta = input.primaryCta.toLowerCase();
  if (input.stage !== "connect" && !cta.includes("connect") && !cta.includes("setup")) return null;
  return institutionalIntegrationWorkspaceHref(input.applicationId);
}
