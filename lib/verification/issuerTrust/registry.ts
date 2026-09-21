// FILE: lib/verification/issuerTrust/registry.ts
// Source-controlled issuer capability records. Browser cannot publish these.

import type { PolicyFitCategory, PolicyFitEnvironment } from "@/lib/partner/integrationStudio/policyFit/contract";
import type { PolicyRcDisclosure, PolicyRcMethod } from "@/lib/partner/policyReleaseCandidate/contract";
import type { AssuranceLevel } from "@/lib/credentials/claimSchema";
import {
  VERIFICATION_ISSUER_TRUST_DOCS,
  type IssuerIntegrationState,
  type IssuerSubjectBinding,
  type IssuerTrustStatus,
} from "./contract";

export interface VerificationIssuerRecord {
  issuer_key: string;
  record_version: number;
  label: string;
  method_category: PolicyRcMethod | "account_login" | "wallet_control";
  assurance_level: AssuranceLevel;
  result_categories: readonly (PolicyFitCategory | "organization_eligible" | "authorized_signer" | "jurisdiction_eligible" | "institutional_counterparty_eligible")[];
  subject_binding: IssuerSubjectBinding;
  environments: readonly PolicyFitEnvironment[];
  disclosure_boundary: PolicyRcDisclosure;
  status: IssuerTrustStatus;
  valid_from: string;
  valid_until: string | null;
  docs: typeof VERIFICATION_ISSUER_TRUST_DOCS | "/docs/reusable-eligibility" | "/docs/selective-disclosure" | "/docs/wallet-standard-binding" | "/docs/partner-flow" | "/docs/reclaim-private-attestations" | "/docs/organization-eligibility";
  integration: IssuerIntegrationState;
}

