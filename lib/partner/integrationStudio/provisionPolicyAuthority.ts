// FILE: lib/partner/integrationStudio/provisionPolicyAuthority.ts
// Authoritative policy + tenant binding for Integration Studio sandbox create (server-side).

import {
  buildLaunchpadPolicyId,
  resolveLaunchpadPolicyTemplate,
} from "@/lib/partner/launchpad/policyCatalog";

/** Resolve a single catalog template id; fail closed when pack_id and policy_template_id disagree. */
export function resolveStudioPolicyTemplateId(body: Record<string, unknown>): string | null {
  const fromTemplate = String(body.policy_template_id ?? "").trim();
  const fromPack = String(body.pack_id ?? "").trim();
  if (fromTemplate && fromPack && fromTemplate !== fromPack) return null;
  const id = fromTemplate || fromPack;
  if (!id || !resolveLaunchpadPolicyTemplate(id)) return null;
  return id;
}

/** Client-supplied policy_id is never authorization; reject overrides that do not match the derived pin. */
export function clientPolicyIdOverrideRejected(
  body: Record<string, unknown>,
  partnerId: string,
  policyTemplateId: string,
): boolean {
  const clientPolicyId = body.policy_id ? String(body.policy_id).trim() : "";
  if (!clientPolicyId) return false;
  return clientPolicyId !== buildLaunchpadPolicyId(partnerId, policyTemplateId);
}

/** Provisioned row must match authorized tenant and catalog-derived policy pin. */
export function assertAuthoritativeProvisionBinding(input: {
  partnerId: string;
  policyTemplateId: string;
  provisionedPartnerId: string;
  provisionedPolicyId: string;
}): boolean {
  if (input.provisionedPartnerId !== input.partnerId) return false;
  const expectedPolicyId = buildLaunchpadPolicyId(input.partnerId, input.policyTemplateId);
  return input.provisionedPolicyId === expectedPolicyId;
}
