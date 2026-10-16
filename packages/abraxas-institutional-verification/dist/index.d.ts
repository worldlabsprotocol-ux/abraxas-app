import { ReceiptConsumptionStore } from './consumption.js';

declare const PORTABLE_REVOCATION_MEDIA_TYPE: "application/vnd.abraxas.portable-revocation-snapshot+json";
declare const PORTABLE_REVOCATION_SCHEMA_VERSION: "1.0.0";
type PortableRevocationStatusEntry = {
    /** SHA-256(issuer_id + receipt_id) — no holder pseudonym or wallet in feed. */
    status_id: string;
    state: "active" | "revoked";
    updated_at: string;
};
type PortableRevocationPayload = {
    schema_version: typeof PORTABLE_REVOCATION_SCHEMA_VERSION;
    issuer_id: string;
    signing_key_id: string;
    snapshot_sequence: number;
    issued_at: string;
    expires_at: string;
    max_freshness_seconds: number;
    /** Upper bound on age of each status_entries[].updated_at at verification time. */
    max_status_entry_age_seconds: number;
    /** SHA-256 of prior snapshot canonical payload; null for genesis. */
    previous_snapshot_hash: string | null;
    status_entries: PortableRevocationStatusEntry[];
};
/** RP-local high-water mark for a trusted revocation feed (no Abraxas API). */
type PortableRevocationCheckpoint = {
    revocation_issuer_id: string;
    highest_sequence: number;
    last_payload_hash: string;
    updated_at: string;
};
/** Out-of-band first trust — pins an exact signed snapshot; never implicit genesis. */
type PortableRevocationBootstrapTrust = {
    revocation_issuer_id: string;
    snapshot_sequence: number;
    trusted_payload_hash: string;
    snapshot_signing_key_id: string;
};
type PortableRevocationSignedArtifact = {
    media_type: typeof PORTABLE_REVOCATION_MEDIA_TYPE;
    payload: PortableRevocationPayload;
    payload_hash: string;
    signature: string;
};

type DecisionReceiptStatus = "active" | "expired" | "revoked";
type DecisionReceiptContext = "production" | "sandbox_only";
type DecisionReceiptResult = "approved" | "denied" | "manual_review";
/** Claim reference only — no raw claim_value or PII */
interface EvaluatedClaimRef {
    claim_id: string;
    claim_type: string;
    issuer_id: string;
    status: string;
    issued_at: string;
    expires_at: string | null;
}
interface DecisionReceiptRecord {
    id: string;
    verification_decision_id: string;
    consent_receipt_id: string | null;
    partner_id: string;
    policy_id: string;
    policy_version: number;
    subject_pseudonym_id: string;
    wallet_binding_ref: string | null;
    decision_result: DecisionReceiptResult;
    reason_codes: string[];
    evaluated_claim_refs: EvaluatedClaimRef[];
    issuer_refs: string[];
    decision_context: DecisionReceiptContext;
    evaluated_at: string;
    expires_at: string | null;
    revoked_at: string | null;
    status: DecisionReceiptStatus;
    schema_version: string;
    payload_hash: string;
    signature: string;
    signing_key_id: string;
    anchor_reference: string | null;
    idempotency_key: string | null;
    created_at: string;
}

type PortableRevocationIssuerBinding = {
    receipt_signing_key_id: string;
    revocation_issuer_id: string;
    snapshot_signing_key_ids: string[];
};
type PortableRevocationIssuerTrustPolicy = {
    bindings: PortableRevocationIssuerBinding[];
};

type PortableRevocationCheckpointContinuity = {
    previous_snapshot_hash: string | null;
    bootstrapped: boolean;
};
type CompareAndAdvanceCheckpointResult = {
    ok: true;
    advanced: boolean;
    checkpoint: PortableRevocationCheckpoint;
} | {
    ok: false;
    code: "rollback_rejected" | "hash_conflict_at_sequence" | "storage_unavailable" | "corrupt_checkpoint" | "checkpoint_unavailable" | "chain_continuity_break" | "bootstrap_bypass_rejected";
    checkpoint: PortableRevocationCheckpoint | null;
};

