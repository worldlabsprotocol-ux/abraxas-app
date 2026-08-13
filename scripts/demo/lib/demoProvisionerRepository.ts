// FILE: scripts/demo/lib/demoProvisionerRepository.ts
// Transaction-bound SQL repository for Partner Sandbox holder provisioning.

import { createHash } from "node:crypto";
import type { ProvisionerClaimInsert } from "./demoProvisionerClaims";
import {
  DEMO_PROVISIONER_SOURCE,
  DEMO_SYNTHETIC_DOCUMENT_COUNTRY,
  DEMO_SYNTHETIC_DOCUMENT_TYPE,
  manualEvidenceReference,
  sandboxEvidenceReference,
} from "./demoProvisionerConfig";
import { DemoProvisionerConflictError } from "./demoProvisionerGuard";
import type { ProvisionerPgExecutor } from "./demoProvisionerPgSession";

class DemoProvisionerRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoProvisionerRepositoryError";
  }
}

function assertRowCount(
  label: string,
  rows: unknown[],
  expected: { min: number; max: number },
): void {
  if (rows.length < expected.min || rows.length > expected.max) {
    throw new DemoProvisionerRepositoryError(
      `${label} returned ${rows.length} rows; expected ${expected.min}-${expected.max}`,
    );
  }
}

export interface IdentityVerificationRow {
  wallet_address: string;
  sui_address: string | null;
  status: string;
  identity_verification_status: string | null;
  credential_status: string | null;
  credential_jti: string | null;
  veriff_decision_id: string | null;
  revoked_at?: string | null;
}

export interface AbraxasCredentialRow {
  jti: string;
  holder_wallet: string;
  sui_address: string | null;
  issuer: string;
  jurisdiction: string;
  document_type: string;
  expiration_date: string;
  revoked_at: string | null;
  credential_jwt: string;
}

export interface CredentialClaimRow {
  id: string;
  subject_id: string;
  claim_type: string;
  issuer_id: string;
  assurance_level: string | null;
  claim_value: Record<string, unknown>;
  issued_at: string;
  expires_at: string | null;
  status: string;
  evidence_reference: string | null;
  policy_scope: string | null;
  credential_jti: string | null;
}

export interface RecoveryMarkerBundle {
  provisionId: string;
  subjectId: string;
  identity: IdentityVerificationRow;
  credential: AbraxasCredentialRow | null;
  manualEvidenceClaims: CredentialClaimRow[];
  sandboxScreeningClaim: CredentialClaimRow | null;
}

function hashAuditPayload(payload: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(payload), "utf8").digest("hex");
}

export async function fetchIdentityBySubject(
  tx: ProvisionerPgExecutor,
  subjectId: string,
): Promise<IdentityVerificationRow | null> {
  const result = await tx.query<IdentityVerificationRow>(
    `SELECT wallet_address, sui_address, status, identity_verification_status,
            credential_status, credential_jti, veriff_decision_id
     FROM public.identity_verifications
     WHERE wallet_address = $1 OR sui_address = $1`,
    [subjectId],
  );
  assertRowCount("fetchIdentityBySubject", result.rows, { min: 0, max: 1 });
  return result.rows[0] ?? null;
}

export async function fetchIdentitiesByProvisionId(
  tx: ProvisionerPgExecutor,
  provisionId: string,
): Promise<IdentityVerificationRow[]> {
  const result = await tx.query<IdentityVerificationRow>(
    `SELECT wallet_address, sui_address, status, identity_verification_status,
            credential_status, credential_jti, veriff_decision_id
     FROM public.identity_verifications
     WHERE veriff_decision_id = $1`,
    [provisionId],
  );
  return result.rows;
}

