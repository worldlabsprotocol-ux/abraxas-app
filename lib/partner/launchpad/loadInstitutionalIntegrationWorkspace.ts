// FILE: lib/partner/launchpad/loadInstitutionalIntegrationWorkspace.ts

import {
  buildInstitutionalVerificationContractDocument,
  type InstitutionalVerificationContractDocument,
} from "@/lib/institutionalVerification/verificationContractDocument";
import { buildInstitutionalSdkReleaseView } from "@/lib/institutionalVerification/sdkRelease";
import { buildInstitutionalActivationEvidence } from "@/lib/partner/launchpad/institutionalActivationMilestones";
import {
  buildInstitutionalIntegrationWorkspace,
  buildInstitutionalSdkVerificationSnippet,
  type InstitutionalIntegrationWorkspacePayload,
} from "@/lib/partner/launchpad/institutionalIntegrationWorkspace";
import { INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF } from "@/lib/partner/launchpad/institutionalActivationEntry";
import { INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID } from "@/lib/partner/launchpad/institutionalActivationEntry";
import { callbackConfigured } from "@/lib/partner/launchpad/journeyState";
import { loadMerchantJourneyForApplication } from "@/lib/partner/launchpad/merchantJourney/load";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  buildIntegrationOperationalHealth,
  loadIntegrationEventsForApplication,
} from "@/lib/partner/integrationObservability";
import { SITE_URL } from "@/lib/siteUrl";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { getLaunchpadWebhookOverview } from "@/lib/partner/eventDelivery/launchpadWebhook";

export function isInstitutionalSandboxApplication(app: LaunchpadApplicationRow): boolean {
  return app.policy_template_id === INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID;
}

function isInstitutionalVerificationContractDocument(
  doc: InstitutionalVerificationContractDocument | { ok: false; status: "unavailable" },
): doc is InstitutionalVerificationContractDocument {
  return !("ok" in doc);
}

export async function loadInstitutionalIntegrationWorkspaceForApplication(input: {
  app: LaunchpadApplicationRow;
  partnerId: string;
}): Promise<{ ok: true; workspace: InstitutionalIntegrationWorkspacePayload; sdk_snippet: string } | { ok: false; code: string }> {
  if (!isInstitutionalSandboxApplication(input.app)) {
    return { ok: false, code: "not_institutional_application" };
  }

  const sb = requireSupabaseAdmin();
  let productionKeyRevoked = false;
  if (input.app.production_api_key_id) {
    const { data: key } = await sb
      .from("partner_api_keys")
      .select("revoked_at")
      .eq("id", input.app.production_api_key_id)
      .maybeSingle();
    productionKeyRevoked = Boolean(key?.revoked_at);
  }

  const webhook = await getLaunchpadWebhookOverview({
    partnerId: input.partnerId,
    policyId: input.app.policy_id,
    policyVersion: input.app.policy_version,
    callbackConfigured: input.app.allowed_return_urls.some((url) => url.startsWith("https://")),
  });

  const events = await loadIntegrationEventsForApplication({
    partnerId: input.partnerId,
    applicationId: input.app.id,
  });

  const health = await buildIntegrationOperationalHealth({
    application: input.app,
    events,
    productionKeyRevoked,
    webhookConfigured: webhook.webhook_configured,
    webhookDegraded: webhook.delivery_failure_blocker,
  });

  const journeyLoad = await loadMerchantJourneyForApplication({
    application: input.app,
    partnerId: input.partnerId,
    activeSandboxKey: Boolean(input.app.api_key_id),
  });

  const activation = buildInstitutionalActivationEvidence({
    applicationCreatedAt: input.app.created_at,
    journey: journeyLoad.journey,
    health,
    activeSandboxKey: journeyLoad.input.activeSandboxKey,
    starterKitEvidenced: journeyLoad.input.starterKitEvidenced,
    callbackConfigured: callbackConfigured(input.app.allowed_return_urls),
  });

  const contractDoc = buildInstitutionalVerificationContractDocument();
  const trustUnavailable = {
    receipt_key_document_digest: null as string | null,
    receipt_key_environment: null as string | null,
    bootstrap_notice:
      "Trust contract unavailable in this deployment. Pin offline registry JSON and digest v2 material before authorizing decisions.",
  };
  const trust = isInstitutionalVerificationContractDocument(contractDoc)
    ? {
        receipt_key_document_digest: contractDoc.trust_material.receipt_key_document_digest,
        receipt_key_environment: contractDoc.trust_material.receipt_key_environment,
        bootstrap_notice: contractDoc.trust_material.bootstrap_notice,
      }
    : trustUnavailable;

  const downloadHref = `/api/launchpad/applications/${input.app.id}/institutional-verification-sdk/download`;
  const sdkRelease = buildInstitutionalSdkReleaseView({ downloadHref });

  const workspace = buildInstitutionalIntegrationWorkspace({
    app: input.app,
    sdkRelease,
    activation,
    trust,
    siteUrl: SITE_URL,
    launchpadHref: `${INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF}&application=${encodeURIComponent(input.app.id)}`,
  });

  return {
    ok: true,
    workspace,
    sdk_snippet: buildInstitutionalSdkVerificationSnippet(workspace.binding),
  };
}