type PortableRevocationCheckpointCandidate = PortableRevocationCheckpoint & PortableRevocationCheckpointContinuity;
type CompareAndAdvanceCheckpointOptions = {
    /** When false, run continuity validation under lock but do not persist advances. Default true. */
    persist?: boolean;
};
interface PortableRevocationCheckpointStore {
    getCheckpoint(revocationIssuerId: string): Promise<PortableRevocationCheckpoint | null>;
    compareAndAdvanceCheckpoint(candidate: PortableRevocationCheckpointCandidate, options?: CompareAndAdvanceCheckpointOptions): Promise<CompareAndAdvanceCheckpointResult>;
}

interface PartnerFlowPublicReceipt {
    receipt_id?: string;
    schema_version?: string;
    partner_id?: string;
    policy_id?: string;
    decision_result?: string;
    signature_valid?: boolean;
    expires_at?: string | null;
    status?: string;
    production_usable?: boolean;
    decision_context?: string;
    artifact_type?: string;
    evaluated_claim_refs?: Array<{
        claim_id?: string;
        claim_type?: string;
        issuer_id?: string;
        status?: string;
        issued_at?: string;
        expires_at?: string | null;
    }>;
    currently_valid?: boolean;
    validity?: string;
    invalidation_reasons?: string[];
    issued_valid?: boolean;
    lifecycle_status?: string;
    partner_safe_reason?: string | null;
    validity_checked_at?: string;
}

type IndependentVerifierVerdict = "authorize" | "reject" | "blocked";
type RevocationSourceState = {
    available: true;
    status: "active" | "revoked" | "unknown";
} | {
    available: false;
    reason: "unavailable" | "rpc_failure";
};
interface IndependentVerifierExpectations {
    partnerId: string;
    policyId: string;
    allowSandbox?: boolean;
    audiencePartnerId?: string;
}
interface IndependentVerifierInput {
    /** Full signed record enables local Ed25519 + registry verification. */
    signedRecord?: DecisionReceiptRecord;
    /** Public/partner view — may rely on issuer-computed flags when record absent. */
    publicReceipt?: PartnerFlowPublicReceipt;
    expectations: IndependentVerifierExpectations;
    now?: Date;
    env?: Record<string, string | undefined>;
    revocationSource?: RevocationSourceState;
    /** Optional chain attestation package (EVM/Solana conformance vectors). */
    chainPackage?: unknown;
    chainRpcAvailable?: boolean;
}
interface IndependentVerifierPhase {
    id: string;
    status: "pass" | "fail" | "blocked" | "skipped";
    detail: string;
}
interface IndependentVerifierResult {
    verdict: IndependentVerifierVerdict;
    cryptographically_authentic: boolean;
    /** Never true from signature alone — requires freshness + revocation when mandated. */
    currently_authorizable: boolean;
    phases: IndependentVerifierPhase[];
    failure_codes: string[];
    checks_possible_offline: string[];
    checks_requiring_live_authority: string[];
    disclaimer: string;
}
declare function verifyReceiptIndependently(input: IndependentVerifierInput): IndependentVerifierResult;

interface ExternalRpDecisionAudit {
    request_id: string;
    receipt_id: string;
    at: string;
    outcome: "granted" | "denied" | "blocked";
    verifier: IndependentVerifierResult;
    /** Verifier authorize + currently_authorizable at decision time (before consumption). */
    authorization_verified: boolean;
    /** Durable wx marker (or in-memory slot) committed for this receipt. */
    durable_consumption_marker: boolean;
    /** Append-only audit line persisted (false if marker exists but audit append failed). */
    durable_audit_logged: boolean;
    consumption_recorded: boolean;
    replay_detected: boolean;
    audit_append_failed?: boolean;
    persistence_unavailable?: boolean;
    consumption_id?: string | null;
    replay_key_scope?: string;
    partner_visible: Record<string, string>;
}

declare const SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES: readonly ["raw_evidence", "biometric", "identity_profile", "wallet_material", "receipt_crypto", "oauth_session", "provider_payload", "raw_errors", "policy_internals"];

declare const HOLDER_POLICY_PRESENTATION_MEDIA_TYPE: "application/vnd.abraxas.policy-scoped-presentation+json";
declare const HOLDER_POLICY_PRESENTATION_SCHEMA_VERSION: "1.0.0";
type HolderPolicyScopedPresentation = {
    media_type: typeof HOLDER_POLICY_PRESENTATION_MEDIA_TYPE;
    schema_version: typeof HOLDER_POLICY_PRESENTATION_SCHEMA_VERSION;
    /** Full signed artifact the holder received from the issuer — no Abraxas fetch required at RP. */
    signed_decision_receipt: DecisionReceiptRecord;
    policy_id: string;
    policy_version: number;
    audience_partner_id: string;
    /** Claim identifiers disclosed for this presentation (metadata only). */
    disclosed_claim_refs: string[];
    /** Explicit negative guarantee for integrators. */
    excluded_data_classes: typeof SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES;
};

