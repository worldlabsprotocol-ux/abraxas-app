declare const DECISION_RECEIPT_SCHEMA_V1_0: "1.0.0";
declare const DECISION_RECEIPT_SCHEMA_V1_1: "1.1.0";
declare const APPLICATION_BINDING_SCOPE_SCHEMA: "abraxas.application_binding_scope/v1";
declare const EVIDENCE_COMMITMENT_SCHEMA: "abraxas.evidence_commitment/v1";
/** Domain separation prefix for evidence commitment digests (UTF-8). */
declare const EVIDENCE_COMMITMENT_DOMAIN = "abraxas|decision_receipt|evidence_commitment|v1\0";

type EvidenceDependencyType = "reusable_fact" | "source_receipt" | "derived_from";
type EvidenceCommitmentEntryV1 = {
    dependency_type: EvidenceDependencyType;
    fact_id: string | null;
    source_credential_id: string | null;
};
type EvidenceCommitmentV1 = {
    schema: typeof EVIDENCE_COMMITMENT_SCHEMA;
    digest: string;
    entry_count: number;
};
/** Blinded ref for low-entropy identifiers at issuance (optional). Verifier receives manifest with blinded refs only. */
declare function blindEvidenceRef(material: string, blindingKey: Buffer | string): string;
declare function computeEvidenceCommitmentDigest(entries: EvidenceCommitmentEntryV1[]): string;
declare function buildEvidenceCommitment(entries: EvidenceCommitmentEntryV1[]): EvidenceCommitmentV1;
declare function verifyEvidenceCommitment(input: {
    commitment: EvidenceCommitmentV1 | null | undefined;
    manifest: EvidenceCommitmentEntryV1[] | null | undefined;
}): {
    ok: true;
} | {
    ok: false;
    reason: string;
};

