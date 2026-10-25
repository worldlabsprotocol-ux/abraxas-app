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
};

declare function normalizeDecisionReceiptTimestamp(value: string): string;
declare function canonicalizeJson(value: unknown): string;
declare function hashIssuerAuthorityPayload(payload: IssuerAuthorityStatementPayload): string;
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
    minimumStatusVersion?: number;
    now?: Date;
}): IndependentVerificationResult;

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

export { type DecisionReceiptCanonicalPayload, type DecisionReceiptRecord, type EvaluatedClaimRef, ISSUER_AUTHORITY_STATEMENT_DOCUMENT, ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION, type IndependentVerificationPhase, type IndependentVerificationResult, type IssuerAuthorityKeyEntry, type IssuerAuthorityStatementPayload, type IssuerResolveMode, RECEIPT_STATUS_EVIDENCE_DOCUMENT, RECEIPT_STATUS_EVIDENCE_SCHEMA_VERSION, RECEIPT_STATUS_STATEMENT_DOCUMENT, RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION, type ReceiptStatusEvidenceV1, type ReceiptStatusStatementPayload, type RelyingPartyExpectations, type SignedIssuerAuthorityStatement, type SignedReceiptStatusStatement, type StatusSignerKeyEntry, TRUST_ANCHOR_BUNDLE_DOCUMENT, TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION, type TrustAnchorBundleV1, assertStatementMatchesPinnedAnchor, buildCanonicalPayloadFromRecord, canonicalizeJson, hashCanonicalPayload, hashIssuerAuthorityPayload, hashReceiptStatusStatementPayload, normalizeDecisionReceiptTimestamp, publicEd25519JwkFingerprint, resolveIssuerKeyFromSignedStatement, signIssuerAuthorityPayloadForTests, signReceiptStatusStatement, signReceiptStatusStatementForTests, statusPayloadMatchesReceiptContext, validateTrustAnchorBundle, verifyAbraxasReceiptIndependently, verifyEd25519Detached, verifyReceiptPayloadIntegrity, verifyReceiptSignatureWithPublicJwk, verifySignedIssuerAuthorityStatement, verifySignedReceiptStatusStatement };
