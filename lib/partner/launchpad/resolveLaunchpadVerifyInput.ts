// FILE: lib/partner/launchpad/resolveLaunchpadVerifyInput.ts
// Resolve hosted verification links that use the public application slug (?app=).

import {
  getLaunchpadApplicationBySlug,
  validateLaunchpadHostedReturnUrl,
} from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { resolveLaunchpadPolicyTemplate } from "@/lib/partner/launchpad/policyCatalog";
import { normalizePartnerVerifyInput } from "@/lib/partner/normalizePartnerVerifyInput";
import { resolveStoredPartnerFlowCallback } from "@/lib/partner/launchpad/partnerFlowRequest/store";

export interface LaunchpadVerifyConfig {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  returnUrl: string;
  applicationId: string;
  publicSlug: string;
  displayName: string;
  policyTemplateId: string;
  userExplanation: string;
  disclosedResult: string;
  environment: "sandbox" | "production";
  status: string;
}

export async function resolveLaunchpadVerifyConfig(input: {
  publicSlug: string;
  returnUrl: string;
}): Promise<
  | { ok: true; config: LaunchpadVerifyConfig }
  | { ok: false; code: string; message: string }
> {
  const publicSlug = input.publicSlug.trim();
  let returnUrl = input.returnUrl.trim();

  if (!publicSlug) {
    return {
      ok: false,
      code: "missing_required_params",
      message: "Application slug is required.",
    };
  }

  const app = await getLaunchpadApplicationBySlug(publicSlug);
  if (!app) {
    return {
      ok: false,
      code: "launchpad_application_not_found",
      message: "This verification link references an unknown application.",
    };
  }

  if (app.status === "suspended") {
    return {
      ok: false,
      code: "launchpad_application_revoked",
      message: "This application is suspended. Contact the partner for a new link.",
    };
  }

  if (!returnUrl) {
    try {
      returnUrl = await resolveStoredPartnerFlowCallback(app.id, app.partner_id, app.allowed_return_urls) ?? "";
    } catch {
      returnUrl = app.allowed_return_urls[0] ?? "";
    }
  }

  if (!returnUrl) {
    return {
      ok: false,
      code: "missing_required_params",
      message: "This application needs an approved callback before Hosted Partner Flow can start.",
    };
  }

  if (!validateLaunchpadHostedReturnUrl(app, returnUrl)) {
    return {
      ok: false,
      code: "launchpad_return_url_rejected",
      message: "The return destination is not approved for this application.",
    };
  }

  const template = resolveLaunchpadPolicyTemplate(app.policy_template_id);

  return {
    ok: true,
    config: {
      partnerId: app.partner_id,
      policyId: app.policy_id,
      policyVersion: app.policy_version,
      returnUrl,
      applicationId: app.id,
      publicSlug: app.public_slug,
      displayName: app.display_name,
      policyTemplateId: app.policy_template_id,
      userExplanation: template?.userExplanation ?? "Complete the verification required by this partner.",
      disclosedResult: template?.disclosedResult ?? "eligibility_result",
      environment: app.environment,
      status: app.status,
    },
  };
}

export type PartnerVerifyWithLaunchpadResult =
  | {
      ok: true;
      params: import("@/lib/partner/normalizePartnerVerifyInput").PartnerVerifyNormalizedParams;
      legacyBrowseNormalized: boolean;
      launchpad?: LaunchpadVerifyConfig;
    }
  | { ok: false; code: string; invalidLinkMessage: string };

export async function normalizePartnerVerifyWithLaunchpad(input: {
  app?: string | null;
  partnerId?: string | null;
  relyingPartyId?: string | null;
  policyId?: string | null;
  purpose?: string | null;
  returnUrl?: string | null;
  permission?: string | null;
  permissionVersion?: string | null;
}): Promise<PartnerVerifyWithLaunchpadResult> {
  const appSlug = input.app?.trim();
  if (appSlug) {
    const resolved = await resolveLaunchpadVerifyConfig({
      publicSlug: appSlug,
      returnUrl: input.returnUrl ?? "",
    });
    if (!resolved.ok) {
      return {
        ok: false,
        code: resolved.code,
        invalidLinkMessage: resolved.message,
      };
    }
    const normalized = normalizePartnerVerifyInput({
      partnerId: resolved.config.partnerId,
      policyId: resolved.config.policyId,
      returnUrl: resolved.config.returnUrl,
      purpose: input.purpose,
      permission: input.permission,
      permissionVersion: input.permissionVersion,
    });
    if (!normalized.ok) {
      return {
        ok: false,
        code: normalized.code,
        invalidLinkMessage: normalized.invalidLinkMessage,
      };
    }
    return {
      ok: true,
      params: normalized.params,
      legacyBrowseNormalized: normalized.legacyBrowseNormalized,
      launchpad: resolved.config,
    };
  }

  const normalized = normalizePartnerVerifyInput(input);
  if (!normalized.ok) {
    return {
      ok: false,
      code: normalized.code,
      invalidLinkMessage: normalized.invalidLinkMessage,
    };
  }
  return {
    ok: true,
    params: normalized.params,
    legacyBrowseNormalized: normalized.legacyBrowseNormalized,
  };
}
