// FILE: lib/persistence/boundary/staging/threeLayerTrustAcceptance.ts
// Build #820 — three-layer trust contract acceptance (external attested or CI contract only).

import type { Pool } from "pg";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { generateTestSigningKeyPair, signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { publishSignedIssuerAuthorityFromRegistry } from "../issuerAuthority/buildFromRegistry";
import { evaluateSovereignCurrentValidity } from "../sovereignCurrentValidity/evaluate";
import { publishSignedReceiptStatusFromSovereignEvaluation } from "../trustDistribution/publishSignedReceiptStatus";
import { buildTrustAnchorBundleV1 } from "../trustDistribution/buildTrustAnchorBundle";
import {
  applySovereignSliceSchema,
  seedSovereignSliceFixtures,
} from "../sovereignSlice/bootstrap";
import {
  exportEncryptedSovereignSliceBackup,
  restoreEncryptedSovereignSliceBackup,
} from "../sovereignSlice/encryptedBackup";
import { reconcileSovereignSlice, assertReconciliationEqual } from "../sovereignSlice/reconciliation";
import { computeRecoveryMetrics } from "./recoveryMetrics";
import {
  evaluateExternalStagingDeployment,
  stagingOwnershipReadyForOperationalProof,
  buildStagingOperationalOwnershipChecklist,
} from "./stagingOperationalOwnership";
import { revokeIssuerSigningKeyOnSovereignPg } from "./issuerTrustRecovery";
import {
  verifyAbraxasReceiptIndependently,
  type IndependentVerificationResult,
} from "@abraxas/independent-verifier";

export type Build820ScenarioResult = {
  id: string;
  verdict: "pass" | "fail" | "skipped";
  detail: string;
  verifier?: Pick<
    IndependentVerificationResult,
    "cryptographically_authentic" | "issuer_currently_authorized" | "status_evidence_authentic" | "currently_acceptable"
  >;
  failure_codes?: string[];
};

export type Build820AcceptanceReport = {
  build: "820";
  /** external_attested = founder gate satisfied; ci_disposable_contract = CI/local drill only */
  execution_tier: "external_attested" | "ci_disposable_contract" | "blocked";
  external_staging: ReturnType<typeof evaluateExternalStagingDeployment>;
  ownership: {
    ready: boolean;
    failed_check_ids: string[];
  };
  three_layer_happy_path: Build820ScenarioResult;
  adverse_scenarios: Build820ScenarioResult[];
  recovery?: {
    rto_observed_ms: number;
    rpo_bound_ms: number;
    reconcile_ok: boolean;
    post_restore_verifier_currently_acceptable: "yes" | "no" | "indeterminate";
  };
  incomplete_gates: string[];
  limitations: string[];
  generated_at: string;
};

const VERIFIER_LIMITATION =
  "Monotonic status_version anti-rollback requires the verifier to retain or receive an authenticated minimumStatusVersion; "
  + "a fresh verifier with only an older still-valid signed statement cannot infer a newer revocation offline.";

function registryEnv(input: {
  receiptKey: ReturnType<typeof generateTestSigningKeyPair>;
  anchorKey: ReturnType<typeof generateTestSigningKeyPair>;
  statusSignerKey: ReturnType<typeof generateTestSigningKeyPair>;
  baseEnv: Record<string, string | undefined>;
}): Record<string, string> {
  const pub = input.receiptKey.publicKeyJwk;
  return {
    ...input.baseEnv,
    ABRAXAS_SIGNING_KEY: JSON.stringify(input.receiptKey.privateKeyJwk),
    ABRAXAS_SIGNING_KEY_ID: input.receiptKey.signingKeyId,
    VERCEL_ENV: "preview",
    ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify([
      {
        key_id: input.receiptKey.signingKeyId,
        environment: "demo",
        status: "active",
        public_jwk: pub,
        fingerprint: publicReceiptJwkFingerprint(pub as { kty: "OKP"; crv: "Ed25519"; x: string }),
        issued_at: "2020-01-01T00:00:00.000Z",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
        reason_class: "active",
        allow_historical_verification: false,
        historical_verify_until: null,
      },
    ]),
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: "build820-trust-anchor",
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK: JSON.stringify(input.anchorKey.privateKeyJwk),
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK: JSON.stringify(input.anchorKey.publicKeyJwk),
    ABRAXAS_STATUS_SIGNER_KEY_ID: input.statusSignerKey.signingKeyId,
    ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify(input.statusSignerKey.privateKeyJwk),
    ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(input.statusSignerKey.publicKeyJwk),
  } as Record<string, string>;
}

function syntheticSandboxReceipt(receiptKey: ReturnType<typeof generateTestSigningKeyPair>): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_build820_synthetic",
    decision_id: "00000000-0000-4000-8000-000000008820",
    policy_id: "policy-build820",
    policy_version: 1,
    partner_id: "partner-build820",
    subject_pseudonym_id: subjectPseudonymId("synthetic-build820"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["synthetic_sandbox_fixture"],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: "2026-06-01T12:00:00.000Z",
    expires_at: "2027-06-01T12:00:00.000Z",
  });
  const { payloadHash, signature } = signReceiptPayload(payload, receiptKey.privateKeyJwk);
  return {
    id: payload.receipt_id,
    verification_decision_id: payload.decision_id,
    consent_receipt_id: null,
    partner_id: payload.partner_id,
    policy_id: payload.policy_id,
    policy_version: payload.policy_version,
    subject_pseudonym_id: payload.subject_pseudonym_id,
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: payload.reason_codes,
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: receiptKey.signingKeyId,
    anchor_reference: null,
    idempotency_key: null,
    created_at: payload.evaluated_at,
  };
}