declare const TRUST_ANCHOR_BUNDLE_DOCUMENT: "abraxas_trust_anchor_bundle";
declare const TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION: "1.0.0";
declare const ISSUER_AUTHORITY_STATEMENT_DOCUMENT: "abraxas_issuer_authority_statement";
declare const ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION: "1.0.0";
declare const RECEIPT_STATUS_EVIDENCE_DOCUMENT: "abraxas_receipt_status_evidence";
declare const RECEIPT_STATUS_EVIDENCE_SCHEMA_VERSION: "1.0.0";
type TrustAnchorBundleV1 = {
    document: typeof TRUST_ANCHOR_BUNDLE_DOCUMENT;
    schema_version: typeof TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION;
    anchor_key_id: string;
    public_jwk: JsonWebKey;
    /** SHA-256 hex of canonical public key material — must match computed fingerprint. */
    public_key_fingerprint: string;
    environment: "demo" | "production";
    effective_from: string;
    /** Integrator must obtain this document out-of-band; HTTPS fetch of SIAS does not establish the anchor. */
    distribution: "out_of_band" | "pinned_by_integrator";
    statement_cache_max_age_seconds: number;
    /** Max age for signed status statements (issued_at → verifier now). */
    status_statement_max_age_seconds: number;
    minimum_registry_version_hint: number | null;
};
type IssuerAuthorityKeyEntry = {
    key_id: string;
    environment: "demo" | "production";
    status: "active" | "retiring" | "retired" | "revoked";
    not_before: string;
    expires_at: string | null;
    public_jwk: JsonWebKey;
    schema_versions: string[];
    allow_historical_verification: boolean;
    historical_verify_until: string | null;
    reason_class: string;
};
type StatusSignerKeyEntry = {
    key_id: string;
    environment: "demo" | "production";
    status: "active" | "revoked";
    not_before: string;
    expires_at: string | null;
    public_jwk: JsonWebKey;
    reason_class: string;
};
type IssuerAuthorityStatementPayload = {
    document: typeof ISSUER_AUTHORITY_STATEMENT_DOCUMENT;
    schema_version: typeof ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION;
    registry_version: number;
    supersedes_registry_version: number | null;
    environment: "demo" | "production";
    issued_at: string;
    not_before: string;
    anchor_key_id: string;
    keys: IssuerAuthorityKeyEntry[];
    /** Authorized Ed25519 keys for signed receipt status statements (independent of HTTP status APIs). */
    status_signers?: StatusSignerKeyEntry[];
};
declare const RECEIPT_STATUS_STATEMENT_DOCUMENT: "abraxas_signed_receipt_status_statement";
declare const RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION: "1.0.0";
type ReceiptStatusStatementPayload = {
    document: typeof RECEIPT_STATUS_STATEMENT_DOCUMENT;
    schema_version: typeof RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION;
    receipt_id: string;
    /** Privacy-preserving status reference (receipt id only — no holder identifiers). */
    status_reference: string;
    partner_id: string;
    policy_id: string;
    policy_version: number;
    environment: "demo" | "production";
    status_version: number;
    supersedes_status_version: number | null;
    receipt_status: "active" | "revoked" | "expired";
    superseded: boolean;
    partner_operational: boolean;
    policy_active: boolean;
    claims_current: boolean;
    evidence_current: boolean;
    effective_at: string;
    issued_at: string;
    statement_expires_at: string;
    status_signer_key_id: string;
};
type SignedReceiptStatusStatement = {
    payload: ReceiptStatusStatementPayload;
    payload_hash: string;
    signature: string;
    status_signer_key_id: string;
};
type SignedIssuerAuthorityStatement = {
    payload: IssuerAuthorityStatementPayload;
    payload_hash: string;
    signature: string;
    anchor_key_id: string;
};
type EvaluatedClaimRef = {
    claim_id: string;
    claim_type: string;
    issuer_id?: string;
    status?: string;
    issued_at?: string;
    expires_at?: string | null;
};
type DecisionReceiptRecord = {
    id: string;
    verification_decision_id: string;
    consent_receipt_id: string | null;
    partner_id: string;
    policy_id: string;
    policy_version: number;
    subject_pseudonym_id: string;
    wallet_binding_ref: string | null;
    decision_result: "approved" | "denied" | "manual_review";
    reason_codes: string[];
    evaluated_claim_refs: EvaluatedClaimRef[];
    issuer_refs: string[];
    decision_context: "production" | "sandbox_only";
    evaluated_at: string;
    expires_at: string | null;
    revoked_at?: string | null;
    status: "active" | "expired" | "revoked";
    schema_version: string;
    payload_hash: string;
    signature: string;
    signing_key_id: string;
    application_binding_ref?: string | null;
    evidence_commitment?: EvidenceCommitmentV1 | null;
};
type ReceiptStatusEvidenceV1 = {
    document: typeof RECEIPT_STATUS_EVIDENCE_DOCUMENT;
    schema_version: typeof RECEIPT_STATUS_EVIDENCE_SCHEMA_VERSION;
    receipt_id: string;
    observed_at: string;
    receipt_status: "active" | "revoked" | "expired";
    superseded: boolean;
    partner_operational: boolean;
    policy_active: boolean;
    claims_current: boolean;
    evidence_current: boolean;
};
type RelyingPartyExpectations = {
    partner_id: string;
    policy_id: string;
    environment: "demo" | "production";
    /** When true, verification fails closed unless expected + signed application_binding_ref match (v1.1.0). */
    require_application_binding?: boolean;
    /** Expected opaque ref from authoritative onboarding — never read from the receipt. */
    application_binding_ref?: string;
    /** When true, verification fails closed unless receipt commitment matches manifest (v1.1.0). */
    require_evidence_commitment?: boolean;
    /** Manifest used to recompute evidence_commitment.digest (not proof of current validity). */
    evidence_commitment_manifest?: EvidenceCommitmentEntryV1[];
};

declare function normalizeDecisionReceiptTimestamp(value: string): string;
declare function canonicalizeJson(value: unknown): string;
declare function hashIssuerAuthorityPayload(payload: IssuerAuthorityStatementPayload): string;
/** Identity of who may sign and under which rules. Excludes version and issuance timestamps. */
declare function issuerAuthorityStateDigest(payload: Pick<IssuerAuthorityStatementPayload, "environment" | "anchor_key_id" | "keys" | "status_signers">): string;
/**
 * A downloaded receipt may repeat a version the relying party already trusts.
 * It cannot lower that retained version or install a new one by presenting a larger number.
 */