export async function fetchCredentialByJti(
  tx: ProvisionerPgExecutor,
  jti: string,
): Promise<AbraxasCredentialRow | null> {
  const result = await tx.query<AbraxasCredentialRow>(
    `SELECT jti, holder_wallet, sui_address, issuer, jurisdiction, document_type,
            expiration_date, revoked_at, credential_jwt
     FROM public.abraxas_credentials
     WHERE jti = $1`,
    [jti],
  );
  assertRowCount("fetchCredentialByJti", result.rows, { min: 0, max: 1 });
  return result.rows[0] ?? null;
}

export async function fetchActiveClaimsForSubject(
  tx: ProvisionerPgExecutor,
  subjectId: string,
): Promise<CredentialClaimRow[]> {
  const result = await tx.query<CredentialClaimRow>(
    `SELECT id, subject_id, claim_type, issuer_id, assurance_level, claim_value,
            issued_at, expires_at, status, evidence_reference, policy_scope, credential_jti
     FROM public.credential_claims
     WHERE subject_id = $1 AND status = 'active'
     ORDER BY issued_at DESC`,
    [subjectId],
  );
  const now = Date.now();
  return result.rows.filter(
    (row) => !row.expires_at || new Date(row.expires_at).getTime() > now,
  );
}

export async function fetchClaimsByEvidenceReference(
  tx: ProvisionerPgExecutor,
  evidenceReference: string,
): Promise<CredentialClaimRow[]> {
  const result = await tx.query<CredentialClaimRow>(
    `SELECT id, subject_id, claim_type, issuer_id, assurance_level, claim_value,
            issued_at, expires_at, status, evidence_reference, policy_scope, credential_jti
     FROM public.credential_claims
     WHERE evidence_reference = $1
     ORDER BY issued_at DESC`,
    [evidenceReference],
  );
  return result.rows;
}

export function assertNoProvisionerConflict(input: {
  subjectId: string;
  provisionId: string;
  identity: IdentityVerificationRow | null;
  credential: AbraxasCredentialRow | null;
}): void {
  if (!input.identity) return;

  if (
    input.identity.veriff_decision_id &&
    input.identity.veriff_decision_id !== input.provisionId
  ) {
    throw new DemoProvisionerConflictError(
      "Subject already provisioned with a different provision_id",
    );
  }

  if (input.credential?.revoked_at) {
    throw new DemoProvisionerConflictError(
      "Subject credential is revoked — Phase C.1 cleanup required",
    );
  }

  if (
    input.credential &&
    new Date(input.credential.expiration_date).getTime() < Date.now()
  ) {
    throw new DemoProvisionerConflictError(
      "Subject credential is expired — Phase C.1 cleanup required",
    );
  }

  if (
    input.identity.status !== "approved" &&
    input.identity.identity_verification_status !== "approved"
  ) {
    throw new DemoProvisionerConflictError(
      "Subject identity verification is not approved — Phase C.1 cleanup required",
    );
  }
}