type ProofFirstVerificationOutcome = ExternalRpDecisionAudit & {
    abraxas_infrastructure_required: false;
    identity_database_required: false;
    retained_documents_required: false;
    offline_crypto_checks: string[];
    live_authority_checks: string[];
    presentation_binding_ok: boolean;
    presentation_binding_deny_codes?: string[];
    /** True when outcome was decided without mutating RP consumption state. */
    consumption_skipped_preflight_reject?: boolean;
    /** Build #564 — true when portable snapshot signature + freshness checks passed. */
    portable_revocation_authenticated?: boolean;
    portable_revocation_codes?: string[];
    /** True when caller tried to pass unsigned revocationSource without snapshot. */
    unsigned_revocation_hint_rejected?: boolean;
};

/** Public contract version for integrators. Bump on breaking verifier input/output changes. */
declare const INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION: "586.v1";
declare const INSTITUTIONAL_VERIFICATION_CONTRACT_ID: "abraxas_institutional_trust_verification";
type InstitutionalVerificationCapability = "receipt_signature_offline" | "issuer_key_registry_offline" | "policy_tenant_binding_offline" | "presentation_strict_binding_offline" | "portable_revocation_snapshot_offline" | "receipt_consumption_replay_guard" | "revocation_checkpoint_freshness" | "cross_application_policy_isolation";
type InstitutionalTrustEnvironment = "local" | "sandbox" | "production";
type RelyingPartyScope = {
    partner_id: string;
    policy_id: string;
    allow_sandbox?: boolean;
};
type InstitutionalVerifierRejectionReason = "trust_configuration_missing" | "trust_material_fetch_failed" | "trust_material_pin_mismatch" | "trust_material_inconsistent" | "payload_tampered" | "signature_invalid" | "issuer_untrusted" | "issuer_key_retired" | "tenant_partner_mismatch" | "tenant_policy_mismatch" | "audience_mismatch" | "presentation_binding_invalid" | "expired" | "revoked" | "revocation_unavailable" | "revocation_stale" | "portable_revocation_unsigned" | "replay_detected" | "authorization_denied" | "malformed_input" | "durable_store_required";
type InstitutionalVerificationVerdict = "valid" | "invalid" | "blocked";
type InstitutionalVerificationIntent = "authorize" | "inspect_only";
type InstitutionalReceiptVerificationResult = {
    contract_version: typeof INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION;
    verification_intent: InstitutionalVerificationIntent;
    verdict: InstitutionalVerificationVerdict;
    /** False for inspect_only — signature validity alone never grants access. */
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
type InstitutionalPresentationVerificationResult = {
    contract_version: typeof INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION;
    verification_intent: InstitutionalVerificationIntent;
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
type VerifySignedDecisionReceiptInput = {
    signed_record: DecisionReceiptRecord;
    relying_party: RelyingPartyScope;
    request_id: string;
    now?: Date;
    trust_env: Record<string, string | undefined>;
    /** Default authorize — requires durable consumption_store (or explicit test memory flag). */
    verification_intent?: InstitutionalVerificationIntent;
    revocation_source?: Parameters<typeof verifyReceiptIndependently>[0]["revocationSource"];
    enforce_single_use?: boolean;
    consumption_store?: ReceiptConsumptionStore;
    /** CI/fixtures only — production integrations must use filesystem/postgres stores. */
    allow_in_memory_consumption_for_tests?: boolean;
};
type VerifyHolderPresentationInput = {
    presentation: HolderPolicyScopedPresentation;
    relying_party: RelyingPartyScope;
    request_id: string;
    portable_revocation_snapshot: PortableRevocationSignedArtifact;
    now?: Date;
    trust_env: Record<string, string | undefined>;
    portable_revocation_issuer_trust: PortableRevocationIssuerTrustPolicy;
    portable_revocation_bootstrap_trusts?: PortableRevocationBootstrapTrust[];
    checkpoint_store: PortableRevocationCheckpointStore;
    verification_intent?: InstitutionalVerificationIntent;
    consumption_store?: ReceiptConsumptionStore;
    allow_in_memory_consumption_for_tests?: boolean;
    advance_revocation_checkpoint?: boolean;
};
type CrossApplicationVerificationInput = {
    presentation: HolderPolicyScopedPresentation;
    portable_revocation_snapshot: PortableRevocationSignedArtifact;
    authorized_scope: RelyingPartyScope;
    unauthorized_scope: RelyingPartyScope;
    request_id_prefix: string;
    now?: Date;
    trust_env: Record<string, string | undefined>;
    portable_revocation_issuer_trust: PortableRevocationIssuerTrustPolicy;
    portable_revocation_bootstrap_trusts?: PortableRevocationBootstrapTrust[];
    checkpoint_store: PortableRevocationCheckpointStore;
    consumption_store?: ReceiptConsumptionStore;
    allow_in_memory_consumption_for_tests?: boolean;
};
type CrossApplicationVerificationResult = {
    contract_version: typeof INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION;
    authorized_application: InstitutionalPresentationVerificationResult;
    other_application: InstitutionalPresentationVerificationResult;
    isolation_preserved: boolean;
};

declare const RECEIPT_VERIFICATION_KEY_ALGORITHM: "Ed25519";
declare const RECEIPT_VERIFICATION_KEY_DOCUMENT: "abraxas_receipt_verification_keys";
declare const RECEIPT_KEY_ENVIRONMENTS: readonly ["demo", "production"];
type ReceiptKeyEnvironment = (typeof RECEIPT_KEY_ENVIRONMENTS)[number];
declare const RECEIPT_KEY_STATUSES: readonly ["active", "retiring", "retired", "revoked"];
type ReceiptKeyStatus = (typeof RECEIPT_KEY_STATUSES)[number];
declare const RECEIPT_KEY_REASON_CLASSES: readonly ["active", "rotation", "superseded", "expired", "compromise", "operator", "schema_mismatch", "unavailable", "inconsistent"];
type ReceiptKeyReasonClass = (typeof RECEIPT_KEY_REASON_CLASSES)[number];
declare const RECEIPT_KEY_PARTNER_NOTICE = "Partners must re-fetch a current public receipt and honor revocation and currently_valid. Verifying a signature against this document is not a grant.";
interface ReceiptVerificationPublicJwk {
    kty: "OKP";
    crv: "Ed25519";
    x: string;
}
interface ReceiptVerificationKeyRecord {
    key_id: string;
    algorithm: typeof RECEIPT_VERIFICATION_KEY_ALGORITHM;
    environment: ReceiptKeyEnvironment;
    status: ReceiptKeyStatus;
    public_jwk: ReceiptVerificationPublicJwk;
    fingerprint: string;
    issuer_label: string;
    issued_at: string;
    not_before: string;
    expires_at: string | null;
    schema_versions: string[];
    reason_class: ReceiptKeyReasonClass;
    allow_historical_verification: boolean;
    historical_verify_until: string | null;
}
interface ReceiptVerificationPublicKeyView {
    key_id: string;
    algorithm: typeof RECEIPT_VERIFICATION_KEY_ALGORITHM;
    public_jwk: ReceiptVerificationPublicJwk;
    fingerprint: string;
    environment: ReceiptKeyEnvironment;
    status: ReceiptKeyStatus;
    issued_at: string;
    not_before: string;
    expires_at: string | null;
    issuer_label: string;
    schema_versions: string[];
    reason_class: ReceiptKeyReasonClass;
    allow_historical_verification: boolean;
    historical_verify_until: string | null;
}
interface ReceiptVerificationKeyDocument {
    document: typeof RECEIPT_VERIFICATION_KEY_DOCUMENT;
    algorithm: typeof RECEIPT_VERIFICATION_KEY_ALGORITHM;
    environment: ReceiptKeyEnvironment;
    schema_versions: string[];
    notice: typeof RECEIPT_KEY_PARTNER_NOTICE;
    keys: ReceiptVerificationPublicKeyView[];
}

/** Digest algorithm version — bumps invalidate prior institution pins (metadata now bound). */
declare const RECEIPT_TRUST_DIGEST_VERSION: 2;
type TrustMaterialFetchResult = {
    ok: true;
    document: ReceiptVerificationKeyDocument;
    digest: string;
    registry_env_value: string;
} | {
    ok: false;
    code: "fetch_failed" | "invalid_document" | "private_material_leak" | "pin_mismatch" | "fingerprint_mismatch" | "pin_required";
};
type InstitutionRegistryValidationResult = {
    ok: true;
    registry_env_value: string;
    digest: string;
    keys: ReceiptVerificationKeyRecord[];
} | {
    ok: false;
    code: "invalid_document" | "private_material_leak" | "fingerprint_mismatch" | "registry_inconsistent" | "registry_unavailable";
};
declare function digestReceiptVerificationTrustKeys(document: Pick<ReceiptVerificationKeyDocument, "document" | "algorithm" | "environment" | "schema_versions">, keys: ReceiptVerificationKeyRecord[]): string;
/** Validate institution-pinned offline registry JSON (no signing-key env fallback). */
declare function validateInstitutionReceiptVerificationRegistryJson(rawJson: string, environment?: ReceiptKeyEnvironment): InstitutionRegistryValidationResult;
declare function digestReceiptVerificationKeyDocument(document: ReceiptVerificationKeyDocument): string;
declare function validateFetchedReceiptKeyDocument(raw: unknown): ReceiptVerificationKeyDocument | null;
declare function fetchVerifiedReceiptKeyDocument(input: {
    originUrl: string;
    fetchFn?: typeof fetch;
    /** Required — network bootstrap is rejected without an institution-established digest pin. */
    pinnedDigest: string;
}): Promise<TrustMaterialFetchResult>;
type InstitutionalTrustEnvInput = {
    /** Institution-pinned registry JSON for ABRAXAS_RECEIPT_VERIFICATION_REGISTRY */
    receipt_verification_registry_json?: string;
    /** Network bootstrap — requires pinned_receipt_key_document_digest (mandatory pin). */
    trust_origin_url?: string;
    pinned_receipt_key_document_digest?: string;
    receipt_key_environment?: ReceiptKeyEnvironment;
    portable_revocation_issuer_trust_json?: string;
    portable_revocation_bootstrap_trusts_json?: string;
    extra_env?: Record<string, string | undefined>;
    fetchFn?: typeof fetch;
};
type InstitutionalTrustEnvFailureCode = "trust_configuration_missing" | "fetch_failed" | "invalid_document" | "private_material_leak" | "pin_mismatch" | "fingerprint_mismatch" | "pin_required" | "registry_inconsistent" | "registry_unavailable";
type InstitutionalTrustEnvResult = {
    ok: true;
    env: Record<string, string>;
    receipt_key_document_digest: string | null;
} | {
    ok: false;
    code: InstitutionalTrustEnvFailureCode;
};
/** Merge institution-controlled trust env. No ABRAXAS_SIGNING_KEY fallback. */
declare function resolveInstitutionalTrustEnv(input: InstitutionalTrustEnvInput): Promise<InstitutionalTrustEnvResult>;

declare const PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV = "ABRAXAS_PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS";
declare const PORTABLE_REVOCATION_ISSUER_TRUST_ENV = "ABRAXAS_PORTABLE_REVOCATION_ISSUER_TRUST";

type InstitutionalVerificationContractDocument = {
    contract: typeof INSTITUTIONAL_VERIFICATION_CONTRACT_ID;
    contract_version: typeof INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION;
    published_at: string;
    capabilities: InstitutionalVerificationCapability[];
    algorithms: {
        decision_receipt_signature: typeof RECEIPT_VERIFICATION_KEY_ALGORITHM;
        portable_revocation_snapshot: typeof RECEIPT_VERIFICATION_KEY_ALGORITHM;
    };
    trust_material: {
        receipt_verification_keys_path: "/api/receipts/verification-keys";
        well_known_path: "/.well-known/abraxas-trust/v1";
        receipt_key_document_digest: string | null;
        receipt_key_environment: string | null;
        bootstrap_notice: string;
        institution_env_keys: {
            receipt_registry: "ABRAXAS_RECEIPT_VERIFICATION_REGISTRY";
            portable_revocation_issuer_trust: typeof PORTABLE_REVOCATION_ISSUER_TRUST_ENV;
            portable_revocation_bootstrap_trusts: typeof PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV;
        };
    };
    integration: {
        module: "@/lib/institutionalVerification";
        example: "examples/institutional-verifier-backend/verify.ts";
        developer_ui: "/developers/institutional-verification" | "/developers/institutional-integration";
    };
    migration: {
        previous_contract_versions: ["584.v0", "569.v0"];
        breaking_change_policy: "contract_version bump when rejection reason codes or required trust inputs change";
    };
    limitations: string[];
};
declare function buildInstitutionalVerificationContractDocument(env?: Record<string, string | undefined>): InstitutionalVerificationContractDocument | {
    ok: false;
    status: "unavailable";
};

declare function inspectSignedDecisionReceipt(input: Omit<VerifySignedDecisionReceiptInput, "verification_intent" | "consumption_store" | "enforce_single_use">): Promise<InstitutionalReceiptVerificationResult>;
declare function verifySignedDecisionReceipt(input: VerifySignedDecisionReceiptInput): Promise<InstitutionalReceiptVerificationResult>;

declare function inspectHolderTrustPresentation(input: Omit<VerifyHolderPresentationInput, "verification_intent" | "consumption_store" | "allow_in_memory_consumption_for_tests">): Promise<InstitutionalPresentationVerificationResult>;
declare function verifyHolderTrustPresentation(input: VerifyHolderPresentationInput): Promise<InstitutionalPresentationVerificationResult>;

/**
 * Same holder presentation may authorize at one relying party scope and deny at another.
 * Preserves tenant isolation without exposing cross-institution policy context.
 */
declare function verifyCrossApplicationPresentation(input: CrossApplicationVerificationInput): Promise<CrossApplicationVerificationResult>;

declare function mapReceiptFailureCodes(underlying: IndependentVerifierResult): InstitutionalVerifierRejectionReason[];
declare function mapPresentationFailure(outcome: ProofFirstVerificationOutcome): InstitutionalVerifierRejectionReason[];
declare function receiptVerdictFromUnderlying(underlying: IndependentVerifierResult): "valid" | "invalid" | "blocked";
declare function presentationVerdictFromOutcome(outcome: ProofFirstVerificationOutcome): "valid" | "invalid" | "blocked";

declare const INSTITUTIONAL_REPLAY_SEMANTICS: string;
type ConsumptionStoreRequirement = {
    ok: true;
    store: ReceiptConsumptionStore;
} | {
    ok: false;
    code: "durable_store_required";
};
declare function requireConsumptionStoreForAuthorization(input: {
    consumption_store?: ReceiptConsumptionStore;
    /** CI/fixtures only — never in production integration paths. */
    allow_in_memory_consumption_for_tests?: boolean;
}): ConsumptionStoreRequirement;
declare function isDurableConsumptionStore(store: ReceiptConsumptionStore): boolean;

export { type CrossApplicationVerificationInput, type CrossApplicationVerificationResult, type DecisionReceiptRecord, INSTITUTIONAL_REPLAY_SEMANTICS, INSTITUTIONAL_VERIFICATION_CONTRACT_ID, INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION, type InstitutionRegistryValidationResult, type InstitutionalPresentationVerificationResult, type InstitutionalReceiptVerificationResult, type InstitutionalTrustEnvInput, type InstitutionalTrustEnvResult, type InstitutionalTrustEnvironment, type InstitutionalVerificationCapability, type InstitutionalVerificationContractDocument, type InstitutionalVerificationIntent, type InstitutionalVerificationVerdict, type InstitutionalVerifierRejectionReason, PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV, PORTABLE_REVOCATION_ISSUER_TRUST_ENV, RECEIPT_TRUST_DIGEST_VERSION, type RelyingPartyScope, type RevocationSourceState, type TrustMaterialFetchResult, type VerifyHolderPresentationInput, type VerifySignedDecisionReceiptInput, buildInstitutionalVerificationContractDocument, digestReceiptVerificationKeyDocument, digestReceiptVerificationTrustKeys, fetchVerifiedReceiptKeyDocument, inspectHolderTrustPresentation, inspectSignedDecisionReceipt, isDurableConsumptionStore, mapPresentationFailure, mapReceiptFailureCodes, presentationVerdictFromOutcome, receiptVerdictFromUnderlying, requireConsumptionStoreForAuthorization, resolveInstitutionalTrustEnv, validateFetchedReceiptKeyDocument, validateInstitutionReceiptVerificationRegistryJson, verifyCrossApplicationPresentation, verifyHolderTrustPresentation, verifySignedDecisionReceipt };