declare function retainedRegistryVersion(input: {
    retained?: number | null;
    offeredByBundle?: number | null;
}): number | undefined;
type DecisionReceiptCanonicalPayload = {
    schema_version: string;
    receipt_id: string;
    decision_id: string;
    policy_id: string;
    policy_version: number;
    partner_id: string;
    subject_pseudonym_id: string;
    wallet_binding_ref: string | null;
    consent_receipt_id: string | null;
    decision_result: DecisionReceiptRecord["decision_result"];
    reason_codes: string[];
    evaluated_claim_refs: EvaluatedClaimRefCanonical[];
    issuer_refs: string[];
    decision_context: DecisionReceiptRecord["decision_context"];
    evaluated_at: string;
    expires_at: string | null;
};
type EvaluatedClaimRefCanonical = {
    claim_id: string;
    claim_type: string;
    issuer_id?: string;
    status?: string;
    issued_at?: string;
    expires_at?: string | null;
};
declare function buildCanonicalPayloadFromRecord(record: DecisionReceiptRecord): DecisionReceiptCanonicalPayload;
declare function hashCanonicalPayload(payload: DecisionReceiptCanonicalPayload): string;

declare function publicEd25519JwkFingerprint(jwk: JsonWebKey): string | null;

declare function validateTrustAnchorBundle(bundle: TrustAnchorBundleV1): {
    ok: true;
} | {
    ok: false;
    reason: string;
};
/** Reject statements that try to substitute a different anchor than the integrator pinned. */
declare function assertStatementMatchesPinnedAnchor(input: {
    bundle: TrustAnchorBundleV1;
    statementAnchorKeyId: string;
}): {
    ok: true;
} | {
    ok: false;
    reason: string;
};

type IssuerResolveMode = "current_authorization" | "signature_verification";
declare function verifySignedIssuerAuthorityStatement(input: {
    statement: SignedIssuerAuthorityStatement;
    trustAnchorPublicJwk: JsonWebKey;
    minimumRegistryVersion?: number;
    /** Retained current authority version. A larger number in a statement is not a new trust root. */
    acceptedRegistryVersion?: number;
    /** Digest of the authority state the relying party already accepted for that version. */
    expectedAuthorityStateDigest?: string;
    now?: Date;
}): {
    ok: true;
} | {
    ok: false;
    reason: string;
};
declare function resolveIssuerKeyFromSignedStatement(input: {
    statement: SignedIssuerAuthorityStatement;
    trustAnchorPublicJwk: JsonWebKey;
    keyId: string;
    schemaVersion: string;
    environment: "demo" | "production";
    mode: IssuerResolveMode;
    now?: Date;
    minimumRegistryVersion?: number;
    acceptedRegistryVersion?: number;
    expectedAuthorityStateDigest?: string;
}): {
    ok: true;
    key: IssuerAuthorityKeyEntry;
    registry_version: number;
} | {
    ok: false;
    reason: string;
};
declare function signIssuerAuthorityPayloadForTests(input: {
    payload: IssuerAuthorityStatementPayload;
    anchorPrivateJwk: JsonWebKey;
}): SignedIssuerAuthorityStatement;

declare function verifyReceiptPayloadIntegrity(record: DecisionReceiptRecord): boolean;
declare function verifyReceiptSignatureWithPublicJwk(record: DecisionReceiptRecord, publicJwk: JsonWebKey): boolean;

type IndependentVerificationPhase = {
    id: string;
    status: "pass" | "fail" | "blocked" | "skipped";
    detail: string;
};
type IndependentVerificationResult = {
    contract_version: "abraxas_independent_verifier/1.1.0";
    cryptographically_authentic: boolean;
    issuer_currently_authorized: boolean;
    policy_and_audience_match: boolean;
    status_evidence_authentic: boolean;
    /** Never true from signature alone — requires authenticated signed status evidence. */
    currently_acceptable: "yes" | "no" | "indeterminate";
    phases: IndependentVerificationPhase[];
    failure_codes: string[];
    disclaimer: string;
};
declare function verifyAbraxasReceiptIndependently(input: {
    record: DecisionReceiptRecord;
    pinnedTrustAnchor: TrustAnchorBundleV1;
    signedIssuerAuthority: SignedIssuerAuthorityStatement;
    relyingParty: RelyingPartyExpectations;
    statementObservedAt?: string;
    /** Build #819 — required for current acceptability. */
    signedStatusStatement?: SignedReceiptStatusStatement | null;
    /** @deprecated Use signedStatusStatement */
    statusEvidence?: ReceiptStatusEvidenceV1 | null;
    minimumRegistryVersion?: number;
    /** Version the relying party has already accepted. Not taken from the downloaded bundle. */
    acceptedRegistryVersion?: number;
    expectedAuthorityStateDigest?: string;
    minimumStatusVersion?: number;
    now?: Date;
}): IndependentVerificationResult;