export async function upsertIdentityVerification(
  tx: ProvisionerPgExecutor,
  input: {
    subjectId: string;
    provisionId: string;
    jti: string;
    now: Date;
  },
): Promise<void> {
  const nowIso = input.now.toISOString();
  const identityResult = await tx.query<{ wallet_address: string }>(
    `INSERT INTO public.identity_verifications (
       wallet_address, sui_address, user_email,
       document_type, document_country, document_state,
       document_verified, liveness_passed, liveness_provider,
       status, identity_verification_status, credential_status,
       credential_jti, veriff_session_id, veriff_decision_id,
       last_verified_at, credential_issued_at, error_message, updated_at
     ) VALUES (
       $1, $1, NULL,
       $2, $3, NULL,
       TRUE, TRUE, 'manual_review',
       'approved', 'approved', 'active',
       $4, NULL, $5,
       $6, $6, NULL, $6
     )
     ON CONFLICT (wallet_address) DO UPDATE SET
       sui_address = EXCLUDED.sui_address,
       document_type = EXCLUDED.document_type,
       document_country = EXCLUDED.document_country,
       document_state = EXCLUDED.document_state,
       document_verified = EXCLUDED.document_verified,
       liveness_passed = EXCLUDED.liveness_passed,
       liveness_provider = EXCLUDED.liveness_provider,
       status = EXCLUDED.status,
       identity_verification_status = EXCLUDED.identity_verification_status,
       credential_status = EXCLUDED.credential_status,
       credential_jti = EXCLUDED.credential_jti,
       veriff_decision_id = EXCLUDED.veriff_decision_id,
       last_verified_at = EXCLUDED.last_verified_at,
       credential_issued_at = EXCLUDED.credential_issued_at,
       error_message = NULL,
       updated_at = EXCLUDED.updated_at
     RETURNING wallet_address`,
    [
      input.subjectId,
      DEMO_SYNTHETIC_DOCUMENT_TYPE,
      DEMO_SYNTHETIC_DOCUMENT_COUNTRY,
      input.jti,
      input.provisionId,
      nowIso,
    ],
  );
  assertRowCount("upsertIdentityVerification", identityResult.rows, { min: 1, max: 1 });

  const eventResult = await tx.query<{ id: string }>(
    `INSERT INTO public.identity_verification_events (
       sui_address, from_status, to_status, source, veriff_session_id, created_at
     ) VALUES ($1, NULL, 'approved', $2, NULL, $3)
     RETURNING id`,
    [input.subjectId, DEMO_PROVISIONER_SOURCE, nowIso],
  );
  assertRowCount("insertIdentityVerificationEvent", eventResult.rows, { min: 1, max: 1 });
}

export async function upsertAbraxasCredential(
  tx: ProvisionerPgExecutor,
  input: {
    subjectId: string;
    jti: string;
    issuer: string;
    jurisdiction: string;
    documentType: string;
    jwt: string;
    now: Date;
    expiresAt: Date;
  },
): Promise<void> {
  const credentialResult = await tx.query<{ jti: string }>(
    `INSERT INTO public.abraxas_credentials (
       jti, holder_wallet, sui_address, issuer, jurisdiction, document_type,
       verification_level, world_id_verified, issuance_date, expiration_date,
       credential_jwt
     ) VALUES (
       $1, $2, $2, $3, $4, $5,
       'standard', FALSE, $6, $7,
       $8
     )
     ON CONFLICT (jti) DO UPDATE SET
       holder_wallet = EXCLUDED.holder_wallet,
       sui_address = EXCLUDED.sui_address,
       issuer = EXCLUDED.issuer,
       jurisdiction = EXCLUDED.jurisdiction,
       document_type = EXCLUDED.document_type,
       expiration_date = EXCLUDED.expiration_date,
       credential_jwt = EXCLUDED.credential_jwt
     RETURNING jti`,
    [
      input.jti,
      input.subjectId,
      input.issuer,
      input.jurisdiction,
      input.documentType,
      input.now.toISOString(),
      input.expiresAt.toISOString(),
      input.jwt,
    ],
  );
  assertRowCount("upsertAbraxasCredential", credentialResult.rows, { min: 1, max: 1 });
}

export async function upsertWalletBinding(
  tx: ProvisionerPgExecutor,
  input: { subjectId: string; now: Date },
): Promise<void> {
  const bindingResult = await tx.query<{ subject_id: string }>(
    `INSERT INTO public.wallet_bindings (
       subject_id, chain, wallet_address, binding_method, verified_at, revoked_at, binding_status
     ) VALUES ($1, 'sui', $1, 'zklogin', $2, NULL, 'active')
     ON CONFLICT (subject_id, wallet_address) DO UPDATE SET
       binding_method = EXCLUDED.binding_method,
       verified_at = EXCLUDED.verified_at,
       revoked_at = NULL,
       binding_status = 'active'
     RETURNING subject_id`,
    [input.subjectId, input.now.toISOString()],
  );
  assertRowCount("upsertWalletBinding", bindingResult.rows, { min: 1, max: 1 });
}

