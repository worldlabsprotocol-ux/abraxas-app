// FILE: lib/partner/externalActivation/configSummary.ts
// Machine-derived integration summary from backend application state.

import { buildPolicyPresentationFromTemplateId } from "@/lib/partner/launchpad/policyPresentation";
import { callbackConfigured } from "@/lib/partner/launchpad/journeyState";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { DeveloperIntegrationSummary } from "./contract";

export function buildDeveloperIntegrationSummary(input: {
  application: LaunchpadApplicationRow;
  activeSandboxKey: boolean;
  keyPrefix?: string | null;
}): DeveloperIntegrationSummary {
  const app = input.application;
  const presentation = buildPolicyPresentationFromTemplateId(app.policy_template_id);
  const callback = app.allowed_return_urls[0] ?? null;

  let credentialStatus: DeveloperIntegrationSummary["credential_status"] = "never_issued";
  if (app.api_key_id && input.activeSandboxKey) credentialStatus = "active";

  const expectedNarrow: string[] = ["decision", "result_family", "receipt_id", "policy_id", "partner_id"];
  if (presentation?.disclosed_result.startsWith("age_eligible")) {
    expectedNarrow.push("over_21");
  }
  if (app.policy_template_id.includes("content") || app.policy_template_id.includes("provenance")) {
    expectedNarrow.push("provenance.creator_attested", "provenance.source_integrity_verified");
  }

  return {
    application_id: app.id,
    application_name: app.display_name || app.application_name,
    partner_id: app.partner_id,
    public_slug: app.public_slug,
    policy_pack_id: app.policy_template_id,
    policy_label: presentation?.title ?? app.policy_template_id.replace(/_/g, " "),
    policy_id: app.policy_id,
    policy_version: app.policy_version,
    environment: "sandbox",
    callback_url: callback,
    callback_configured: callbackConfigured(app.allowed_return_urls),
    application_id_field: app.id,
    credential_status: credentialStatus,
    credential_prefix: input.keyPrefix ?? null,
    integration_method: "verify_with_abraxas",
    result_family: presentation?.disclosed_result ?? "policy_result",
    expected_narrow_fields: expectedNarrow,
    withheld_fields: presentation?.withheld ?? [],
  };
}
