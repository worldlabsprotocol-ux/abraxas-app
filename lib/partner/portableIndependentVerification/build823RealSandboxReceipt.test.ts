/**
 * Build #823 — genuine Demo sandbox receipt → standalone independent verifier.
 */
import { describe, expect, it } from "vitest";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { publishSignedIssuerAuthorityFromRegistry } from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import { buildTrustAnchorBundleV1 } from "@/lib/persistence/boundary/trustDistribution/buildTrustAnchorBundle";
import {
  RECEIPT_STATUS_STATEMENT_DOCUMENT,
  RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
  signReceiptStatusStatement,
} from "@abraxas/independent-verifier";
import {
  BUILD823_DEMO_PARTNER_ID,
  BUILD823_DEMO_POLICY_ID,
  BUILD823_DEMO_RECEIPT_SIGNING_PUBLIC_JWK,
  build823GenuineDemoReceiptRecord,
} from "./fixtures/build823DemoReceipt.fixture";
import { verifyPortableBundle, type PortableVerificationBundle } from "./index";

function demoRegistryEnv(anchor: ReturnType<typeof generateTestSigningKeyPair>, statusSigner: ReturnType<typeof generateTestSigningKeyPair>) {
  const pub = BUILD823_DEMO_RECEIPT_SIGNING_PUBLIC_JWK;
  return {
    VERCEL_ENV: "preview",
    ABRAXAS_ISSUER_AUTHORITY_REGISTRY_VERSION: "3",
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: "demo-integrator-pin-823",
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK: JSON.stringify(anchor.privateKeyJwk),
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK: JSON.stringify(anchor.publicKeyJwk),
    ABRAXAS_STATUS_SIGNER_KEY_ID: statusSigner.signingKeyId,
    ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify(statusSigner.privateKeyJwk),
    ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(statusSigner.publicKeyJwk),
    ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify([
      {
        key_id: "abraxas-demo-primary",
        environment: "demo",
        status: "active",
        public_jwk: pub,
        fingerprint: publicReceiptJwkFingerprint(pub),
        issued_at: "2020-01-01T00:00:00.000Z",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: "2099-01-01T00:00:00.000Z",
        schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
        reason_class: "active",
        allow_historical_verification: false,
        historical_verify_until: null,
      },
    ]),
  } as Record<string, string>;
}

function assembleDemoPortableBundle(input: {
  record: ReturnType<typeof build823GenuineDemoReceiptRecord>;
  env: Record<string, string>;
  anchor: ReturnType<typeof generateTestSigningKeyPair>;
  statusSigner: ReturnType<typeof generateTestSigningKeyPair>;
  statusOverrides?: Partial<{
    claims_current: boolean;
    evidence_current: boolean;
    receipt_status: "active" | "expired" | "revoked";
    partner_operational: boolean;
    policy_active: boolean;
  }>;
}): PortableVerificationBundle {
  const signedIssuer = publishSignedIssuerAuthorityFromRegistry({
    registryVersion: 3,
    anchorKeyId: "demo-integrator-pin-823",
    anchorPrivateJwk: input.anchor.privateKeyJwk,
    env: input.env,
  });
  if (!("payload" in signedIssuer)) throw new Error(signedIssuer.reason);

  const bundledAnchor = buildTrustAnchorBundleV1({
    anchorKeyId: "demo-integrator-pin-823",
    anchorPublicJwk: input.anchor.publicKeyJwk,
    environment: "demo",
    statusStatementMaxAgeSeconds: 86_400,
  });

  const observed = "2026-10-24T17:00:00.000Z";
  const signedStatus = signReceiptStatusStatement({
    statusSignerPrivateJwk: input.statusSigner.privateKeyJwk,
    payload: {
      document: RECEIPT_STATUS_STATEMENT_DOCUMENT,
      schema_version: RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION,
      receipt_id: input.record.id,
      status_reference: input.record.id,
      partner_id: input.record.partner_id,
      policy_id: input.record.policy_id,
      policy_version: input.record.policy_version,
      environment: "demo",
      status_version: 1,
      supersedes_status_version: null,
      receipt_status: input.statusOverrides?.receipt_status ?? "active",
      superseded: false,
      partner_operational: input.statusOverrides?.partner_operational ?? true,
      policy_active: input.statusOverrides?.policy_active ?? true,
      claims_current: input.statusOverrides?.claims_current ?? true,
      evidence_current: input.statusOverrides?.evidence_current ?? true,
      effective_at: observed,
      issued_at: observed,
      statement_expires_at: "2027-01-01T00:00:00.000Z",
      status_signer_key_id: input.statusSigner.signingKeyId,
    },
  });

  return {
    schema: "abraxas_portable_verification_bundle/1.0.0",
    decision_receipt: input.record,
    bundled_trust_anchor: bundledAnchor,
    pinned_trust_anchor: bundledAnchor,
    signed_issuer_authority: signedIssuer,
    signed_status_statement: signedStatus,
    registry_version: 3,
    export_provenance: {
      trust_anchor_must_be_independently_pinned: true,
      bundled_trust_anchor_informational_only: true,
      status_evidence_authoritative: true,
      status_evidence_source: "sovereign_pg_evaluation",
    },
  };
}

