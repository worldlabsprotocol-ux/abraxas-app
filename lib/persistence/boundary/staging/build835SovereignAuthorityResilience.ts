// FILE: lib/persistence/boundary/staging/build835SovereignAuthorityResilience.ts
// Build #835 — authority compromise + replacement on isolated PG (extends #820/#834).

import type { Pool } from "pg";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { publishSignedIssuerAuthorityFromRegistry } from "../issuerAuthority/buildFromRegistry";
import { revokeIssuerSigningKeyOnSovereignPg } from "./issuerTrustRecovery";
import {
  syntheticSandboxReceipt,
  registryEnv,
  verifyThreeLayer,
} from "./build834Fixtures";
import { applySovereignSliceSchema, seedSovereignSliceFixtures } from "../sovereignSlice/bootstrap";
import { assertNoUnsafePermit } from "@/lib/decisionReceipts/currentValidity/unifiedContract";
import { evaluateSovereignCurrentValidity } from "../sovereignCurrentValidity/evaluate";
import { publishSignedReceiptStatusFromSovereignEvaluation } from "../trustDistribution/publishSignedReceiptStatus";

export type Build835ScenarioResult = {
  id: string;
  verdict: "pass" | "fail";
  detail: string;
};

export type Build835AuthorityReport = {
  build: "835";
  scenarios: Build835ScenarioResult[];
  existing_coverage: string[];
  generated_at: string;
};

function assertSignedIssuer(
  value: ReturnType<typeof publishSignedIssuerAuthorityFromRegistry>,
) {
  if ("payload" in value) return value;
  throw new Error(value.reason);
}

