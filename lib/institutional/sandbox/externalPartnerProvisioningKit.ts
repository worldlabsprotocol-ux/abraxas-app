// External institutional developer sandbox provisioning — templates only, no credential issuance in CI.

import { INSTITUTIONAL_INTEGRATION_NOTICE } from "@/lib/institutional/integration/institutionalIntegrationContract";
import { SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID } from "@/lib/partner/sandboxInstitutionalProtocolAccess/contract";

export const EXTERNAL_SANDBOX_PROVISIONING_SCHEMA = "external_sandbox_provisioning_kit_v1" as const;

export type ExternalSandboxCredentialTemplate = {
  /** Placeholder — real keys issued via Launchpad / admin only. */
  api_key_format: "abx_live_* | abx_test_*";
  required_scope: "verify:requests";
  rotation_guidance: string;
  rate_limit_guidance: string;
};

export type ExternalSandboxProvisioningChecklist = {
  schema: typeof EXTERNAL_SANDBOX_PROVISIONING_SCHEMA;
  tenant_isolation: {
    rule: string;
    enforcement: string[];
  };
  steps: Array<{
    id: string;
    title: string;
    operator_surface: string;
    developer_receives: string[];
    least_privilege_notes: string[];
  }>;
  approved_sandbox_policies: string[];
  credential_template: ExternalSandboxCredentialTemplate;
  documentation_refs: string[];
  integration_notice: string;
};

export type ProvisioningInputValidation = {
  ok: boolean;
  errors: string[];
  sanitized: {
    partner_id: string | null;
    application_slug: string | null;
    policy_id: string | null;
    callback_url: string | null;
    webhook_url: string | null;
  };
};

const PARTNER_ID_RE = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;
const HTTPS_URL_RE = /^https:\/\/[^\s/$.?#].[^\s]*$/i;

export function validateExternalSandboxProvisioningInput(input: {
  partnerId?: string;
  applicationSlug?: string;
  policyId?: string;
  callbackUrl?: string;
  webhookUrl?: string;
  environment?: string;
}): ProvisioningInputValidation {
  const errors: string[] = [];
  const partner_id = input.partnerId?.trim() || null;
  const application_slug = input.applicationSlug?.trim() || null;
  const policy_id = input.policyId?.trim() || null;
  const callback_url = input.callbackUrl?.trim() || null;
  const webhook_url = input.webhookUrl?.trim() || null;
  const environment = input.environment?.trim() || "sandbox";

  if (!partner_id || !PARTNER_ID_RE.test(partner_id)) {
    errors.push("partner_id must be lowercase alphanumeric hyphen slug (3–64 chars).");
  }
  if (!application_slug || !PARTNER_ID_RE.test(application_slug)) {
    errors.push("application_slug must be lowercase alphanumeric hyphen slug.");
  }
  if (environment === "production") {
    errors.push("external sandbox provisioning cannot target production environment.");
  }
  if (policy_id && policy_id.includes("production") && policy_id !== SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID) {
    errors.push("policy_id appears production-scoped; use sandbox-reviewed policies only.");
  }
  if (callback_url && !HTTPS_URL_RE.test(callback_url)) {
    errors.push("callback_url must be HTTPS.");
  }
  if (webhook_url && !HTTPS_URL_RE.test(webhook_url)) {
    errors.push("webhook_url must be HTTPS.");
  }

  return {
    ok: errors.length === 0,
    errors,
    sanitized: { partner_id, application_slug, policy_id, callback_url, webhook_url },
  };
}

export function buildExternalSandboxProvisioningChecklist(): ExternalSandboxProvisioningChecklist {
  return {
    schema: EXTERNAL_SANDBOX_PROVISIONING_SCHEMA,
    tenant_isolation: {
      rule: "Each sandbox application receives credentials bound to one partner_id; cross-tenant consume attempts return partner_mismatch.",
      enforcement: [
        "API key scoped to verify:requests",
        "Optional launchpad application_id binding on consume",
        "Replay nonce scoped by partner + receipt + policy hash",
      ],
    },
    steps: [
      {
        id: "create_sandbox_app",
        title: "Create sandbox Launchpad application",
        operator_surface: "/developers/launchpad → sandbox application",
        developer_receives: ["application_id (slug)", "environment=sandbox label"],
        least_privilege_notes: ["Do not reuse production partner_id", "Separate webhook secret per app"],
      },
      {
        id: "issue_scoped_credential",
        title: "Issue scoped API credential",
        operator_surface: "Admin credential issuance (out of band)",
        developer_receives: ["Bearer abx_test_* key", "verify:requests scope only"],
        least_privilege_notes: ["Never commit keys", "Rotate on compromise; old keys revoked in admin"],
      },
      {
        id: "configure_callbacks",
        title: "Approve callback and webhook URLs",
        operator_surface: "Launchpad application settings",
        developer_receives: ["HTTPS callback URL allowlist entry", "webhook signing secret (shown once)"],
        least_privilege_notes: ["Reject open redirects", "Webhook HMAC required"],
      },
      {
        id: "select_policy",
        title: "Select sandbox policy version",
        operator_surface: "Partner Flow policy binding",
        developer_receives: ["policy_id", "policy_version", "user-facing disclosure text"],
        least_privilege_notes: [`Default institutional sandbox policy: ${SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID}`],
      },
      {
        id: "handoff_docs",
        title: "Deliver integration documentation",
        operator_surface: "docs/institutional/ENGINEERING_HANDOFF.md",
        developer_receives: ["OpenAPI", "Reference client", "Replay nonce rules", "Receipt verification steps"],
        least_privilege_notes: [INSTITUTIONAL_INTEGRATION_NOTICE],
      },
    ],
    approved_sandbox_policies: [
      SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
      "institutional-platform-age_21_retail-v1",
    ],
    credential_template: {
      api_key_format: "abx_live_* | abx_test_*",
      required_scope: "verify:requests",
      rotation_guidance: "Issue replacement key in admin, update server env, revoke prior key after cutover window.",
      rate_limit_guidance: "Sandbox: conservative defaults; contact operator before load tests.",
    },
    documentation_refs: [
      "docs/institutional/ENGINEERING_HANDOFF.md",
      "docs/institutional/institutional-integration.openapi.yaml",
      "docs/institutional/SANDBOX_ACTIVATION.md",
      "lib/institutional/integration/InstitutionalReferenceClient.ts",
    ],
    integration_notice: INSTITUTIONAL_INTEGRATION_NOTICE,
  };
}
