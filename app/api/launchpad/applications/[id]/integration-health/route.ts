// FILE: app/api/launchpad/applications/[id]/integration-health/route.ts
// Partner Launchpad operational integration health.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { getLaunchpadWebhookOverview } from "@/lib/partner/eventDelivery/launchpadWebhook";
import {
  buildIntegrationOperationalHealth,
  integrationObservabilityLeaks,
  loadIntegrationEventsForApplication,
  INTEGRATION_OBSERVABILITY_NOTICE,
} from "@/lib/partner/integrationObservability";
import { loadMerchantJourneyForApplication } from "@/lib/partner/launchpad/merchantJourney/load";
import { callbackConfigured } from "@/lib/partner/launchpad/journeyState";
import { buildInstitutionalActivationEvidence } from "@/lib/partner/launchpad/institutionalActivationMilestones";
import { INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID } from "@/lib/partner/launchpad/institutionalActivationEntry";
import { buildInstitutionalFirstVerifiedOutcomeView } from "@/lib/partner/launchpad/institutionalFirstVerifiedOutcome";
import { buildInstitutionalVerificationContractDocument } from "@/lib/institutionalVerification/verificationContractDocument";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(req, "/api/launchpad/integration-health", auth.session.partnerId, 30);
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const sb = requireSupabaseAdmin();
  let productionKeyRevoked = false;
  if (app.production_api_key_id) {
    const { data: key } = await sb
      .from("partner_api_keys")
      .select("revoked_at")
      .eq("id", app.production_api_key_id)
      .maybeSingle();
    productionKeyRevoked = Boolean(key?.revoked_at);
  }

  const webhook = await getLaunchpadWebhookOverview({
    partnerId: auth.session.partnerId,
    policyId: app.policy_id,
    policyVersion: app.policy_version,
    callbackConfigured: app.allowed_return_urls.some((url) => url.startsWith("https://")),
  });

  const events = await loadIntegrationEventsForApplication({
    partnerId: auth.session.partnerId,
    applicationId: app.id,
  });

  const health = await buildIntegrationOperationalHealth({
    application: app,
    events,
    productionKeyRevoked,
    webhookConfigured: webhook.webhook_configured,
    webhookDegraded: webhook.delivery_failure_blocker,
  });

  const payload: Record<string, unknown> = { ok: true, notice: INTEGRATION_OBSERVABILITY_NOTICE, ...health };

  if (app.policy_template_id === INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID) {
    const journeyLoad = await loadMerchantJourneyForApplication({
      application: app,
      partnerId: auth.session.partnerId,
      activeSandboxKey: Boolean(app.api_key_id),
    });
    const institutional_activation = buildInstitutionalActivationEvidence({
      applicationCreatedAt: app.created_at,
      journey: journeyLoad.journey,
      health,
      activeSandboxKey: journeyLoad.input.activeSandboxKey,
      starterKitEvidenced: journeyLoad.input.starterKitEvidenced,
      callbackConfigured: callbackConfigured(app.allowed_return_urls),
    });
    payload.institutional_activation = institutional_activation;
    const contractDoc = buildInstitutionalVerificationContractDocument();
    const digest =
      "ok" in contractDoc ? null : contractDoc.trust_material.receipt_key_document_digest;
    payload.institutional_first_verified_outcome = buildInstitutionalFirstVerifiedOutcomeView({
      app,
      health,
      events,
      activation: institutional_activation,
      receiptKeyDocumentDigest: digest,
    });
  }

  if (integrationObservabilityLeaks(payload).length > 0) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, "redacted");
  }
  return launchpadJson(payload);
}