export async function expireActiveClaimType(
  tx: ProvisionerPgExecutor,
  input: { subjectId: string; claimType: string; now: Date },
): Promise<void> {
  await tx.query(
    `UPDATE public.credential_claims
     SET status = 'expired', updated_at = $3
     WHERE subject_id = $1 AND claim_type = $2 AND status = 'active'`,
    [input.subjectId, input.claimType, input.now.toISOString()],
  );
}

export async function insertCredentialClaim(
  tx: ProvisionerPgExecutor,
  claim: ProvisionerClaimInsert,
  now: Date,
): Promise<void> {
  const insertResult = await tx.query<{ id: string }>(
    `INSERT INTO public.credential_claims (
       subject_id, credential_jti, claim_type, claim_value, issuer_id,
       assurance_level, issued_at, expires_at, status, revocation_reference,
       evidence_reference, jurisdiction, policy_scope, updated_at
     ) VALUES (
       $1, $2, $3, $4::jsonb, $5,
       $6, $7, $8, 'active', $9,
       $10, $11, $12, $13
     )
     RETURNING id`,
    [
      claim.subject_id,
      claim.credential_jti,
      claim.claim_type,
      JSON.stringify(claim.claim_value),
      claim.issuer_id,
      claim.assurance_level,
      claim.issued_at,
      claim.expires_at,
      claim.revocation_reference,
      claim.evidence_reference,
      claim.jurisdiction,
      claim.policy_scope,
      now.toISOString(),
    ],
  );
  assertRowCount("insertCredentialClaim", insertResult.rows, { min: 1, max: 1 });
}

export async function upsertProvisionerClaims(
  tx: ProvisionerPgExecutor,
  claims: ProvisionerClaimInsert[],
  now: Date,
): Promise<void> {
  for (const claim of claims) {
    await expireActiveClaimType(tx, {
      subjectId: claim.subject_id,
      claimType: claim.claim_type,
      now,
    });
    await insertCredentialClaim(tx, claim, now);
  }
}

export async function appendProvisionerAuditEvent(
  tx: ProvisionerPgExecutor,
  input: {
    actorType: string;
    actorId: string;
    action: string;
    objectType: string;
    objectId: string;
    metadata?: Record<string, unknown>;
    now: Date;
  },
): Promise<void> {
  const payload = {
    actor_type: input.actorType,
    actor_id: input.actorId,
    action: input.action,
    object_type: input.objectType,
    object_id: input.objectId,
    metadata: input.metadata ?? {},
    ts: input.now.toISOString(),
  };

  const auditResult = await tx.query<{ id: string }>(
    `INSERT INTO public.audit_events (
       actor_type, actor_id, action, object_type, object_id, metadata, event_hash, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
     RETURNING id`,
    [
      input.actorType,
      input.actorId,
      input.action,
      input.objectType,
      input.objectId,
      JSON.stringify(input.metadata ?? {}),
      hashAuditPayload(payload),
      input.now.toISOString(),
    ],
  );
  assertRowCount("appendProvisionerAuditEvent", auditResult.rows, { min: 1, max: 1 });
}

