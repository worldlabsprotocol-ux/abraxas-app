// FILE: lib/partner/integrationStudio/createSandbox.ts
// Session-bound sandbox create. Reuses Launchpad provision, keys, and docs.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadRateLimit,
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { provisionLaunchpadSandbox } from "@/lib/partner/launchpad/provisionSandbox";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import { buildLaunchpadIntegrationDocs } from "@/lib/partner/launchpad/integrationDocs";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { resolveLaunchpadPolicyTemplate } from "@/lib/partner/launchpad/policyCatalog";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  attachPartnerConsoleSessionCookie,
  issuePartnerConsoleSessionToken,
} from "@/lib/partner/launchpad/partnerConsoleSession";
import { studioSnippetForApplication } from "@/lib/partner/integrationStudio/snippets";
import { launchpadResumeHref, partnerActivationPublicView } from "@/lib/partner/activationPath";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

export const STUDIO_CREATE_ROUTE = "/api/developers/integration-studio" as const;

export type StudioCreateErrorCode =
  | "unauthorized"
  | "forbidden"
  | "invalid_input"
  | "return_url_rejected"
  | "policy_template_invalid"
  | "production_denied"
  | "rate_limited"
  | "provision_failed";

function studioError(code: StudioCreateErrorCode, status: number) {
  const mapped =
    code === "unauthorized" ? LAUNCHPAD_PUBLIC_ERRORS.unauthorized
    : code === "forbidden" ? LAUNCHPAD_PUBLIC_ERRORS.forbidden
    : code === "return_url_rejected" ? LAUNCHPAD_PUBLIC_ERRORS.return_url_rejected
    : code === "policy_template_invalid" ? LAUNCHPAD_PUBLIC_ERRORS.policy_template_invalid
    : code === "rate_limited" ? LAUNCHPAD_PUBLIC_ERRORS.sandbox_rate_limited
    : code === "provision_failed" ? LAUNCHPAD_PUBLIC_ERRORS.provision_failed
    : LAUNCHPAD_PUBLIC_ERRORS.invalid_input;
  return launchpadError(mapped, status, code);
}

function safeApplicationView(input: {
  application_id: string;
  partner_id: string;
  public_slug: string;
  policy_id: string;
  policy_version: number;
  key_prefix: string;
  hosted_verify_url: string;
  policy_template_id: string;
}) {
  return {
    application_id: input.application_id,
    partner_id: input.partner_id,
    public_slug: input.public_slug,
    policy_id: input.policy_id,
    policy_version: input.policy_version,
    key_prefix: input.key_prefix,
    hosted_verify_url: input.hosted_verify_url,
    policy_template_id: input.policy_template_id,
    environment: "sandbox" as const,
  };
}

export async function createStudioSandbox(req: NextRequest) {
  const ipLimited = enforceLaunchpadRateLimit(req, STUDIO_CREATE_ROUTE, 8);
  if (ipLimited) return ipLimited;

  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;

  const tenantLimited = enforceLaunchpadTenantRateLimit(
    req,
    STUDIO_CREATE_ROUTE,
    auth.session.partnerId,
    5,
  );
  if (tenantLimited) return tenantLimited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return studioError("invalid_input", 400);
  }

  if (String(body.environment ?? "sandbox") === "production") {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 403, "production_denied");
  }
  if (auth.session.environment === "production" && body.issue_production_key === true) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 403, "production_denied");
  }

  const requestedPartnerId = body.partner_id ? String(body.partner_id) : auth.session.partnerId;
  if (requestedPartnerId !== auth.session.partnerId) {
    return studioError("forbidden", 403);
  }

  const policyTemplateId = String(body.policy_template_id ?? body.pack_id ?? "");
  if (!resolveLaunchpadPolicyTemplate(policyTemplateId)) {
    return studioError("policy_template_invalid", 400);
  }

  const applicationName = String(body.application_name ?? "").trim();
  const returnUrl = String(body.return_url ?? "").trim();
  if (!applicationName || !returnUrl) {
    return studioError("invalid_input", 400);
  }

  const result = await provisionLaunchpadSandbox({
    applicationName,
    displayName: String(body.display_name ?? applicationName).trim(),
    partnerId: auth.session.partnerId,
    policyTemplateId,
    returnUrl,
    idempotencyKey: body.idempotency_key
      ? String(body.idempotency_key)
      : `studio-${auth.session.partnerId}-${policyTemplateId}-${applicationName}`,
  });

  if (!result.ok) {
    if (result.code === "return_url_rejected") return studioError("return_url_rejected", 400);
    if (result.code === "policy_template_invalid") return studioError("policy_template_invalid", 400);
    if (result.code === "conflict") {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 409, "conflict");
    }
    return studioError("provision_failed", result.code === "provision_failed" ? 500 : 400);
  }

  const application = safeApplicationView({
    application_id: result.result.application_id,
    partner_id: result.result.partner_id,
    public_slug: result.result.public_slug,
    policy_id: result.result.policy_id,
    policy_version: result.result.policy_version,
    key_prefix: result.result.key_prefix,
    hosted_verify_url: result.result.hosted_verify_url,
    policy_template_id: policyTemplateId,
  });

  const docsRow: LaunchpadApplicationRow = {
    id: result.result.application_id,
    public_slug: result.result.public_slug,
    partner_id: result.result.partner_id,
    application_name: applicationName,
    display_name: String(body.display_name ?? applicationName).trim(),
    environment: "sandbox",
    policy_id: result.result.policy_id,
    policy_version: result.result.policy_version,
    policy_template_id: policyTemplateId,
    allowed_return_urls: [returnUrl],
    api_key_id: result.result.api_key_id || null,
    production_api_key_id: null,
    production_key_revealed_at: null,
    status: "active",
    idempotency_key: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const docs = buildLaunchpadIntegrationDocs(docsRow, result.result.key_prefix);
  const path_instructions = studioSnippetForApplication({
    partnerId: result.result.partner_id,
    policyId: result.result.policy_id,
    policyVersion: result.result.policy_version,
    publicSlug: result.result.public_slug,
    returnUrl,
  });

  if (!result.idempotencyReplay) {
    try {
      const sb = requireSupabaseAdmin();
      await recordLaunchpadActivity(sb, {
        applicationId: result.result.application_id,
        partnerId: result.result.partner_id,
        eventType: "application_provisioned",
        publicCode: "studio_sandbox_created",
        metadata: {
          source: "integration_studio",
          policy_template_id: policyTemplateId,
          idempotency_replay: false,
        },
      });
    } catch {
      // Audit must never leak provision details or fail the one-time key response.
    }
  }

  const apiKey = result.idempotencyReplay ? null : (result.apiKey ?? null);
  const res = launchpadJson({
    ok: true,
    environment: "sandbox",
    self_serve_production: false,
    idempotency_replay: result.idempotencyReplay,
    application,
    api_key: apiKey,
    docs,
    path_instructions,
    production_upgrade: "Upgrade to Production after readiness review",
    production_href: launchpadResumeHref(application.application_id),
    activation: partnerActivationPublicView(),
    resume_href: launchpadResumeHref(application.application_id),
  });

  if (apiKey && result.result.api_key_id) {
    const sig = await issuePartnerConsoleSessionToken({
      partnerId: result.result.partner_id,
      apiKeyId: result.result.api_key_id,
      environment: "sandbox",
    });
    if (sig) attachPartnerConsoleSessionCookie(res, sig);
  }

  return res;
}