export function opaqueIssuerRef(issuerKey: string, recordVersion: number): string {
  const input = `verification-issuer:${issuerKey}:${recordVersion}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `vit_${(hash >>> 0).toString(16).padStart(8, "0")}${recordVersion.toString(16).padStart(4, "0")}`;
}

export const VERIFICATION_ISSUER_TRUST_RECORDS: readonly VerificationIssuerRecord[] = [
  {
    issuer_key: "abraxas.reusable_eligibility",
    record_version: 1,
    label: "Abraxas reusable eligibility",
    method_category: "reuse_existing_proof",
    assurance_level: "L2",
    result_categories: ["age_18", "age_21", "residency", "membership", "collector_redemption", "wallet_control"],
    subject_binding: "abraxas_account",
    environments: ["sandbox", "future_production"],
    disclosure_boundary: "result_only",
    status: "active",
    valid_from: "2026-01-01T00:00:00.000Z",
    valid_until: null,
    docs: "/docs/reusable-eligibility",
    integration: "integrated",
  },
  {
    issuer_key: "abraxas.verify_identity",
    record_version: 1,
    label: "Abraxas Verify identity and liveness",
    method_category: "identity_liveness",
    assurance_level: "L2",
    result_categories: ["identity_liveness", "age_18", "age_21", "membership"],
    subject_binding: "abraxas_account",
    environments: ["sandbox"],
    disclosure_boundary: "result_only",
    status: "active",
    valid_from: "2026-01-01T00:00:00.000Z",
    valid_until: null,
    docs: "/docs/selective-disclosure",
    integration: "integrated",
  },
  {
    issuer_key: "abraxas.verify_identity.production",
    record_version: 1,
    label: "Abraxas Verify for future Production review",
    method_category: "identity_liveness",
    assurance_level: "L2",
    result_categories: ["identity_liveness", "age_18", "age_21"],
    subject_binding: "abraxas_account",
    environments: ["future_production"],
    disclosure_boundary: "result_only",
    status: "review_required",
    valid_from: "2026-01-01T00:00:00.000Z",
    valid_until: null,
    docs: "/docs/selective-disclosure",
    integration: "integrated",
  },
  {
    issuer_key: "abraxas.wallet_control",
    record_version: 1,
    label: "Abraxas wallet-control binding",
    method_category: "wallet_control",
    assurance_level: "L1",
    result_categories: ["wallet_control"],
    subject_binding: "wallet_control",
    environments: ["sandbox", "future_production"],
    disclosure_boundary: "result_only",
    status: "active",
    valid_from: "2026-01-01T00:00:00.000Z",
    valid_until: null,
    docs: "/docs/wallet-standard-binding",
    integration: "integrated",
  },
  {
    issuer_key: "abraxas.partner_age_check",
    record_version: 1,
    label: "Partner-configured eligibility check",
    method_category: "partner_age_check",
    assurance_level: "L1",
    result_categories: ["age_18", "age_21", "sandbox_demo"],
    subject_binding: "abraxas_account",
    environments: ["sandbox"],
    disclosure_boundary: "result_only",
    status: "active",
    valid_from: "2026-01-01T00:00:00.000Z",
    valid_until: null,
    docs: "/docs/partner-flow",
    integration: "integrated",
  },
  {
    issuer_key: "abraxas.self_attestation",
    record_version: 1,
    label: "Self-attestation browse only",
    method_category: "self_attestation",
    assurance_level: "L0",
    result_categories: ["sandbox_demo"],
    subject_binding: "abraxas_account",
    environments: ["sandbox"],
    disclosure_boundary: "result_only",
    status: "active",
    valid_from: "2026-01-01T00:00:00.000Z",
    valid_until: null,
    docs: "/docs/partner-flow",
    integration: "integrated",
  },
  {
    issuer_key: "abraxas.google_account",
    record_version: 1,
    label: "Google account session",
    method_category: "account_login",
    assurance_level: "L0",
    result_categories: ["sandbox_demo"],
    subject_binding: "session_only",
    environments: ["sandbox", "future_production"],
    disclosure_boundary: "result_only",
    status: "disabled",
    valid_from: "2026-01-01T00:00:00.000Z",
    valid_until: null,
    docs: "/docs/partner-flow",
    integration: "integrated",
  },
  {
    issuer_key: "abraxas.organization_eligibility",
    record_version: 1,
    label: "Abraxas organization eligibility",
    method_category: "privacy_preserving",
    assurance_level: "L2",
    result_categories: [
      "organization_eligible",
      "authorized_signer",
      "jurisdiction_eligible",
      "institutional_counterparty_eligible",
    ],
    subject_binding: "abraxas_account",
    environments: ["sandbox"],
    disclosure_boundary: "result_only",
    status: "active",
    valid_from: "2026-01-01T00:00:00.000Z",
    valid_until: null,
    docs: "/docs/organization-eligibility",
    integration: "integrated",
  },
  {
    issuer_key: "reclaim.privacy_preserving",
    record_version: 1,
    label: "Privacy-preserving provider path",
    method_category: "privacy_preserving",
    assurance_level: "L1",
    result_categories: ["age_18", "age_21"],
    subject_binding: "abraxas_account",
    environments: ["sandbox"],
    disclosure_boundary: "result_only",
    status: "review_required",
    valid_from: "2026-01-01T00:00:00.000Z",
    valid_until: null,
    docs: "/docs/reclaim-private-attestations",
    integration: "planned",
  },
  {
    issuer_key: "legacy.veriff",
    record_version: 1,
    label: "Legacy automated IDV",
    method_category: "identity_liveness",
    assurance_level: "L2",
    result_categories: ["identity_liveness"],
    subject_binding: "abraxas_account",
    environments: ["sandbox"],
    disclosure_boundary: "result_only",
    status: "retiring",
    valid_from: "2024-01-01T00:00:00.000Z",
    valid_until: null,
    docs: VERIFICATION_ISSUER_TRUST_DOCS,
    integration: "planned",
  },
  {
    issuer_key: "fixture.expired",
    record_version: 1,
    label: "Expired fixture issuer",
    method_category: "privacy_preserving",
    assurance_level: "L3",
    result_categories: ["age_21"],
    subject_binding: "abraxas_account",
    environments: ["sandbox", "future_production"],
    disclosure_boundary: "result_only",
    status: "active",
    valid_from: "2020-01-01T00:00:00.000Z",
    valid_until: "2020-12-31T00:00:00.000Z",
    docs: VERIFICATION_ISSUER_TRUST_DOCS,
    integration: "planned",
  },
  {
    issuer_key: "fixture.disabled",
    record_version: 1,
    label: "Disabled fixture issuer",
    method_category: "privacy_preserving",
    assurance_level: "L3",
    result_categories: ["age_21"],
    subject_binding: "abraxas_account",
    environments: ["future_production"],
    disclosure_boundary: "result_only",
    status: "disabled",
    valid_from: "2026-01-01T00:00:00.000Z",
    valid_until: null,
    docs: VERIFICATION_ISSUER_TRUST_DOCS,
    integration: "planned",
  },
];
