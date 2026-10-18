// FILE: lib/partner/launchpad/provisionSandbox.ts
// Atomic sandbox provisioning via migration 084 RPC.

import { queryAbraxasPg } from "@/lib/persistence/pgPool";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { isSovereignNativeAccountMode } from "@/lib/persistence/sovereignNativeAccount";
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
import { launchpadUsesSovereignPostgres } from "@/lib/partner/launchpad/launchpadPersistence";
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

function launchpadUsesDirectPostgres(): boolean {
  return persistenceUsesDirectPostgres() || isSovereignNativeAccountMode();
}

export async function provisionLaunchpadSandbox(
  input: ProvisionSandboxInput,
): Promise<
  | { ok: true; result: ProvisionSandboxResult; idempotencyReplay: boolean; apiKey?: string }
  | { ok: false; code: ProvisionSandboxErrorCode }
> {

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

  if (launchpadUsesSovereignPostgres()) {
    const { provisionSovereignLaunchpadSandbox } = await import("@/lib/partner/launchpad/sovereign/provisionSandboxTransaction");
    return provisionSovereignLaunchpadSandbox({
      provisionInput: input,
      partnerId,
      publicSlug,
      policyId,
      policyRules: policyRules as Record<string, unknown>,
      keyPrefix: prefix,
      keyHash: hash,
      rawApiKey: raw,
    });
  }

  type ProvisionRow = {
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

  let row: ProvisionRow | null = null;

  if (launchpadUsesDirectPostgres()) {
    try {
      const { rows } = await queryAbraxasPg<{ result: ProvisionRow }>(
        `select partner_launchpad_provision_sandbox_atomic(
          $1::text, $2::text, $3::text, $4::text, $5::text, $6::text, $7::jsonb,
          $8::text, $9::text, $10::text, $11::text
        ) as result`,
        [
          applicationName,
          displayName,
          partnerId,
          publicSlug,
          input.policyTemplateId,
          policyId,
          JSON.stringify(policyRules),
          input.returnUrl.trim(),
          input.idempotencyKey ?? null,
          prefix,
          hash,
        ],
      );
      row = rows[0]?.result ?? null;
    } catch (error) {
      console.error("[launchpad/provision] direct pg rpc failed", { error });
      return { ok: false, code: "provision_failed" };
    }
  } else {
    const sb = requireSupabaseAdmin();
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
    row = data as ProvisionRow;
  }

  const rowTyped = row as {
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

  if (!rowTyped?.ok || !rowTyped.application_id || !rowTyped.partner_id || !rowTyped.public_slug) {
    if (rowTyped?.code === "conflict") return { ok: false, code: "conflict" };
    return { ok: false, code: "provision_failed" };
  }

  const hostedVerifyUrl = `${SITE_URL}/partner/verify?app=${encodeURIComponent(rowTyped.public_slug)}&return_url=${encodeURIComponent(input.returnUrl.trim())}`;

  const idempotencyReplay = rowTyped.code === "idempotency_replay";

  return {
    ok: true,
    idempotencyReplay,
    apiKey: idempotencyReplay ? undefined : raw,
    result: {
      application_id: rowTyped.application_id,
      partner_id: rowTyped.partner_id,
      public_slug: rowTyped.public_slug,
      policy_id: rowTyped.policy_id ?? policyId,
      policy_version: rowTyped.policy_version ?? 1,
      api_key_id: rowTyped.api_key_id ?? "",
      api_key: idempotencyReplay ? "" : raw,
      key_prefix: rowTyped.key_prefix ?? prefix,
      hosted_verify_url: hostedVerifyUrl,
    },
  };
}