export async function runBuild835SovereignAuthorityResilience(input: {
  primaryPool: Pool;
  env: Record<string, string | undefined>;
}): Promise<Build835AuthorityReport> {
  const scenarios: Build835ScenarioResult[] = [];
  const receiptKey = generateTestSigningKeyPair("build835-issuer-a");
  const replacementKey = generateTestSigningKeyPair("build835-issuer-b");
  const anchorKey = generateTestSigningKeyPair("build835-anchor");
  const statusSignerKey = generateTestSigningKeyPair("build835-status-signer");

  const baseEnv = {
    ...registryEnv(receiptKey, anchorKey, input.env),
    ABRAXAS_STATUS_SIGNER_KEY_ID: statusSignerKey.signingKeyId,
    ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify(statusSignerKey.privateKeyJwk),
    ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(statusSignerKey.publicKeyJwk),
  };
  const record = syntheticSandboxReceipt(receiptKey);

  await applySovereignSliceSchema(input.primaryPool);
  await seedSovereignSliceFixtures({ pool: input.primaryPool, record, env: baseEnv });
  await input.primaryPool.query(
    `insert into public.issuer_signing_keys (signing_key_id, status) values ($1, 'active') on conflict do nothing`,
    [replacementKey.signingKeyId],
  );

  async function runScenario(id: string, fn: () => Promise<void>) {
    try {
      await fn();
      scenarios.push({ id, verdict: "pass", detail: "ok" });
    } catch (e) {
      scenarios.push({
        id,
        verdict: "fail",
        detail: e instanceof Error ? e.message : "error",
      });
    }
  }

  await runScenario("compromised_receipt_key_denies_current_authorization", async () => {
    const issuerBeforeCompromise = assertSignedIssuer(
      publishSignedIssuerAuthorityFromRegistry({
        registryVersion: 9,
        anchorKeyId: "build834-trust-anchor",
        anchorPrivateJwk: anchorKey.privateKeyJwk,
        env: baseEnv,
      }),
    );
    const validityBeforeCompromise = await evaluateSovereignCurrentValidity({
      record,
      signedIssuerAuthority: issuerBeforeCompromise,
      trustAnchorPublicJwk: anchorKey.publicKeyJwk,
      expectedEnvironment: "demo",
      env: baseEnv,
    });
    const statusBeforeCompromise = await publishSignedReceiptStatusFromSovereignEvaluation({
      record,
      evaluation: validityBeforeCompromise,
      signedIssuerAuthorityEnvironment: "demo",
      env: baseEnv,
    });
    if (!("payload" in statusBeforeCompromise)) throw new Error(statusBeforeCompromise.reason);
    const pub = receiptKey.publicKeyJwk;
    const compromisedEnv = {
      ...baseEnv,
      ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify([
        {
          key_id: receiptKey.signingKeyId,
          environment: "demo",
          status: "revoked",
          public_jwk: pub,
          fingerprint: publicReceiptJwkFingerprint(pub as { kty: "OKP"; crv: "Ed25519"; x: string }),
          issued_at: "2020-01-01T00:00:00.000Z",
          not_before: "2020-01-01T00:00:00.000Z",
          expires_at: null,
          schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
          reason_class: "compromise",
          allow_historical_verification: true,
          historical_verify_until: "2099-01-01T00:00:00.000Z",
        },
      ]),
    };
    await revokeIssuerSigningKeyOnSovereignPg(input.primaryPool, receiptKey.signingKeyId);
    const verifier = await verifyThreeLayer({
      record,
      env: compromisedEnv,
      anchorKey,
      registryVersion: 10,
      signedStatusOverride: statusBeforeCompromise,
    });
    if (verifier.currently_acceptable === "yes") throw new Error("unsafe_permit_after_compromise");
    if (!verifier.cryptographically_authentic) throw new Error("expected_historical_signature_valid");
    if (verifier.issuer_currently_authorized) throw new Error("expected_issuer_not_authorized");
  });

  await runScenario("replacement_issuer_in_sias_after_compromise", async () => {
    const pubA = receiptKey.publicKeyJwk;
    const pubB = replacementKey.publicKeyJwk;
    const replacementEnv = {
      ...baseEnv,
      ABRAXAS_SIGNING_KEY: JSON.stringify(replacementKey.privateKeyJwk),
      ABRAXAS_SIGNING_KEY_ID: replacementKey.signingKeyId,
      ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify([
        {
          key_id: receiptKey.signingKeyId,
          environment: "demo",
          status: "revoked",
          public_jwk: pubA,
          fingerprint: publicReceiptJwkFingerprint(pubA as { kty: "OKP"; crv: "Ed25519"; x: string }),
          issued_at: "2020-01-01T00:00:00.000Z",
          not_before: "2020-01-01T00:00:00.000Z",
          expires_at: null,
          schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
          reason_class: "compromise",
          allow_historical_verification: true,
          historical_verify_until: "2099-01-01T00:00:00.000Z",
        },
        {
          key_id: replacementKey.signingKeyId,
          environment: "demo",
          status: "active",
          public_jwk: pubB,
          fingerprint: publicReceiptJwkFingerprint(pubB as { kty: "OKP"; crv: "Ed25519"; x: string }),
          issued_at: "2026-06-01T00:00:00.000Z",
          not_before: "2026-06-01T00:00:00.000Z",
          expires_at: null,
          schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
          reason_class: "active",
          allow_historical_verification: false,
          historical_verify_until: null,
        },
      ]),
    };
    const signedIssuer = assertSignedIssuer(
      publishSignedIssuerAuthorityFromRegistry({
        registryVersion: 11,
        anchorKeyId: "build834-trust-anchor",
        anchorPrivateJwk: anchorKey.privateKeyJwk,
        env: replacementEnv,
      }),
    );
    const evaluation = await evaluateSovereignCurrentValidity({
      record,
      signedIssuerAuthority: signedIssuer,
      trustAnchorPublicJwk: anchorKey.publicKeyJwk,
      expectedEnvironment: "demo",
      env: replacementEnv,
    });
    assertNoUnsafePermit({
      currently_acceptable: evaluation.currently_acceptable,
      invalidation_reasons: evaluation.invalidation_reasons,
      lifecycle_status: evaluation.lifecycle_status,
    });
    if (evaluation.currently_acceptable) {
      throw new Error("old_receipt_must_not_permit_under_replacement_registry");
    }
    const auth = await import("../issuerAuthority/resolveIssuerKey").then((m) =>
      m.resolveIssuerKeyFromSignedStatement({
        statement: signedIssuer,
        trustAnchorPublicJwk: anchorKey.publicKeyJwk,
        keyId: replacementKey.signingKeyId,
        schemaVersion: record.schema_version,
        environment: "demo",
        mode: "current_authorization",
      }),
    );
    if (!auth.ok) throw new Error("replacement_key_not_authorized_in_sias");
  });

  return {
    build: "835",
    scenarios,
    existing_coverage: [
      "lib/persistence/boundary/issuerAuthority/issuerAuthority.adversarial.test.ts",
      "packages/abraxas-independent-verifier/src/independentVerifier.adversarial.test.ts",
      "packages/abraxas-independent-verifier/src/signedStatus.adversarial.test.ts",
      "lib/partner/integrationKit/trustContinuity/trustContinuity.adversarial.test.ts",
      "lib/decisionReceipts/verificationKeyLifecycle/verificationKeyLifecycle.test.ts",
      "lib/persistence/boundary/staging/threeLayerTrustAcceptance.ts (#820/#834)",
    ],
    generated_at: new Date().toISOString(),
  };
}