type IndependentEnforcementAction = "permit" | "deny" | "indeterminate";
/** Mandatory failures — must never yield permit. */
declare const MANDATORY_DENY_FAILURE_CODES: Set<string>;
/** Trust not established — permit is forbidden; action is indeterminate. */
declare const MANDATORY_INDETERMINATE_FAILURE_CODES: Set<string>;
declare function enforcementFromIndependentVerification(result: IndependentVerificationResult): {
    action: IndependentEnforcementAction;
    failure_codes: string[];
};

declare function hashReceiptStatusStatementPayload(payload: ReceiptStatusStatementPayload): string;
declare function verifySignedReceiptStatusStatement(input: {
    signedStatus: SignedReceiptStatusStatement;
    signedIssuerAuthority: SignedIssuerAuthorityStatement;
    minimumStatusVersion?: number;
    now?: Date;
}): {
    ok: true;
} | {
    ok: false;
    reason: string;
};
declare function signReceiptStatusStatement(input: {
    payload: ReceiptStatusStatementPayload;
    statusSignerPrivateJwk: JsonWebKey;
}): SignedReceiptStatusStatement;
/** @deprecated Use signReceiptStatusStatement */
declare const signReceiptStatusStatementForTests: typeof signReceiptStatusStatement;
declare function statusPayloadMatchesReceiptContext(input: {
    payload: ReceiptStatusStatementPayload;
    receiptId: string;
    partnerId: string;
    policyId: string;
    policyVersion: number;
    environment: "demo" | "production";
}): {
    ok: true;
} | {
    ok: false;
    reason: string;
};

declare function verifyEd25519Detached(input: {
    message: Uint8Array;
    signatureBase64Url: string;
    publicJwk: JsonWebKey;
}): boolean;

type ApplicationBindingScopeInput = {
    partner_id: string;
    policy_id: string;
    policy_version: number;
    decision_context: "production" | "sandbox_only";
    /** Authoritative Launchpad application id at issuance (never caller-supplied at verify time). */
    launchpad_application_id: string;
};
/** Issuer-side derivation. Scope secret is environment-scoped issuance material, not placed on receipts. */
declare function deriveApplicationBindingRef(scope: ApplicationBindingScopeInput, scopeSecret: Buffer | string): string;
declare function verifyApplicationBindingRef(input: {
    receiptRef: string | null | undefined;
    expectedRef: string;
}): {
    ok: true;
} | {
    ok: false;
    reason: string;
};

type DecisionReceiptCanonicalPayloadV1_1 = DecisionReceiptCanonicalPayload & {
    schema_version: typeof DECISION_RECEIPT_SCHEMA_V1_1;
    application_binding_ref: string | null;
    evidence_commitment: EvidenceCommitmentV1 | null;
};
declare function assertNoV11FieldsOnV10Record(record: Record<string, unknown>): boolean;
type DecisionReceiptRecordV1_1 = DecisionReceiptRecord & {
    application_binding_ref?: string | null;
    evidence_commitment?: EvidenceCommitmentV1 | null;
};
declare function buildCanonicalPayloadV1_1(record: DecisionReceiptRecordV1_1): DecisionReceiptCanonicalPayloadV1_1;
declare function hashCanonicalPayloadV1_1(payload: DecisionReceiptCanonicalPayloadV1_1): string;
/** Reject downgrade: v1.0.0 canonical must not include v1.1 fields on the wire record. */
declare function rejectSchemaDowngrade(record: Record<string, unknown>): boolean;