export async function loadRecoveryMarkers(
  tx: ProvisionerPgExecutor,
  provisionId: string,
): Promise<RecoveryMarkerBundle> {
  const identities = await fetchIdentitiesByProvisionId(tx, provisionId);
  if (identities.length === 0) {
    throw new DemoProvisionerConflictError("No identity_verifications row matches provision_id");
  }
  if (identities.length > 1) {
    throw new DemoProvisionerConflictError(
      "Multiple identity_verifications rows match provision_id",
    );
  }

  const identity = identities[0]!;
  const subjectId = identity.sui_address ?? identity.wallet_address;

  const manualClaims = await fetchClaimsByEvidenceReference(
    tx,
    manualEvidenceReference(provisionId),
  );
  const sandboxClaims = await fetchClaimsByEvidenceReference(
    tx,
    sandboxEvidenceReference(provisionId),
  );

  const manualActive = manualClaims.filter((row) => row.status === "active");
  if (manualActive.length === 0) {
    throw new DemoProvisionerConflictError("No active manual_review marker claims found");
  }

  for (const row of manualActive) {
    if (row.subject_id !== subjectId) {
      throw new DemoProvisionerConflictError("Manual marker claims map to multiple subjects");
    }
  }

  const sandboxActive = sandboxClaims.filter((row) => row.status === "active");
  if (sandboxActive.length > 1) {
    throw new DemoProvisionerConflictError("Multiple active sandbox screening marker claims found");
  }

  const sandboxScreeningClaim = sandboxActive[0] ?? null;
  if (sandboxScreeningClaim && sandboxScreeningClaim.subject_id !== subjectId) {
    throw new DemoProvisionerConflictError("Sandbox marker claim subject mismatch");
  }

  let credential: AbraxasCredentialRow | null = null;
  if (identity.credential_jti) {
    credential = await fetchCredentialByJti(tx, identity.credential_jti);
    if (!credential) {
      throw new DemoProvisionerConflictError("identity_verifications references missing credential");
    }
    if (credential.sui_address && credential.sui_address !== subjectId) {
      throw new DemoProvisionerConflictError("Credential subject mismatch");
    }
  } else if (identity.credential_status === "active") {
    throw new DemoProvisionerConflictError("Active credential status without credential_jti");
  }

  return {
    provisionId,
    subjectId,
    identity,
    credential,
    manualEvidenceClaims: manualActive,
    sandboxScreeningClaim,
  };
}

export async function provisionIdentityBundle(
  tx: ProvisionerPgExecutor,
  input: {
    subjectId: string;
    provisionId: string;
    jti: string;
    issuer: string;
    jurisdiction: string;
    documentType: string;
    jwt: string;
    expiresAt: Date;
    manualClaims: ProvisionerClaimInsert[];
    now: Date;
  },
): Promise<void> {
  await upsertIdentityVerification(tx, {
    subjectId: input.subjectId,
    provisionId: input.provisionId,
    jti: input.jti,
    now: input.now,
  });

  await upsertAbraxasCredential(tx, {
    subjectId: input.subjectId,
    jti: input.jti,
    issuer: input.issuer,
    jurisdiction: input.jurisdiction,
    documentType: input.documentType,
    jwt: input.jwt,
    now: input.now,
    expiresAt: input.expiresAt,
  });

  await upsertWalletBinding(tx, { subjectId: input.subjectId, now: input.now });
  await upsertProvisionerClaims(tx, input.manualClaims, input.now);

  await appendProvisionerAuditEvent(tx, {
    actorType: "system",
    actorId: "claims_service",
    action: "claims.upserted",
    objectType: "subject",
    objectId: input.subjectId,
    metadata: {
      claim_types: input.manualClaims.map((claim) => claim.claim_type),
      provision_id: input.provisionId,
      synthetic_demo_holder: true,
    },
    now: input.now,
  });
}

export async function provisionSandboxScreening(
  tx: ProvisionerPgExecutor,
  input: {
    subjectId: string;
    provisionId: string;
    screeningClaim: ProvisionerClaimInsert;
    now: Date;
  },
): Promise<{ screeningExpiresAt: string }> {
  await upsertProvisionerClaims(tx, [input.screeningClaim], input.now);

  await appendProvisionerAuditEvent(tx, {
    actorType: "system",
    actorId: "abraxas_sandbox",
    action: "screening.sandbox_demo",
    objectType: "subject",
    objectId: input.subjectId,
    metadata: {
      reference: sandboxEvidenceReference(input.provisionId),
      environment: "sandbox",
      provision_id: input.provisionId,
    },
    now: input.now,
  });

  return { screeningExpiresAt: input.screeningClaim.expires_at! };
}
