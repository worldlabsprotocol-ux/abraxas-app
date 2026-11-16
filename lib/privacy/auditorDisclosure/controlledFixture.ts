// FILE: lib/privacy/auditorDisclosure/controlledFixture.ts

import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { signIssuerAuthorityPayload } from "@/lib/persistence/boundary/issuerAuthority/signVerify";
import type {
  IssuerAuthorityKeyEntry,
  IssuerAuthorityStatementPayload,
  SignedIssuerAuthorityStatement,
} from "@/lib/persistence/boundary/issuerAuthority/contract";
import {
  ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
  ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
} from "@/lib/persistence/boundary/issuerAuthority/contract";
import { DECISION_RECEIPT_SCHEMA_VERSION, type DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import {
  AUDITOR_DISCLOSURE_MANDATE_DOCUMENT,
  AUDITOR_DISCLOSURE_MANDATE_SCHEMA_VERSION,
  CONTROLLED_AUDITOR_MANDATE_ISSUER_FIXTURE_LABEL,
  INSTITUTIONAL_AUDITOR_MANDATE_ISSUER_REASON_CLASS,
  type AuditorDisclosureMandatePayload,
  type SignedAuditorDisclosureMandate,
} from "./contract";
import { signAuditorDisclosureMandatePayload } from "./signVerify";

export type ControlledAuditorMandateIssuerFixture = {
  label: typeof CONTROLLED_AUDITOR_MANDATE_ISSUER_FIXTURE_LABEL;
  anchorKey: ReturnType<typeof generateTestSigningKeyPair>;
  auditorMandateIssuerKey: ReturnType<typeof generateTestSigningKeyPair>;
  receiptOnlyKey: ReturnType<typeof generateTestSigningKeyPair>;
  signedIssuerAuthority: SignedIssuerAuthorityStatement;
  trustAnchorPublicJwk: JsonWebKey;
};

function auditorMandateKeyEntry(key: ReturnType<typeof generateTestSigningKeyPair>): IssuerAuthorityKeyEntry {
  return {
    key_id: key.signingKeyId,
    environment: "demo",
    status: "active",
    not_before: "2020-01-01T00:00:00.000Z",
    expires_at: null,
    public_jwk: key.publicKeyJwk,
    schema_versions: [AUDITOR_DISCLOSURE_MANDATE_SCHEMA_VERSION],
    allow_historical_verification: false,
    historical_verify_until: null,
    reason_class: INSTITUTIONAL_AUDITOR_MANDATE_ISSUER_REASON_CLASS,
  };
}

function receiptOnlyKeyEntry(key: ReturnType<typeof generateTestSigningKeyPair>): IssuerAuthorityKeyEntry {
  return {
    key_id: key.signingKeyId,
    environment: "demo",
    status: "active",
    not_before: "2020-01-01T00:00:00.000Z",
    expires_at: null,
    public_jwk: key.publicKeyJwk,
    schema_versions: ["1.0.0"],
    allow_historical_verification: false,
    historical_verify_until: null,
    reason_class: "decision_receipt_issuer",
  };
}

export function buildControlledAuditorMandateIssuerFixture(): ControlledAuditorMandateIssuerFixture {
  const anchorKey = generateTestSigningKeyPair("build968-auditor-anchor");
  const auditorMandateIssuerKey = generateTestSigningKeyPair("build968-auditor-mandate-issuer");
  const receiptOnlyKey = generateTestSigningKeyPair("build968-receipt-only");

  const payload: IssuerAuthorityStatementPayload = {
    document: ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
    schema_version: ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
    registry_version: 968001,
    supersedes_registry_version: null,
    environment: "demo",
    issued_at: "2026-06-01T00:00:00.000Z",
    not_before: "2020-01-01T00:00:00.000Z",
    anchor_key_id: anchorKey.signingKeyId,
    keys: [auditorMandateKeyEntry(auditorMandateIssuerKey), receiptOnlyKeyEntry(receiptOnlyKey)],
  };

  const signedIssuerAuthority = signIssuerAuthorityPayload(payload, anchorKey.privateKeyJwk);

  return {
    label: CONTROLLED_AUDITOR_MANDATE_ISSUER_FIXTURE_LABEL,
    anchorKey,
    auditorMandateIssuerKey,
    receiptOnlyKey,
    signedIssuerAuthority,
    trustAnchorPublicJwk: anchorKey.publicKeyJwk,
  };
}

export const CONTROLLED_AUDITOR_ID = "auditor_demo_968_primary";
export const CONTROLLED_RECEIPT_ID = "dr_auditor_disclosure_demo_968";
export const CONTROLLED_TENANT_ID = "tenant_institutional_demo";

export function buildControlledSignedAuditorMandate(input: {
  fixture: ControlledAuditorMandateIssuerFixture;
  overrides?: Partial<AuditorDisclosureMandatePayload>;
  signWith?: "auditor_mandate" | "receipt_only" | "unknown";
}): SignedAuditorDisclosureMandate {
  const base: AuditorDisclosureMandatePayload = {
    document: AUDITOR_DISCLOSURE_MANDATE_DOCUMENT,
    schema_version: AUDITOR_DISCLOSURE_MANDATE_SCHEMA_VERSION,
    mandate_id: "auditor_mandate_controlled_968_001",
    issuer_id: input.fixture.label,
    issuer_key_id: input.fixture.auditorMandateIssuerKey.signingKeyId,
    tenant_id: CONTROLLED_TENANT_ID,
    policy_id: "acme-age_21_retail-v1",
    policy_version: 1,
    authorized_auditor_id: CONTROLLED_AUDITOR_ID,
    purpose: "regulatory_examination",
    audience_hash: "audience_hash_demo_968",
    resource_ref: CONTROLLED_RECEIPT_ID,
    resource_kind: "decision_receipt",
    disclosure_surface: "auditor_review",
    not_before: "2026-06-01T00:00:00.000Z",
    not_after: "2026-12-31T23:59:59.000Z",
    revoked_at: null,
    environment: "demo",
    issued_at: "2026-06-01T12:00:00.000Z",
    ...input.overrides,
  };

  const mode = input.signWith ?? "auditor_mandate";
  const signingKey =
    mode === "receipt_only"
      ? input.fixture.receiptOnlyKey
      : mode === "unknown"
        ? generateTestSigningKeyPair("build968-unknown-signer")
        : input.fixture.auditorMandateIssuerKey;

  return signAuditorDisclosureMandatePayload({
    payload: { ...base, issuer_key_id: signingKey.signingKeyId },
    mandateIssuerPrivateJwk: signingKey.privateKeyJwk,
    signingKeyId: signingKey.signingKeyId,
  });
}

export function controlledAuditorReceiptRecord(): DecisionReceiptRecord {
  return {
    id: CONTROLLED_RECEIPT_ID,
    schema_version: DECISION_RECEIPT_SCHEMA_VERSION,
    verification_decision_id: "vdec_auditor_demo_968",
    consent_receipt_id: null,
    policy_id: "acme-age_21_retail-v1",
    policy_version: 1,
    partner_id: "acme",
    subject_pseudonym_id: "pseudo_audit_demo",
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: ["eligible"],
    evaluated_claim_refs: [{
      claim_id: "cl_auditor_1",
      claim_type: "age_over_21",
      issuer_id: "issuer_demo",
      status: "active",
      issued_at: "2026-01-01T00:00:00.000Z",
      expires_at: null,
    }],
    issuer_refs: ["issuer_demo"],
    decision_context: "sandbox_only",
    evaluated_at: "2026-01-01T00:00:00.000Z",
    expires_at: null,
    status: "active",
    payload_hash: "hash_auditor_demo",
    signature: "sig_auditor_demo",
    signing_key_id: "k1",
    anchor_reference: null,
    revoked_at: null,
    idempotency_key: null,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}