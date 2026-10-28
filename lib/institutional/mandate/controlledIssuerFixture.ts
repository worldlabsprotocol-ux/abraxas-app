// FILE: lib/institutional/mandate/controlledIssuerFixture.ts
// Controlled test issuer — NOT a live external institution.

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
import {
  CONTROLLED_MANDATE_ISSUER_FIXTURE_LABEL,
  INSTITUTIONAL_MANDATE_ISSUER_REASON_CLASS,
  INSTITUTIONAL_MANDATE_SCHEMA_VERSION,
  type InstitutionalMandatePayload,
  type SignedInstitutionalMandate,
} from "./contract";
import { signInstitutionalMandatePayload } from "./signVerify";

export type ControlledMandateIssuerFixture = {
  label: typeof CONTROLLED_MANDATE_ISSUER_FIXTURE_LABEL;
  anchorKey: ReturnType<typeof generateTestSigningKeyPair>;
  mandateIssuerKey: ReturnType<typeof generateTestSigningKeyPair>;
  receiptOnlyKey: ReturnType<typeof generateTestSigningKeyPair>;
  signedIssuerAuthority: SignedIssuerAuthorityStatement;
  trustAnchorPublicJwk: JsonWebKey;
};

function mandateKeyEntry(key: ReturnType<typeof generateTestSigningKeyPair>): IssuerAuthorityKeyEntry {
  return {
    key_id: key.signingKeyId,
    environment: "demo",
    status: "active",
    not_before: "2020-01-01T00:00:00.000Z",
    expires_at: null,
    public_jwk: key.publicKeyJwk,
    schema_versions: [INSTITUTIONAL_MANDATE_SCHEMA_VERSION],
    allow_historical_verification: false,
    historical_verify_until: null,
    reason_class: INSTITUTIONAL_MANDATE_ISSUER_REASON_CLASS,
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

export function buildControlledMandateIssuerFixture(): ControlledMandateIssuerFixture {
  const anchorKey = generateTestSigningKeyPair("build885-mandate-anchor");
  const mandateIssuerKey = generateTestSigningKeyPair("build885-mandate-issuer");
  const receiptOnlyKey = generateTestSigningKeyPair("build885-receipt-only");

  const payload: IssuerAuthorityStatementPayload = {
    document: ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
    schema_version: ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
    registry_version: 885001,
    supersedes_registry_version: null,
    environment: "demo",
    issued_at: "2026-06-01T00:00:00.000Z",
    not_before: "2020-01-01T00:00:00.000Z",
    anchor_key_id: anchorKey.signingKeyId,
    keys: [mandateKeyEntry(mandateIssuerKey), receiptOnlyKeyEntry(receiptOnlyKey)],
  };

  const signedIssuerAuthority = signIssuerAuthorityPayload(payload, anchorKey.privateKeyJwk);

  return {
    label: CONTROLLED_MANDATE_ISSUER_FIXTURE_LABEL,
    anchorKey,
    mandateIssuerKey,
    receiptOnlyKey,
    signedIssuerAuthority,
    trustAnchorPublicJwk: anchorKey.publicKeyJwk,
  };
}

export function buildControlledSignedMandate(input: {
  fixture: ControlledMandateIssuerFixture;
  overrides?: Partial<InstitutionalMandatePayload>;
  signWith?: "mandate" | "receipt_only" | "unknown";
}): SignedInstitutionalMandate {
  const base: InstitutionalMandatePayload = {
    document: "abraxas_institutional_mandate",
    schema_version: INSTITUTIONAL_MANDATE_SCHEMA_VERSION,
    mandate_id: "mandate_controlled_885_001",
    issuer_id: input.fixture.label,
    issuer_key_id: input.fixture.mandateIssuerKey.signingKeyId,
    tenant_id: "tenant_institutional_demo",
    policy_id: "institutional_signing_mandate_v1",
    policy_version: 1,
    authorized_actor_wallet: "ActorWallet885Demo1111111111111111111111111",
    action_type: "collateral_release",
    resource_ref: "collateral_pool_demo_a",
    max_amount_usd: 250_000,
    destination_fingerprint: "dest_fp_demo_primary",
    not_before: "2026-06-01T00:00:00.000Z",
    not_after: "2026-12-31T23:59:59.000Z",
    revoked_at: null,
    environment: "demo",
    issued_at: "2026-06-01T12:00:00.000Z",
    ...input.overrides,
  };

  const mode = input.signWith ?? "mandate";
  const signingKey =
    mode === "receipt_only"
      ? input.fixture.receiptOnlyKey
      : mode === "unknown"
        ? generateTestSigningKeyPair("build885-unknown-signer")
        : input.fixture.mandateIssuerKey;

  return signInstitutionalMandatePayload({
    payload: { ...base, issuer_key_id: signingKey.signingKeyId },
    mandateIssuerPrivateJwk: signingKey.privateKeyJwk,
    signingKeyId: signingKey.signingKeyId,
  });
}

export const BASE_TRANSACTION: import("@/lib/institutional/transactionMandateEnforcement").ProposedInstitutionalTransaction =
  {
    kind: "collateral_release",
    amount_usd: 100_000,
    destination_fingerprint: "dest_fp_demo_primary",
    actor_wallet: "ActorWallet885Demo1111111111111111111111111",
    tenant_id: "tenant_institutional_demo",
    policy_id: "institutional_signing_mandate_v1",
    policy_version: 1,
  };