describe("Build #823 genuine Demo sandbox receipt", () => {
  const anchor = generateTestSigningKeyPair("demo-pin-823");
  const statusSigner = generateTestSigningKeyPair("demo-status-823");
  const env = demoRegistryEnv(anchor, statusSigner);
  const record = build823GenuineDemoReceiptRecord();

  it("verifies historical cryptographic authenticity for the genuine receipt", () => {
    const bundle = assembleDemoPortableBundle({ record, env, anchor, statusSigner });
    const result = verifyPortableBundle({
      bundle,
      integratorPinnedTrustAnchor: bundle.bundled_trust_anchor,
      partnerId: BUILD823_DEMO_PARTNER_ID,
      policyId: BUILD823_DEMO_POLICY_ID,
      statementObservedAt: "2026-10-24T17:00:00.000Z",
      now: new Date("2026-10-24T17:30:00.000Z"),
    });
    expect(result.cryptographically_authentic).toBe(true);
    expect(result.issuer_currently_authorized).toBe(true);
    expect(result.status_evidence_authentic).toBe(true);
    expect(result.currently_acceptable).toBe("yes");
  });

  it("does not grant current authorization after receipt expiry", () => {
    const bundle = assembleDemoPortableBundle({
      record,
      env,
      anchor,
      statusSigner,
      statusOverrides: {
        receipt_status: "expired",
        claims_current: false,
        evidence_current: false,
      },
    });
    const result = verifyPortableBundle({
      bundle,
      integratorPinnedTrustAnchor: bundle.bundled_trust_anchor,
      partnerId: BUILD823_DEMO_PARTNER_ID,
      policyId: BUILD823_DEMO_POLICY_ID,
      statementObservedAt: "2026-10-26T00:00:00.000Z",
      now: new Date("2026-10-26T00:00:00.000Z"),
    });
    expect(result.cryptographically_authentic).toBe(true);
    expect(result.currently_acceptable).toBe("no");
  });

  it("rejects sandbox receipt evaluated under production relying-party scope", () => {
    const bundle = assembleDemoPortableBundle({ record, env, anchor, statusSigner });
    const result = verifyPortableBundle({
      bundle,
      integratorPinnedTrustAnchor: bundle.bundled_trust_anchor,
      partnerId: BUILD823_DEMO_PARTNER_ID,
      policyId: BUILD823_DEMO_POLICY_ID,
      statementObservedAt: "2026-10-24T17:00:00.000Z",
      now: new Date("2026-10-24T17:30:00.000Z"),
    });
    expect(result.currently_acceptable).toBe("yes");
    const productionPin = { ...bundle.bundled_trust_anchor, environment: "production" as const };
    const crossEnv = verifyPortableBundle({
      bundle,
      integratorPinnedTrustAnchor: productionPin,
      partnerId: BUILD823_DEMO_PARTNER_ID,
      policyId: BUILD823_DEMO_POLICY_ID,
    });
    expect(crossEnv.currently_acceptable).not.toBe("yes");
  });

  it("rejects wrong partner and wrong policy", () => {
    const bundle = assembleDemoPortableBundle({ record, env, anchor, statusSigner });
    const wrongPartner = verifyPortableBundle({
      bundle,
      integratorPinnedTrustAnchor: bundle.bundled_trust_anchor,
      partnerId: "wrong-partner",
      policyId: BUILD823_DEMO_POLICY_ID,
      statementObservedAt: "2026-10-24T17:00:00.000Z",
      now: new Date("2026-10-24T17:30:00.000Z"),
    });
    expect(wrongPartner.currently_acceptable).toBe("no");

    const wrongPolicy = verifyPortableBundle({
      bundle,
      integratorPinnedTrustAnchor: bundle.bundled_trust_anchor,
      partnerId: BUILD823_DEMO_PARTNER_ID,
      policyId: "wrong-policy",
      statementObservedAt: "2026-10-24T17:00:00.000Z",
      now: new Date("2026-10-24T17:30:00.000Z"),
    });
    expect(wrongPolicy.currently_acceptable).toBe("no");
  });

  it("rejects integrator pin that does not authenticate bundled anchor", () => {
    const bundle = assembleDemoPortableBundle({ record, env, anchor, statusSigner });
    const wrongPin = buildTrustAnchorBundleV1({
      anchorKeyId: "other-pin",
      anchorPublicJwk: generateTestSigningKeyPair("other").publicKeyJwk,
      environment: "demo",
    });
    const result = verifyPortableBundle({
      bundle,
      integratorPinnedTrustAnchor: wrongPin,
      partnerId: BUILD823_DEMO_PARTNER_ID,
      policyId: BUILD823_DEMO_POLICY_ID,
    });
    expect(result.failure_codes).toContain("bundled_trust_anchor_not_authenticated");
    expect(result.currently_acceptable).toBe("indeterminate");
  });

  it("rejects registry that omits authorized key for historical signing period", () => {
    const envNoKey = {
      ...env,
      ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify([]),
    };
    const signedIssuer = publishSignedIssuerAuthorityFromRegistry({
      registryVersion: 3,
      anchorKeyId: "demo-integrator-pin-823",
      anchorPrivateJwk: anchor.privateKeyJwk,
      env: envNoKey,
    });
    expect("payload" in signedIssuer).toBe(false);
  });

  it("rejects tampered signed status evidence", () => {
    const bundle = assembleDemoPortableBundle({ record, env, anchor, statusSigner });
    const tampered = {
      ...bundle.signed_status_statement,
      signature: `${bundle.signed_status_statement.signature}x`,
    };
    const result = verifyPortableBundle({
      bundle: { ...bundle, signed_status_statement: tampered },
      integratorPinnedTrustAnchor: bundle.bundled_trust_anchor,
      partnerId: BUILD823_DEMO_PARTNER_ID,
      policyId: BUILD823_DEMO_POLICY_ID,
      statementObservedAt: "2026-10-24T17:00:00.000Z",
      now: new Date("2026-10-24T17:30:00.000Z"),
    });
    expect(result.status_evidence_authentic).toBe(false);
    expect(result.currently_acceptable).not.toBe("yes");
  });

  it("returns indeterminate when status claims current permission without authoritative freshness", () => {
    const bundle = assembleDemoPortableBundle({
      record,
      env,
      anchor,
      statusSigner,
      statusOverrides: { claims_current: false, evidence_current: false },
    });
    const result = verifyPortableBundle({
      bundle,
      integratorPinnedTrustAnchor: bundle.bundled_trust_anchor,
      partnerId: BUILD823_DEMO_PARTNER_ID,
      policyId: BUILD823_DEMO_POLICY_ID,
      statementObservedAt: "2026-10-24T17:00:00.000Z",
      now: new Date("2026-10-24T17:30:00.000Z"),
    });
    expect(result.currently_acceptable).toBe("no");
  });
});
