// FILE: lib/partner/launchpad/institutionalFirstVerifiedOutcome.ts
// Partner-safe first verified decision receipt summary (Build #591).

import type { IntegrationOperationalHealth } from "@/lib/partner/integrationObservability/health";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { InstitutionalActivationEvidence } from "@/lib/partner/launchpad/institutionalActivationMilestones";

export const INSTITUTIONAL_FIRST_VERIFIED_OUTCOME_VERSION = "591.v1" as const;

export interface InstitutionalFirstVerifiedOutcomeView {
  contract_version: typeof INSTITUTIONAL_FIRST_VERIFIED_OUTCOME_VERSION;
  status: "none" | "success" | "failure";
  application: {
    application_id: string;
    display_name: string;
    public_slug: string;
    environment: string;
    partner_id: string;
  };
  policy: {
    policy_id: string | null;
    policy_version: number | null;
  };
  receipt_provenance: {
    receipt_id: string | null;
    request_id: string | null;
    last_event_at: string | null;
    source_event_type: string | null;
  };
  issuer_trust: {
    receipt_key_document_digest: string | null;
    trust_contract_href: string;
    well_known_href: string;
    offline_verifier_notice: string;
  };
  verification: {
    result: "authorized" | "rejected" | "pending" | "unknown";
    partner_safe_rejection: string | null;
    verification_successes: number;
    verification_failures: number;
    status_accuracy_notice: string;
  };
  freshness: {
    last_receipt_issued_at: string | null;
    last_receipt_verified_at: string | null;
    requirement_notice: string;
  };
  adoption: {
    time_to_first_independent_verify_ms: number | null;
    time_to_first_independent_verify_quality: "measured" | "unavailable";
  };
  production_authorization: {
    sandbox_only: boolean;
    next_action_href: string;
    detail: string;
  };
  reproduce_independently: {
    sdk_docs_href: string;
    external_consumer_example_href: string;
    record_verifier_href: string;
  };
}

const STATUS_NOTICE =
  "Integration telemetry reflects server-recorded verification outcomes. Cryptographic authorization requires your pinned SDK verifier — this panel does not replace independent verification.";

const FRESHNESS_NOTICE =
  "Honor receipt expiration, portable revocation checkpoints, and currently_valid semantics in your verifier. Integration events do not expose holder identity.";

function latestVerificationEvent(events: IntegrationEventRow[]): IntegrationEventRow | null {
  return (
    events.find(
      (event) =>
        event.event_type === "receipt_verification_succeeded"
        || event.event_type === "receipt_verification_failed",
    ) ?? null
  );
}

export function buildInstitutionalFirstVerifiedOutcomeView(input: {
  app: LaunchpadApplicationRow;
  health: IntegrationOperationalHealth;
  events: IntegrationEventRow[];
  activation: InstitutionalActivationEvidence | null;
  receiptKeyDocumentDigest: string | null;
}): InstitutionalFirstVerifiedOutcomeView {
  const verificationEvent = latestVerificationEvent(input.events);
  const succeeded = verificationEvent?.event_type === "receipt_verification_succeeded";
  const failed = verificationEvent?.event_type === "receipt_verification_failed";

  let status: InstitutionalFirstVerifiedOutcomeView["status"] = "none";
  if (succeeded) status = "success";
  else if (failed) status = "failure";

  let result: InstitutionalFirstVerifiedOutcomeView["verification"]["result"] = "pending";
  if (succeeded) result = "authorized";
  else if (failed) result = "rejected";
  else if (input.health.verification_attempts > 0) result = "unknown";

  const displayName = input.app.display_name || input.app.application_name;

  return {
    contract_version: INSTITUTIONAL_FIRST_VERIFIED_OUTCOME_VERSION,
    status,
    application: {
      application_id: input.app.id,
      display_name: displayName,
      public_slug: input.app.public_slug,
      environment: input.app.environment,
      partner_id: input.app.partner_id,
    },
    policy: {
      policy_id: verificationEvent?.policy_id ?? input.app.policy_id ?? null,
      policy_version: verificationEvent?.policy_version ?? input.app.policy_version ?? null,
    },
    receipt_provenance: {
      receipt_id: verificationEvent?.receipt_id ?? null,
      request_id: verificationEvent?.request_id ?? null,
      last_event_at: verificationEvent?.created_at ?? null,
      source_event_type: verificationEvent?.event_type ?? null,
    },
    issuer_trust: {
      receipt_key_document_digest: input.receiptKeyDocumentDigest,
      trust_contract_href: "/api/trust/verification-contract/v1",
      well_known_href: "/.well-known/abraxas-trust/v1",
      offline_verifier_notice:
        "Pin ABRAXAS_RECEIPT_VERIFICATION_REGISTRY and ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST on your infrastructure. The verifier does not use Abraxas Supabase as a trust root.",
    },
    verification: {
      result,
      partner_safe_rejection: verificationEvent?.partner_safe_reason ?? null,
      verification_successes: input.health.verification_successes,
      verification_failures: input.health.verification_failures,
      status_accuracy_notice: STATUS_NOTICE,
    },
    freshness: {
      last_receipt_issued_at: input.health.last_receipt_issued_at,
      last_receipt_verified_at: input.health.last_receipt_verified_at,
      requirement_notice: FRESHNESS_NOTICE,
    },
    adoption: {
      time_to_first_independent_verify_ms: input.activation?.time_to_first_independent_verify_ms ?? null,
      time_to_first_independent_verify_quality:
        input.activation?.time_to_first_independent_verify_quality ?? "unavailable",
    },
    production_authorization: {
      sandbox_only: input.app.environment !== "production",
      next_action_href: `/developers/launchpad?template=sandbox_institutional_protocol_access&application=${encodeURIComponent(input.app.id)}`,
      detail:
        "Sandbox institutional protocol access cannot authorize production receipts until operator provisioning and production access review complete.",
    },
    reproduce_independently: {
      sdk_docs_href: "/developers/institutional-verification",
      external_consumer_example_href: "/examples/external-sdk-consumer/README.md",
      record_verifier_href: "/verify?mode=receipt",
    },
  };
}