function assertSignedIssuer(
  value: ReturnType<typeof publishSignedIssuerAuthorityFromRegistry>,
): import("../issuerAuthority/contract").SignedIssuerAuthorityStatement {
  if ("payload" in value) return value;
  throw new Error(value.reason);
}

function assertSignedStatus(
  value: Awaited<ReturnType<typeof publishSignedReceiptStatusFromSovereignEvaluation>>,
): import("@abraxas/independent-verifier").SignedReceiptStatusStatement {
  if ("payload" in value) return value;
  throw new Error(value.reason);
}

async function verifyThreeLayer(input: {
  record: DecisionReceiptRecord;
  env: Record<string, string | undefined>;
  anchorKey: ReturnType<typeof generateTestSigningKeyPair>;
  registryVersion: number;
  minimumStatusVersion?: number;
  signedStatusOverride?: Awaited<ReturnType<typeof publishSignedReceiptStatusFromSovereignEvaluation>>;
}): Promise<IndependentVerificationResult> {
  const signedIssuer = assertSignedIssuer(
    publishSignedIssuerAuthorityFromRegistry({
      registryVersion: input.registryVersion,
      anchorKeyId: "build820-trust-anchor",
      anchorPrivateJwk: input.anchorKey.privateKeyJwk,
      env: input.env,
    }),
  );
  const evaluation = await evaluateSovereignCurrentValidity({
    record: input.record,
    signedIssuerAuthority: signedIssuer,
    trustAnchorPublicJwk: input.anchorKey.publicKeyJwk,
    expectedEnvironment: "demo",
    env: input.env,
  });
  const signedStatus = input.signedStatusOverride
    ? assertSignedStatus(input.signedStatusOverride)
    : assertSignedStatus(
      await publishSignedReceiptStatusFromSovereignEvaluation({
        record: input.record,
        evaluation,
        signedIssuerAuthorityEnvironment: "demo",
        env: input.env,
      }),
    );
  const bundle = buildTrustAnchorBundleV1({
    anchorKeyId: "build820-trust-anchor",
    anchorPublicJwk: input.anchorKey.publicKeyJwk,
    environment: "demo",
    statusStatementMaxAgeSeconds: 3600,
  });
  return verifyAbraxasReceiptIndependently({
    record: input.record,
    pinnedTrustAnchor: bundle,
    signedIssuerAuthority: signedIssuer,
    relyingParty: {
      partner_id: input.record.partner_id,
      policy_id: input.record.policy_id,
      environment: "demo",
    },
    statementObservedAt: new Date().toISOString(),
    signedStatusStatement: signedStatus,
    minimumStatusVersion: input.minimumStatusVersion,
  });
}