type VerificationRequirementResult = {
    status: "pass";
    detail: string;
} | {
    status: "fail";
    detail: string;
    code: string;
} | {
    status: "skipped";
    detail: string;
};
type ApplicationBindingPolicy = {
    require_application_binding?: boolean;
    application_binding_ref?: string;
};
type EvidenceCommitmentPolicy = {
    require_evidence_commitment?: boolean;
    evidence_commitment_manifest?: EvidenceCommitmentEntryV1[];
};
/** Relying party expected ref is never inferred from the receipt. */
declare function evaluateApplicationBindingRequirement(input: {
    record: DecisionReceiptRecord;
    policy: ApplicationBindingPolicy;
}): VerificationRequirementResult;
declare function evaluateEvidenceCommitmentRequirement(input: {
    record: DecisionReceiptRecord & {
        evidence_commitment?: EvidenceCommitmentV1 | null;
    };
    policy: EvidenceCommitmentPolicy;
}): VerificationRequirementResult;
declare function assessManifestReferencePrivacy(entries: EvidenceCommitmentEntryV1[]): VerificationRequirementResult;

export { APPLICATION_BINDING_SCOPE_SCHEMA, type ApplicationBindingPolicy, type ApplicationBindingScopeInput, DECISION_RECEIPT_SCHEMA_V1_0, DECISION_RECEIPT_SCHEMA_V1_1, type DecisionReceiptCanonicalPayload, type DecisionReceiptCanonicalPayloadV1_1, type DecisionReceiptRecord, type DecisionReceiptRecordV1_1, EVIDENCE_COMMITMENT_DOMAIN, EVIDENCE_COMMITMENT_SCHEMA, type EvaluatedClaimRef, type EvidenceCommitmentEntryV1, type EvidenceCommitmentPolicy, type EvidenceCommitmentV1, type EvidenceDependencyType, ISSUER_AUTHORITY_STATEMENT_DOCUMENT, ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION, type IndependentEnforcementAction, type IndependentVerificationPhase, type IndependentVerificationResult, type IssuerAuthorityKeyEntry, type IssuerAuthorityStatementPayload, type IssuerResolveMode, MANDATORY_DENY_FAILURE_CODES, MANDATORY_INDETERMINATE_FAILURE_CODES, RECEIPT_STATUS_EVIDENCE_DOCUMENT, RECEIPT_STATUS_EVIDENCE_SCHEMA_VERSION, RECEIPT_STATUS_STATEMENT_DOCUMENT, RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION, type ReceiptStatusEvidenceV1, type ReceiptStatusStatementPayload, type RelyingPartyExpectations, type SignedIssuerAuthorityStatement, type SignedReceiptStatusStatement, type StatusSignerKeyEntry, TRUST_ANCHOR_BUNDLE_DOCUMENT, TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION, type TrustAnchorBundleV1, type VerificationRequirementResult, assertNoV11FieldsOnV10Record, assertStatementMatchesPinnedAnchor, assessManifestReferencePrivacy, blindEvidenceRef, buildCanonicalPayloadFromRecord, buildCanonicalPayloadV1_1, buildEvidenceCommitment, canonicalizeJson, computeEvidenceCommitmentDigest, deriveApplicationBindingRef, enforcementFromIndependentVerification, evaluateApplicationBindingRequirement, evaluateEvidenceCommitmentRequirement, hashCanonicalPayload, hashCanonicalPayloadV1_1, hashIssuerAuthorityPayload, hashReceiptStatusStatementPayload, issuerAuthorityStateDigest, normalizeDecisionReceiptTimestamp, publicEd25519JwkFingerprint, rejectSchemaDowngrade, resolveIssuerKeyFromSignedStatement, retainedRegistryVersion, signIssuerAuthorityPayloadForTests, signReceiptStatusStatement, signReceiptStatusStatementForTests, statusPayloadMatchesReceiptContext, validateTrustAnchorBundle, verifyAbraxasReceiptIndependently, verifyApplicationBindingRef, verifyEd25519Detached, verifyEvidenceCommitment, verifyReceiptPayloadIntegrity, verifyReceiptSignatureWithPublicJwk, verifySignedIssuerAuthorityStatement, verifySignedReceiptStatusStatement };
