// FILE: lib/partner/launchpad/integrationDocs.ts
// Integration instructions generated from a configured application.

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { resolveLaunchpadPolicyTemplate } from "@/lib/partner/launchpad/policyCatalog";
import { SITE_URL } from "@/lib/siteUrl";
import {
  CONFORMANCE_COMMAND_EXAMPLE,
  expressHandlerExample,
  genericTypescriptExample,
  nextjsRouteHandlerExample,
} from "@/lib/partner/integrationKit";

export interface LaunchpadIntegrationDocs {
  hosted_link: string;
  javascript_example: string;
  typescript_verification_example: string;
  kit_express_example: string;
  kit_generic_example: string;
  conformance_command: string;
  curl_verification_example: string;
  callback_example: string;
  receipt_fields: Array<{ field: string; description: string }>;
  error_codes: Array<{ code: string; description: string }>;
  sandbox_testing: string[];
  production_checklist: string[];
}

export function buildLaunchpadIntegrationDocs(
  app: LaunchpadApplicationRow,
  keyPrefix: string | null,
): LaunchpadIntegrationDocs {
  const template = resolveLaunchpadPolicyTemplate(app.policy_template_id);
  const returnUrl = app.allowed_return_urls[0] ?? "https://localhost:3000/callback";
  const hostedLink = `${SITE_URL}/partner/verify?app=${encodeURIComponent(app.public_slug)}&return_url=${encodeURIComponent(returnUrl)}`;

  return {
    hosted_link: hostedLink,
    javascript_example: `// Redirect the visitor to the hosted Abraxas verification experience
const verifyUrl = new URL("${SITE_URL}/partner/verify");
verifyUrl.searchParams.set("app", "${app.public_slug}");
verifyUrl.searchParams.set("return_url", "${returnUrl}");
window.location.assign(verifyUrl.toString());`,
    typescript_verification_example: nextjsRouteHandlerExample({
      partnerId: app.partner_id,
      policyId: app.policy_id,
      environment: "sandbox",
    }),
    kit_express_example: expressHandlerExample({
      partnerId: app.partner_id,
      policyId: app.policy_id,
      environment: "sandbox",
    }),
    kit_generic_example: genericTypescriptExample({
      partnerId: app.partner_id,
      policyId: app.policy_id,
      environment: "sandbox",
    }),
    conformance_command: CONFORMANCE_COMMAND_EXAMPLE,
    curl_verification_example: `curl -sS \\
  -H "Authorization: Bearer abx_test_YOUR_KEY" \\
  "${SITE_URL}/api/v1/receipts/RECEIPT_ID"`,
    callback_example: `${returnUrl}?receipt_id=RECEIPT_ID&decision=approved`,
    receipt_fields: [
      { field: "receipt_id", description: "Unique receipt identifier" },
      { field: "partner_id", description: "Partner workspace identifier" },
      { field: "policy_id", description: "Evaluated policy identifier" },
      { field: "policy_version", description: "Immutable policy version" },
      { field: "decision_result", description: "approved or denied" },
      { field: "expires_at", description: "Receipt expiration timestamp" },
      { field: "signature", description: "Server signed payload" },
    ],
    error_codes: [
      { code: "launchpad_return_url_rejected", description: "Return URL is not on the approved list" },
      { code: "launchpad_application_not_found", description: "Application slug is invalid or suspended" },
      { code: "receipt_expired", description: "Receipt is past expiration" },
      { code: "audience_mismatch", description: "Receipt audience does not match verifier" },
      { code: "environment_mismatch", description: "Sandbox receipt used in production verification" },
    ],
    sandbox_testing: [
      "Use the Partner Launchpad test harness to evaluate approved, denied, expired, revoked, wrong partner, wrong policy, replay, sandbox not production, and no PII outcomes against signed receipts.",
      `Sandbox key prefix: ${keyPrefix ?? "abx_test_…"}`,
      `Policy pack: ${template?.label ?? app.policy_template_id}`,
      "Sandbox receipts are labeled and rejected by production verification endpoints.",
      "Google sign-in creates an account. It does not prove the selected pack.",
      "Send a labeled TEST EVENT from Partner Event Delivery after the webhook endpoint is enabled.",
    ],
    production_checklist: [
      "Complete every Partner Launchpad harness outcome for this application.",
      "Add an approved HTTPS production return URL.",
      "Publish the exact DNS TXT challenge and let Launchpad verify domain control.",
      "Activate production automatically and reveal the one-time production API key.",
      "Verify receipts server side before granting access.",
      "If you enable Partner Event Delivery, verify webhook signatures and still fetch the public receipt before granting access.",
    ],
  };
}
