// FILE: lib/partner/launchpad/provisionSandbox.ts
// Atomic sandbox provisioning via migration 084 RPC.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { generatePartnerKey } from "@/lib/partner/partnerAuth";
import { isValidPartnerId, normalizePartnerId } from "@/lib/partner/partnerIdFormat";
import {
  buildLaunchpadPolicyId,
  resolveLaunchpadPolicyTemplate,
} from "@/lib/partner/launchpad/policyCatalog";
import {
  buildCustomLaunchpadSandboxPolicy,
  CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID,
  type CustomLaunchpadPolicyInput,
} from "@/lib/partner/launchpad/customPolicy";
import { validateLaunchpadReturnUrl } from "@/lib/partner/launchpad/returnUrl";
import { slugifyLaunchpadApplication, isValidLaunchpadPublicSlug } from "@/lib/partner/launchpad/slug";
import type { ProvisionSandboxResult } from "@/lib/partner/launchpad/types";
import { SITE_URL } from "@/lib/siteUrl";

export type ProvisionSandboxInput = {
  applicationName: string;
  displayName: string;
  partnerId: string;
  publicSlug?: string;
  policyTemplateId: string;
  customPolicy?: CustomLaunchpadPolicyInput;
  returnUrl: string;
  idempotencyKey?: string;
};

export type ProvisionSandboxErrorCode =
  | "invalid_input"
  | "policy_template_invalid"
  | "return_url_rejected"
  | "provision_failed"
  | "conflict"
  | "not_configured";

export async function provisionLaunchpadSandbox(
  input: ProvisionSandboxInput,
): Promise<
  | { ok: true; result: ProvisionSandboxResult; idempotencyReplay: boolean; apiKey?: string }
  | { ok: false; code: ProvisionSandboxErrorCode }
> {
  const sb = requireSupabaseAdmin();

  const applicationName = input.applicationName.trim();
  const displayName = input.displayName.trim();
  const partnerId = normalizePartnerId(input.partnerId);
  const template = resolveLaunchpadPolicyTemplate(input.policyTemplateId);
  const customPolicy = input.policyTemplateId === CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID && input.customPolicy
    ? buildCustomLaunchpadSandboxPolicy(input.customPolicy)
    : null;

  if (!applicationName || !displayName || !isValidPartnerId(partnerId) || (!template && !customPolicy)) {
    return { ok: false, code: !template && !customPolicy ? "policy_template_invalid" : "invalid_input" };
  }
  if (customPolicy && !customPolicy.ok) {
    return { ok: false, code: "invalid_input" };
  }

  const returnCheck = validateLaunchpadReturnUrl(input.returnUrl);
  if (!returnCheck.ok) {
    return { ok: false, code: "return_url_rejected" };
  }

  const publicSlug = input.publicSlug?.trim() || slugifyLaunchpadApplication(applicationName);
  if (!isValidLaunchpadPublicSlug(publicSlug)) {
    return { ok: false, code: "invalid_input" };
  }

  const policyId = buildLaunchpadPolicyId(partnerId, input.policyTemplateId);
  const policyRules = customPolicy && customPolicy.ok ? customPolicy.rules : template!.rules;
  const { raw, prefix, hash } = generatePartnerKey("test");

  const { data, error } = await sb.rpc("partner_launchpad_provision_sandbox_atomic", {
    p_application_name: applicationName,
    p_display_name: displayName,
    p_partner_id: partnerId,
    p_public_slug: publicSlug,
    p_policy_template_id: input.policyTemplateId,
    p_policy_id: policyId,
    p_policy_rules: policyRules,
    p_return_url: input.returnUrl.trim(),
    p_idempotency_key: input.idempotencyKey ?? null,
    p_key_prefix: prefix,
    p_key_hash: hash,
  });

  if (error) {
    console.error("[launchpad/provision] rpc failed", { error_message: error.message });
    return { ok: false, code: "provision_failed" };
  }

  const row = data as {
    ok?: boolean;
    code?: string;
    application_id?: string;
    partner_id?: string;
    public_slug?: string;
    policy_id?: string;
    policy_version?: number;
    key_prefix?: string;
    api_key_id?: string;
  };

  if (!row?.ok || !row.application_id || !row.partner_id || !row.public_slug) {
    if (row?.code === "conflict") return { ok: false, code: "conflict" };
    return { ok: false, code: "provision_failed" };
  }

  const hostedVerifyUrl = `${SITE_URL}/partner/verify?app=${encodeURIComponent(row.public_slug)}&return_url=${encodeURIComponent(input.returnUrl.trim())}`;

  const idempotencyReplay = row.code === "idempotency_replay";

  return {
    ok: true,
    idempotencyReplay,
    apiKey: idempotencyReplay ? undefined : raw,
    result: {
      application_id: row.application_id,
      partner_id: row.partner_id,
      public_slug: row.public_slug,
      policy_id: row.policy_id ?? policyId,
      policy_version: row.policy_version ?? 1,
      api_key_id: row.api_key_id ?? "",
      api_key: idempotencyReplay ? "" : raw,
      key_prefix: row.key_prefix ?? prefix,
      hosted_verify_url: hostedVerifyUrl,
    },
  };
}