export async function runBuild820Acceptance(input: {
  primaryPool: Pool;
  restorePool: Pool;
  env: Record<string, string | undefined>;
  /** When false, skips recovery drill (faster contract checks). */
  includeRecovery?: boolean;
}): Promise<Build820AcceptanceReport> {
  const external = evaluateExternalStagingDeployment(input.env);
  const ownershipReady = stagingOwnershipReadyForOperationalProof(input.env);
  const checklist = buildStagingOperationalOwnershipChecklist(input.env);
  const incomplete: string[] = [];
  const limitations = [VERIFIER_LIMITATION];

  if (external.state === "pending") {
    incomplete.push("external_staging_attestation");
    limitations.push(
      "CI/disposable Postgres and docker compose are not externally attested sovereign staging (#816 founder gate).",
    );
  }

  let execution_tier: Build820AcceptanceReport["execution_tier"] = "blocked";
  if (external.state === "attested" && ownershipReady.ok) {
    execution_tier = "external_attested";
  } else if (input.env.ABRAXAS_BUILD_820_CI_CONTRACT === "1") {
    execution_tier = "ci_disposable_contract";
  } else if (external.state === "pending" && ownershipReady.ok) {
    execution_tier = "ci_disposable_contract";
    incomplete.push("execution_downgraded_to_ci_contract");
  }

  if (!ownershipReady.ok && input.env.ABRAXAS_BUILD_820_CI_CONTRACT !== "1") {
    return {
      build: "820",
      execution_tier: "blocked",
      external_staging: external,
      ownership: { ready: false, failed_check_ids: ownershipReady.failed_checks },
      three_layer_happy_path: {
        id: "three_layer_happy_path",
        verdict: "skipped",
        detail: "Ownership checklist incomplete for persistent staging class",
      },
      adverse_scenarios: [],
      incomplete_gates: [...incomplete, "ownership_checklist"],
      limitations,
      generated_at: new Date().toISOString(),
    };
  }

  const receiptKey = generateTestSigningKeyPair("build820-issuer");
  const anchorKey = generateTestSigningKeyPair("build820-anchor");
  const statusSignerKey = generateTestSigningKeyPair("build820-status-signer");
  const env = registryEnv({
    receiptKey,
    anchorKey,
    statusSignerKey,
    baseEnv: input.env,
  });

  await applySovereignSliceSchema(input.primaryPool);
  await applySovereignSliceSchema(input.restorePool);
  const record = syntheticSandboxReceipt(receiptKey);
  await seedSovereignSliceFixtures({ pool: input.primaryPool, record, env });

  let happy: Build820ScenarioResult;
  try {
    const verifier = await verifyThreeLayer({
      record,
      env,
      anchorKey,
      registryVersion: 1,
    });
    happy = {
      id: "three_layer_happy_path",
      verdict: verifier.currently_acceptable === "yes" ? "pass" : "fail",
      detail: "Synthetic sandbox receipt + SIAS + signed status verified by standalone package",
      verifier: {
        cryptographically_authentic: verifier.cryptographically_authentic,
        issuer_currently_authorized: verifier.issuer_currently_authorized,
        status_evidence_authentic: verifier.status_evidence_authentic,
        currently_acceptable: verifier.currently_acceptable,
      },
      failure_codes: verifier.failure_codes,
    };
  } catch (e) {
    happy = {
      id: "three_layer_happy_path",
      verdict: "fail",
      detail: e instanceof Error ? e.message : "verification_error",
    };
  }

  const adverse: Build820ScenarioResult[] = [];

  // Revoked receipt status via DB update + fresh signed status
  await input.primaryPool.query(
    `update public.decision_receipts set status = 'revoked', revoked_at = now() where id = $1`,
    [record.id],
  );
  const afterRevoke = await verifyThreeLayer({ record: { ...record, status: "revoked" }, env, anchorKey, registryVersion: 2 });
  adverse.push({
    id: "receipt_revoked",
    verdict: afterRevoke.currently_acceptable === "no" ? "pass" : "fail",
    detail: "Revoked receipt must not be currently acceptable",
    verifier: {
      cryptographically_authentic: afterRevoke.cryptographically_authentic,
      issuer_currently_authorized: afterRevoke.issuer_currently_authorized,
      status_evidence_authentic: afterRevoke.status_evidence_authentic,
      currently_acceptable: afterRevoke.currently_acceptable,
    },
    failure_codes: afterRevoke.failure_codes,
  });

  // Stale status replay — older signed statement after verifier learned a higher minimum version
  await input.primaryPool.query(
    `update public.decision_receipts set status = 'active', revoked_at = null where id = $1`,
    [record.id],
  );
  const signedIssuerV3 = assertSignedIssuer(
    publishSignedIssuerAuthorityFromRegistry({
      registryVersion: 3,
      anchorKeyId: "build820-trust-anchor",
      anchorPrivateJwk: anchorKey.privateKeyJwk,
      env,
    }),
  );
  const evaluationV3 = await evaluateSovereignCurrentValidity({
    record,
    signedIssuerAuthority: signedIssuerV3,
    trustAnchorPublicJwk: anchorKey.publicKeyJwk,
    expectedEnvironment: "demo",
    env,
  });
  const statusV1 = assertSignedStatus(
    await publishSignedReceiptStatusFromSovereignEvaluation({
      record,
      evaluation: evaluationV3,
      signedIssuerAuthorityEnvironment: "demo",
      env,
    }),
  );
  await verifyThreeLayer({ record, env, anchorKey, registryVersion: 4 });
  const replayMinimumVersion = statusV1.payload.status_version + 1;
  const replay = await verifyThreeLayer({
    record,
    env,
    anchorKey,
    registryVersion: 4,
    minimumStatusVersion: replayMinimumVersion,
    signedStatusOverride: statusV1,
  });
  adverse.push({
    id: "stale_status_replay",
    verdict: replay.failure_codes.includes("status_version_rollback_rejected") ? "pass" : "fail",
    detail: "Verifier with minimumStatusVersion rejects replayed older signed status",
    failure_codes: replay.failure_codes,
  });

  const signedIssuerV4 = assertSignedIssuer(
    publishSignedIssuerAuthorityFromRegistry({
      registryVersion: 4,
      anchorKeyId: "build820-trust-anchor",
      anchorPrivateJwk: anchorKey.privateKeyJwk,
      env,
    }),
  );
  const statusForAudience = assertSignedStatus(
    await publishSignedReceiptStatusFromSovereignEvaluation({
      record,
      evaluation: evaluationV3,
      signedIssuerAuthorityEnvironment: "demo",
      env,
    }),
  );
  const wrongAudience = await verifyAbraxasReceiptIndependently({
    record,
    pinnedTrustAnchor: buildTrustAnchorBundleV1({
      anchorKeyId: "build820-trust-anchor",
      anchorPublicJwk: anchorKey.publicKeyJwk,
      environment: "demo",
    }),
    signedIssuerAuthority: signedIssuerV4,
    relyingParty: { partner_id: "wrong-partner", policy_id: record.policy_id, environment: "demo" },
    statementObservedAt: new Date().toISOString(),
    signedStatusStatement: statusForAudience,
  });
  adverse.push({
    id: "wrong_audience",
    verdict: wrongAudience.failure_codes.includes("audience_mismatch") ? "pass" : "fail",
    detail: "Cross-partner reuse rejected",
    failure_codes: wrongAudience.failure_codes,
  });

  const pub = receiptKey.publicKeyJwk;
  const revokedRegistryEnv = {
    ...env,
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
        reason_class: "compromised",
        allow_historical_verification: true,
        historical_verify_until: "2030-01-01T00:00:00.000Z",
      },
    ]),
  };
  await revokeIssuerSigningKeyOnSovereignPg(input.primaryPool, record.signing_key_id);
  const issuerRevoked = await verifyThreeLayer({
    record,
    env: revokedRegistryEnv,
    anchorKey,
    registryVersion: 5,
  });
  adverse.push({
    id: "issuer_signing_key_revoked",
    verdict:
      issuerRevoked.cryptographically_authentic && !issuerRevoked.issuer_currently_authorized
        ? "pass"
        : "fail",
    detail: "Revoked issuer key in SIAS: signature vs current authorization",
    verifier: {
      cryptographically_authentic: issuerRevoked.cryptographically_authentic,
      issuer_currently_authorized: issuerRevoked.issuer_currently_authorized,
      status_evidence_authentic: issuerRevoked.status_evidence_authentic,
      currently_acceptable: issuerRevoked.currently_acceptable,
    },
  });

  let recovery: Build820AcceptanceReport["recovery"];
  if (input.includeRecovery !== false) {
    const lastWrite = Date.now();
    const exportStarted = Date.now();
    const encrypted = await exportEncryptedSovereignSliceBackup(input.primaryPool, env);
    const exportCompleted = Date.now();
    await restoreEncryptedSovereignSliceBackup(input.restorePool, encrypted, {
      ...env,
      ABRAXAS_DATABASE_URL: env.ABRAXAS_SOVEREIGN_RESTORE_PG_URL ?? env.ABRAXAS_DATABASE_URL,
      ABRAXAS_SOVEREIGN_STAGING_PG_URL: env.ABRAXAS_SOVEREIGN_RESTORE_PG_URL ?? env.ABRAXAS_SOVEREIGN_STAGING_PG_URL,
    });
    const restoreCompleted = Date.now();
    const primarySnap = await reconcileSovereignSlice(input.primaryPool);
    const restoreSnap = await reconcileSovereignSlice(input.restorePool);
    const reconcileMismatches = assertReconciliationEqual(primarySnap, restoreSnap);
    const reconcileOk = reconcileMismatches.length === 0;
    const metrics = computeRecoveryMetrics({
      last_write_at_ms: lastWrite,
      export_started_at_ms: exportStarted,
      export_completed_at_ms: exportCompleted,
      restore_completed_at_ms: restoreCompleted,
      reconcile_completed_at_ms: Date.now(),
    });
    recovery = {
      rto_observed_ms: metrics.rto_observed_ms,
      rpo_bound_ms: metrics.rpo_bound_ms,
      reconcile_ok: reconcileOk,
      post_restore_verifier_currently_acceptable: "indeterminate",
    };
  }

  if (external.state === "pending") {
    incomplete.push("founder_attestation_required");
  }
  if (execution_tier === "ci_disposable_contract") {
    incomplete.push("externally_witnessed_operation");
  }

  return {
    build: "820",
    execution_tier,
    external_staging: external,
    ownership: {
      ready: ownershipReady.ok,
      failed_check_ids: ownershipReady.ok ? [] : ownershipReady.failed_checks,
    },
    three_layer_happy_path: happy,
    adverse_scenarios: adverse,
    recovery,
    incomplete_gates: incomplete,
    limitations,
    generated_at: new Date().toISOString(),
  };
}
