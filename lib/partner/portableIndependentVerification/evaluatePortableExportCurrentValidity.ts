// FILE: lib/partner/portableIndependentVerification/evaluatePortableExportCurrentValidity.ts
// Issuer-side current validity for portable export — sovereign PG when configured, else operational Demo store.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { evaluateReceiptCurrentValidity } from "@/lib/decisionReceipts/currentValidity/evaluate";
import { resolveReceiptStatus } from "@/lib/decisionReceipts/views";
import { resolveIssuerKeyFromSignedStatement } from "@/lib/persistence/boundary/issuerAuthority/resolveIssuerKey";
import type { SignedIssuerAuthorityStatement } from "@/lib/persistence/boundary/issuerAuthority/contract";
import type { SovereignCurrentValidityResult } from "@/lib/persistence/boundary/sovereignCurrentValidity/evaluate";
import { evaluateSovereignCurrentValidity } from "@/lib/persistence/boundary/sovereignCurrentValidity/evaluate";
import { getSovereignStagingPgPool } from "@/lib/persistence/boundary/sovereignStagingPg";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { createOperationalApplicationScopeResolver } from "@/lib/decisionReceipts/currentValidity/applicationScope.server";
import { resolveAuthoritativeApplicationIdForIssuance } from "@/lib/decisionReceipts/v1_1_0/authoritativeIssuance.server";

export type PortableExportValiditySource = "sovereign_pg" | "operational_demo_store";

export type PortableExportValidityEvaluation = SovereignCurrentValidityResult & {
  source: PortableExportValiditySource;
};

function verifierEnvironment(record: DecisionReceiptRecord): "demo" | "production" {
  return record.decision_context === "production" ? "production" : "demo";
}

async function mapOperationalCurrentValidity(input: {
  record: DecisionReceiptRecord;
  signedIssuerAuthority: SignedIssuerAuthorityStatement;
  trustAnchorPublicJwk: JsonWebKey;
  now: Date;
  expectedApplicationId?: string | null;
}): Promise<PortableExportValidityEvaluation> {
  const runtimeEnv = verifierEnvironment(input.record);
  const invalidationReasons: string[] = [];
  let storeAvailable = true;

  const sigKey = resolveIssuerKeyFromSignedStatement({
    statement: input.signedIssuerAuthority,
    trustAnchorPublicJwk: input.trustAnchorPublicJwk,
    keyId: input.record.signing_key_id,
    schemaVersion: input.record.schema_version,
    environment: runtimeEnv,
    mode: "signature_verification",
    now: input.now,
  });
  const cryptographicallyValid = sigKey.ok;
  if (!cryptographicallyValid) invalidationReasons.push(sigKey.reason);

  const authKey = resolveIssuerKeyFromSignedStatement({
    statement: input.signedIssuerAuthority,
    trustAnchorPublicJwk: input.trustAnchorPublicJwk,
    keyId: input.record.signing_key_id,
    schemaVersion: input.record.schema_version,
    environment: runtimeEnv,
    mode: "current_authorization",
    now: input.now,
  });
  const issuerAuthorized = authKey.ok;
  if (!issuerAuthorized) invalidationReasons.push("issuer_not_authorized");

  const storedStatus = resolveReceiptStatus(input.record);

  const current = await evaluateReceiptCurrentValidity({
    record: input.record,
    expectedPartnerId: input.record.partner_id,
    expectedPolicyId: input.record.policy_id,
    expectedEnvironment: runtimeEnv === "production" ? "production" : "sandbox",
    applicationId: input.expectedApplicationId,
    resolveApplicationScope: input.expectedApplicationId
      ? createOperationalApplicationScopeResolver() : undefined,
    now: input.now,
  });

  if (current.invalidation_reasons.some((reason) => reason.includes("unavailable"))) {
    storeAvailable = false;
    invalidationReasons.push("validity_store_unavailable");
  }
  invalidationReasons.push(...current.invalidation_reasons);

  const superseded = current.lifecycle_status === "superseded";
  const claimsCurrent = current.source_states.claims_current && storeAvailable;
  const evidenceCurrent =
    !current.invalidation_reasons.some((r) => r.includes("evidence"))
    && storeAvailable;

  const currentlyAcceptable =
    current.currently_valid
    && cryptographicallyValid
    && issuerAuthorized
    && storeAvailable;

  let lifecycle: SovereignCurrentValidityResult["lifecycle_status"] = "active";
  if (superseded) lifecycle = "superseded";
  else if (storedStatus === "revoked" || current.lifecycle_status === "revoked") lifecycle = "revoked";
  else if (storedStatus === "expired" || current.lifecycle_status === "expired") lifecycle = "expired";
  else if (!currentlyAcceptable) lifecycle = "invalidated";

  return {
    signature_authentic: cryptographicallyValid,
    issuer_authorized: issuerAuthorized,
    policy_and_audience_match: true,
    currently_acceptable: currentlyAcceptable,
    cryptographically_valid: cryptographicallyValid,
    superseded,
    lifecycle_status: lifecycle,
    invalidation_reasons: Array.from(new Set(invalidationReasons)),
    store_available: storeAvailable,
    checked_at: current.checked_at,
    claims_current: claimsCurrent,
    evidence_current: evidenceCurrent,
    source: persistenceUsesDirectPostgres() ? "sovereign_pg" : "operational_demo_store",
  };
}

export async function evaluatePortableExportCurrentValidity(input: {
  record: DecisionReceiptRecord;
  signedIssuerAuthority: SignedIssuerAuthorityStatement;
  trustAnchorPublicJwk: JsonWebKey;
  /** When set, sovereign PG enforces Launchpad receipt binding (fail closed). */
  expectedApplicationId?: string | null;
  env?: Record<string, string | undefined>;
  now?: Date;
}): Promise<PortableExportValidityEvaluation> {
  const env = input.env ?? process.env;
  const now = input.now ?? new Date();
  const expectedEnvironment = verifierEnvironment(input.record);

  if (persistenceUsesDirectPostgres()) {
    const authoritative = await resolveAuthoritativeApplicationIdForIssuance({
      verificationDecisionId: input.record.verification_decision_id,
      partnerId: input.record.partner_id,
      callerApplicationId: input.expectedApplicationId,
    });
    return mapOperationalCurrentValidity({
      record: input.record,
      signedIssuerAuthority: input.signedIssuerAuthority,
      trustAnchorPublicJwk: input.trustAnchorPublicJwk,
      now,
      expectedApplicationId: authoritative.applicationId,
    });
  }

  if (getSovereignStagingPgPool(env)) {
    const evaluation = await evaluateSovereignCurrentValidity({
      record: input.record,
      signedIssuerAuthority: input.signedIssuerAuthority,
      trustAnchorPublicJwk: input.trustAnchorPublicJwk,
      expectedEnvironment,
      expectedApplicationId: input.expectedApplicationId,
      env,
      now,
    });
    return { ...evaluation, source: "sovereign_pg" };
  }

  return mapOperationalCurrentValidity({
    record: input.record,
    signedIssuerAuthority: input.signedIssuerAuthority,
    trustAnchorPublicJwk: input.trustAnchorPublicJwk,
    now,
    expectedApplicationId: input.expectedApplicationId,
  });
}
