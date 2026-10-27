// FILE: lib/partner/integrationKit/standalonePortableOutcome.ts
// Map offline portable verification to explicit permit / deny / indeterminate enforcement.

import {
  MANDATORY_DENY_FAILURE_CODES,
  type IndependentVerificationResult,
} from "@abraxas/independent-verifier";
import type { PartnerIntegrationOutcome } from "@/lib/partner/integrationKit/contract";
import { outcomeFromValidationErrors } from "@/lib/partner/integrationKit/outcomes";

export type StandalonePortableAction = "permit" | "deny" | "indeterminate";

export type StandalonePortableEnforcement = {
  action: StandalonePortableAction;
  outcome: PartnerIntegrationOutcome;
  /** True only when action is permit. Never true for indeterminate. */
  permit_protocol_action: boolean;
  cryptographically_authentic: boolean | null;
  status_evidence_authentic: boolean | null;
  policy_and_audience_match: boolean | null;
  currently_acceptable: "yes" | "no" | "indeterminate";
  failure_codes: string[];
  partner_safe_diagnostics: string[];
  /** Verification did not call Abraxas API or database (offline path only). */
  verified_offline: true;
};

const INDETERMINATE_CODES = new Set([
  "integrator_trust_anchor_pin_required",
  "portable_verification_fetch_failed",
  "portable_verification_unavailable",
  "portable_verification_malformed",
  "issuer_export_not_configured",
  "retry",
  "status_evidence_stale",
  "status_statement_expired",
  "unsigned_status_evidence_rejected",
  "authoritative_validity_store_unavailable",
  "bundled_trust_anchor_not_authenticated",
  "anchor_fingerprint_mismatch",
]);

function partnerSafeDiagnostics(codes: string[]): string[] {
  return Array.from(new Set(codes.filter((c) => !c.includes("jwk") && !c.includes("private"))));
}

export function classifyStandalonePortableVerification(input: {
  fetchErrors?: string[];
  pinConfigured: boolean;
  verification?: IndependentVerificationResult;
}): StandalonePortableEnforcement {
  if (input.fetchErrors?.length) {
    const failure_codes = input.fetchErrors;
    return {
      action: "indeterminate",
      outcome: outcomeFromValidationErrors(failure_codes),
      permit_protocol_action: false,
      cryptographically_authentic: null,
      status_evidence_authentic: null,
      policy_and_audience_match: null,
      currently_acceptable: "indeterminate",
      failure_codes,
      partner_safe_diagnostics: partnerSafeDiagnostics(failure_codes),
      verified_offline: true,
    };
  }

  if (!input.pinConfigured) {
    const failure_codes = ["integrator_trust_anchor_pin_required"];
    return {
      action: "indeterminate",
      outcome: "invalid",
      permit_protocol_action: false,
      cryptographically_authentic: null,
      status_evidence_authentic: null,
      policy_and_audience_match: null,
      currently_acceptable: "indeterminate",
      failure_codes,
      partner_safe_diagnostics: failure_codes,
      verified_offline: true,
    };
  }

  const v = input.verification!;
  const failure_codes = v.failure_codes;

  if (failure_codes.some((code) => MANDATORY_DENY_FAILURE_CODES.has(code))) {
    return {
      action: "deny",
      outcome: outcomeFromValidationErrors(failure_codes),
      permit_protocol_action: false,
      cryptographically_authentic: v.cryptographically_authentic,
      status_evidence_authentic: v.status_evidence_authentic,
      policy_and_audience_match: v.policy_and_audience_match,
      currently_acceptable: v.currently_acceptable === "yes" ? "no" : v.currently_acceptable,
      failure_codes,
      partner_safe_diagnostics: partnerSafeDiagnostics(failure_codes),
      verified_offline: true,
    };
  }

  if (v.currently_acceptable === "indeterminate") {
    return {
      action: "indeterminate",
      outcome: outcomeFromValidationErrors(failure_codes.length ? failure_codes : ["invalid"]),
      permit_protocol_action: false,
      cryptographically_authentic: v.cryptographically_authentic,
      status_evidence_authentic: v.status_evidence_authentic,
      policy_and_audience_match: v.policy_and_audience_match,
      currently_acceptable: "indeterminate",
      failure_codes,
      partner_safe_diagnostics: partnerSafeDiagnostics(failure_codes),
      verified_offline: true,
    };
  }

  const trustNotEstablished =
    !v.cryptographically_authentic
    || !v.status_evidence_authentic
    || failure_codes.some((code) => INDETERMINATE_CODES.has(code));

  if (trustNotEstablished) {
    return {
      action: "indeterminate",
      outcome: outcomeFromValidationErrors(failure_codes.length ? failure_codes : ["invalid_signature"]),
      permit_protocol_action: false,
      cryptographically_authentic: v.cryptographically_authentic,
      status_evidence_authentic: v.status_evidence_authentic,
      policy_and_audience_match: v.policy_and_audience_match,
      currently_acceptable: v.currently_acceptable,
      failure_codes,
      partner_safe_diagnostics: partnerSafeDiagnostics(failure_codes),
      verified_offline: true,
    };
  }

  if (v.currently_acceptable === "yes") {
    return {
      action: "permit",
      outcome: "permitted",
      permit_protocol_action: true,
      cryptographically_authentic: true,
      status_evidence_authentic: true,
      policy_and_audience_match: v.policy_and_audience_match,
      currently_acceptable: "yes",
      failure_codes,
      partner_safe_diagnostics: [],
      verified_offline: true,
    };
  }

  return {
    action: "deny",
    outcome: outcomeFromValidationErrors(failure_codes.length ? failure_codes : ["invalid"]),
    permit_protocol_action: false,
    cryptographically_authentic: v.cryptographically_authentic,
    status_evidence_authentic: v.status_evidence_authentic,
    policy_and_audience_match: v.policy_and_audience_match,
    currently_acceptable: "no",
    failure_codes,
    partner_safe_diagnostics: partnerSafeDiagnostics(failure_codes),
    verified_offline: true,
  };
}
