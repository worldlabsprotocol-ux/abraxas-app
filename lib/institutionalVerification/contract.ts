// FILE: lib/institutionalVerification/contract.ts
// Build #586 — stable institutional trust verification contract (types + versioning).

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { IndependentVerifierResult } from "@/lib/institutionalCertification/build546/independentVerifier";
import type { ProofFirstVerificationOutcome } from "@/lib/protocol/proofFirst/proofFirstRelyingParty";
import type { HolderPolicyScopedPresentation } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";

/** Public contract version for integrators. Bump on breaking verifier input/output changes. */
export const INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION = "586.v1" as const;

export const INSTITUTIONAL_VERIFICATION_CONTRACT_ID = "abraxas_institutional_trust_verification" as const;

export type InstitutionalVerificationCapability =
  | "receipt_signature_offline"
  | "issuer_key_registry_offline"
  | "policy_tenant_binding_offline"
  | "presentation_strict_binding_offline"
  | "portable_revocation_snapshot_offline"
  | "receipt_consumption_replay_guard"
  | "revocation_checkpoint_freshness"
  | "cross_application_policy_isolation";

export type InstitutionalTrustEnvironment = "local" | "sandbox" | "production";

export type RelyingPartyScope = {
  partner_id: string;
  policy_id: string;
  allow_sandbox?: boolean;
};

export type InstitutionalVerifierRejectionReason =
  | "trust_configuration_missing"
  | "trust_material_fetch_failed"
  | "trust_material_pin_mismatch"
  | "trust_material_inconsistent"
  | "payload_tampered"
  | "signature_invalid"
  | "issuer_untrusted"
  | "issuer_key_retired"
  | "tenant_partner_mismatch"
  | "tenant_policy_mismatch"
  | "audience_mismatch"
  | "presentation_binding_invalid"
  | "expired"
  | "revoked"
  | "revocation_unavailable"
  | "revocation_stale"
  | "portable_revocation_unsigned"
  | "replay_detected"
  | "authorization_denied"
  | "malformed_input"
  | "durable_store_required";

export type InstitutionalVerificationVerdict = "valid" | "invalid" | "blocked";

export type InstitutionalReceiptVerificationResult = {
  contract_version: typeof INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION;
  verdict: InstitutionalVerificationVerdict;
  authorize: boolean;
  /** Explicit, partner-safe codes mapped from underlying verifier phases. */
  rejection_reasons: InstitutionalVerifierRejectionReason[];
  detail_codes: string[];
  offline_checks_completed: string[];
  live_checks_required: string[];
  identity_database_required: false;
  abraxas_database_trust_root_required: false;
  underlying: IndependentVerifierResult;
};

export type InstitutionalPresentationVerificationResult = {
  contract_version: typeof INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION;
  verdict: InstitutionalVerificationVerdict;
  authorize: boolean;
  rejection_reasons: InstitutionalVerifierRejectionReason[];
  detail_codes: string[];
  offline_checks_completed: string[];
  live_checks_required: string[];
  identity_database_required: false;
  abraxas_database_trust_root_required: false;
  replay_detected: boolean;
  portable_revocation_authenticated: boolean;
  underlying: ProofFirstVerificationOutcome;
};

export type VerifySignedDecisionReceiptInput = {
  signed_record: DecisionReceiptRecord;
  relying_party: RelyingPartyScope;
  request_id: string;
  now?: Date;
  trust_env: Record<string, string | undefined>;
  revocation_source?: Parameters<
    typeof import("@/lib/institutionalCertification/build546/independentVerifier").verifyReceiptIndependently
  >[0]["revocationSource"];
  enforce_single_use?: boolean;
  consumption_store?: import("@/lib/institutionalCertification/build547/receiptConsumptionStore").ReceiptConsumptionStore;
};

export type VerifyHolderPresentationInput = {
  presentation: HolderPolicyScopedPresentation;
  relying_party: RelyingPartyScope;
  request_id: string;
  portable_revocation_snapshot: PortableRevocationSignedArtifact;
  now?: Date;
  trust_env: Record<string, string | undefined>;
  portable_revocation_issuer_trust: import("@/lib/protocol/portableRevocation").PortableRevocationIssuerTrustPolicy;
  portable_revocation_bootstrap_trusts?: import("@/lib/protocol/portableRevocation").PortableRevocationBootstrapTrust[];
  checkpoint_store: import("@/lib/protocol/portableRevocation").PortableRevocationCheckpointStore;
  consumption_store?: import("@/lib/institutionalCertification/build547/receiptConsumptionStore").ReceiptConsumptionStore;
  advance_revocation_checkpoint?: boolean;
};

export type CrossApplicationVerificationInput = {
  presentation: HolderPolicyScopedPresentation;
  portable_revocation_snapshot: PortableRevocationSignedArtifact;
  authorized_scope: RelyingPartyScope;
  unauthorized_scope: RelyingPartyScope;
  request_id_prefix: string;
  now?: Date;
  trust_env: Record<string, string | undefined>;
  portable_revocation_issuer_trust: import("@/lib/protocol/portableRevocation").PortableRevocationIssuerTrustPolicy;
  portable_revocation_bootstrap_trusts?: import("@/lib/protocol/portableRevocation").PortableRevocationBootstrapTrust[];
  checkpoint_store: import("@/lib/protocol/portableRevocation").PortableRevocationCheckpointStore;
  consumption_store?: import("@/lib/institutionalCertification/build547/receiptConsumptionStore").ReceiptConsumptionStore;
};

export type CrossApplicationVerificationResult = {
  contract_version: typeof INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION;
  authorized_application: InstitutionalPresentationVerificationResult;
  other_application: InstitutionalPresentationVerificationResult;
  isolation_preserved: boolean;
};
