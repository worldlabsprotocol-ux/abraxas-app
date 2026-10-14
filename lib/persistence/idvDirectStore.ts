// FILE: lib/persistence/idvDirectStore.ts
import "server-only";

import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import {
  identityVerificationUpsertKeys,
  normalizeHolderSubjectKey,
} from "@/lib/idv/holderIdentityRef";
import { idvDocumentSubjectColumns, idvReviewSessionAnchor } from "@/lib/idv/holderSubjectIdv";
import type { IdentityReviewSessionRow, IdentityReviewSessionStatus } from "@/lib/idv/identityReviewSession";
import type { BiometricAssessment } from "@/lib/idv/biometric/types";
import { queryAbraxasPg, withAbraxasPgTransaction } from "./pgPool";

function isMissingRelation(error: unknown): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code: string }).code === "42P01"
  );
}

export class IdvDirectStoreUnavailableError extends Error {
  constructor() {
    super("idv_direct_store_unavailable");
  }
}

export type IdentityVerificationPatch = Record<string, unknown> & {
  identity_verification_status?: string;
  credential_status?: string;
};

export async function upsertIdentityVerificationDirect(
  holder: string,
  patch: IdentityVerificationPatch,
): Promise<void> {
  const keys = identityVerificationUpsertKeys(holder, { includeHolderSubjectColumn: true });
  const now = new Date().toISOString();
  const merged: Record<string, unknown> = {
    wallet_address: keys.wallet_address,
    sui_address: keys.sui_address,
    holder_subject_id: keys.holder_subject_id,
    updated_at: now,
    ...patch,
  };
  delete merged.wallet_address;
  const patchOnly = { ...merged, wallet_address: keys.wallet_address };
  const allowed = new Set([
    "wallet_address",
    "sui_address",
    "holder_subject_id",
    "user_email",
    "status",
    "identity_verification_status",
    "credential_status",
    "document_type",
    "document_country",
    "document_state",
    "document_verified",
    "liveness_passed",
    "liveness_provider",
    "credential_jti",
    "veriff_session_id",
    "veriff_decision_id",
    "last_verified_at",
    "credential_issued_at",
    "error_message",
    "updated_at",
  ]);
  const entries = Object.entries(patchOnly).filter(
    ([k, v]) => allowed.has(k) && v !== undefined,
  );
  const columns = entries.map(([k]) => k);
  const values = entries.map(([, v]) => v);
  const placeholders = values.map((_, i) => `$${i + 1}`);
  const updates = columns
    .filter((c) => c !== "wallet_address")
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");

  try {
    await queryAbraxasPg(
      `insert into public.identity_verifications (${columns.join(", ")})
       values (${placeholders.join(", ")})
       on conflict (wallet_address) do update set ${updates}`,
      values,
    );
  } catch (error) {
    if (isMissingRelation(error)) throw new IdvDirectStoreUnavailableError();
    throw error;
  }
}

export async function insertIdentityVerificationEventDirect(input: {
  holderSubjectId: string;
  toStatus: string;
  source: string;
  veriffSessionId?: string | null;
}): Promise<void> {
  try {
    await queryAbraxasPg(
      `insert into public.identity_verification_events
       (sui_address, holder_subject_id, to_status, source, veriff_session_id, created_at)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        input.holderSubjectId,
        isChainNeutralHolderSubjectId(input.holderSubjectId) ? input.holderSubjectId : null,
        input.toStatus,
        input.source,
        input.veriffSessionId ?? null,
        new Date().toISOString(),
      ],
    );
  } catch (error) {
    if (isMissingRelation(error)) throw new IdvDirectStoreUnavailableError();
    throw error;
  }
}

export async function getIdentityVerificationBySubjectDirect(
  subjectKey: string,
): Promise<Record<string, unknown> | null> {
  const key = normalizeHolderSubjectKey(subjectKey);
  try {
    const result = await queryAbraxasPg<Record<string, unknown>>(
      `select * from public.identity_verifications
       where wallet_address = $1
          or holder_subject_id = $1
          or sui_address = $1
       limit 1`,
      [key],
    );
    return result.rows[0] ?? null;
  } catch (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }
}

export async function findPendingReviewSessionDirect(input: {
  suiAddress: string;
  partnerId?: string | null;
  verificationRequestId?: string | null;
}): Promise<IdentityReviewSessionRow | null> {
  const anchor = idvReviewSessionAnchor(normalizeHolderSubjectKey(input.suiAddress));
  const params: unknown[] = [];
  let subjectClause = "";
  if (anchor.holder_subject_id) {
    params.push(anchor.holder_subject_id);
    subjectClause = `holder_subject_id = $${params.length}`;
  } else if (anchor.sui_address) {
    params.push(anchor.sui_address);
    subjectClause = `sui_address = $${params.length}`;
  } else {
    return null;
  }

  let sql = `select * from public.identity_review_sessions where review_status = 'pending' and ${subjectClause}`;
  if (input.verificationRequestId) {
    params.push(input.verificationRequestId);
    sql += ` and verification_request_id = $${params.length}`;
  } else if (input.partnerId) {
    params.push(input.partnerId);
    sql += ` and partner_id = $${params.length}`;
  }
  sql += " limit 1";

  try {
    const result = await queryAbraxasPg<IdentityReviewSessionRow>(sql, params);
    return result.rows[0] ?? null;
  } catch (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }
}

export async function insertIdentityReviewSessionDirect(
  row: Omit<IdentityReviewSessionRow, "id" | "created_at" | "updated_at"> & { id?: string },
): Promise<IdentityReviewSessionRow> {
  const id = row.id ?? randomUUID();
  const now = new Date().toISOString();
  try {
    const result = await queryAbraxasPg<IdentityReviewSessionRow>(
      `insert into public.identity_review_sessions (
        id, created_at, updated_at, capture_session_id, sui_address, holder_subject_id,
        partner_id, policy_id, verification_request_id, review_status, engine_decision,
        eligibility_result, raw_evidence_purged_at, raw_evidence_retained_until,
        evidence_content_hash, purge_attempt_count, last_purge_error_code,
        reviewed_at, reviewer_id, reviewer_category, reason_code
      ) values (
        $1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
      ) returning *`,
      [
        id,
        now,
        row.capture_session_id,
        row.sui_address,
        row.holder_subject_id ?? null,
        row.partner_id,
        row.policy_id,
        row.verification_request_id,
        row.review_status,
        row.engine_decision,
        row.eligibility_result,
        row.raw_evidence_purged_at,
        row.raw_evidence_retained_until,
        row.evidence_content_hash,
        row.purge_attempt_count ?? 0,
        row.last_purge_error_code,
        row.reviewed_at,
        row.reviewer_id,
        row.reviewer_category,
        row.reason_code,
      ],
    );
    return result.rows[0];
  } catch (error) {
    if (isMissingRelation(error)) throw new IdvDirectStoreUnavailableError();
    throw error;
  }
}

export async function updateIdentityReviewSessionDirect(
  captureSessionId: string,
  patch: Partial<IdentityReviewSessionRow>,
): Promise<void> {
  const keys = Object.keys(patch).filter((k) => k !== "id" && k !== "created_at");
  if (keys.length === 0) return;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`);
  sets.push(`updated_at = $${keys.length + 2}`);
  const values = keys.map((k) => patch[k as keyof IdentityReviewSessionRow]);
  values.push(new Date().toISOString());

  try {
    await queryAbraxasPg(
      `update public.identity_review_sessions set ${sets.join(", ")}
       where capture_session_id = $1`,
      [captureSessionId, ...values],
    );
  } catch (error) {
    if (isMissingRelation(error)) throw new IdvDirectStoreUnavailableError();
    throw error;
  }
}

export async function upsertBiometricAssessmentDirect(
  assessment: BiometricAssessment,
): Promise<void> {
  const anchor = idvReviewSessionAnchor(normalizeHolderSubjectKey(assessment.sui_address));
  try {
    await queryAbraxasPg(
      `insert into public.identity_biometric_assessments (
        capture_session_id, sui_address, holder_subject_id,
        face_match_score, liveness_score, document_quality_score, selfie_quality_score,
        decision, assurance_level, review_method, engine_version, signals, analyzed_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      on conflict (capture_session_id) do update set
        decision = excluded.decision,
        face_match_score = excluded.face_match_score,
        liveness_score = excluded.liveness_score,
        signals = excluded.signals,
        analyzed_at = excluded.analyzed_at`,
      [
        assessment.capture_session_id,
        anchor.sui_address,
        anchor.holder_subject_id,
        assessment.scores.face_match,
        assessment.scores.liveness,
        assessment.scores.document_quality,
        assessment.scores.selfie_quality,
        assessment.decision,
        assessment.assurance_level,
        assessment.review_method,
        assessment.engine_version,
        JSON.stringify({
          ...assessment.signals,
          rejection_reasons: assessment.reasons,
          reason_codes: assessment.reason_codes,
        }),
        assessment.analyzed_at,
      ],
    );
  } catch (error) {
    if (isMissingRelation(error)) throw new IdvDirectStoreUnavailableError();
    throw error;
  }
}

export async function getBiometricAssessmentDirect(
  captureSessionId: string,
): Promise<BiometricAssessment | null> {
  try {
    const result = await queryAbraxasPg<Record<string, unknown>>(
      `select * from public.identity_biometric_assessments where capture_session_id = $1 limit 1`,
      [captureSessionId],
    );
    const data = result.rows[0];
    if (!data) return null;
    const signals = (data.signals ?? {}) as BiometricAssessment["signals"];
    return {
      capture_session_id: String(data.capture_session_id),
      sui_address: String(data.sui_address ?? data.holder_subject_id ?? ""),
      scores: {
        face_match: Number(data.face_match_score),
        liveness: Number(data.liveness_score),
        document_quality: Number(data.document_quality_score),
        selfie_quality: Number(data.selfie_quality_score),
      },
      decision: String(data.decision) as BiometricAssessment["decision"],
      assurance_level: String(data.assurance_level) as BiometricAssessment["assurance_level"],
      review_method: String(data.review_method) as BiometricAssessment["review_method"],
      engine_version: String(data.engine_version),
      signals,
      reasons: Array.isArray(signals.rejection_reasons)
        ? (signals.rejection_reasons as string[])
        : [],
      reason_codes: Array.isArray(signals.reason_codes)
        ? (signals.reason_codes as string[])
        : [],
      analyzed_at: String(data.analyzed_at),
    };
  } catch (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }
}

export async function insertPassportDocumentDirect(row: Record<string, unknown>): Promise<{ id: string }> {
  const id = (row.id as string | undefined) ?? randomUUID();
  try {
    await queryAbraxasPg(
      `insert into public.passport_documents (
        id, user_email, stamp_id, file_name, storage_path, status,
        sui_address, holder_subject_id, document_type, capture_session_id, legal_name,
        created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now(), now()
      )`,
      [
        id,
        row.user_email,
        row.stamp_id ?? "identity",
        row.file_name,
        row.storage_path,
        row.status ?? "submitted",
        row.sui_address ?? null,
        row.holder_subject_id ?? null,
        row.document_type ?? null,
        row.capture_session_id ?? null,
        row.legal_name ?? null,
      ],
    );
    return { id };
  } catch (error) {
    if (isMissingRelation(error)) throw new IdvDirectStoreUnavailableError();
    throw error;
  }
}

export async function updatePassportDocumentsBySessionDirect(
  captureSessionId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const keys = Object.keys(patch);
  if (keys.length === 0) return;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`);
  sets.push(`updated_at = $${keys.length + 2}`);
  const values = keys.map((k) => patch[k]);
  values.push(new Date().toISOString());
  await queryAbraxasPg(
    `update public.passport_documents set ${sets.join(", ")} where capture_session_id = $1`,
    [captureSessionId, ...values],
  );
}

export async function getPassportDocumentBySessionDirect(
  captureSessionId: string,
): Promise<Record<string, unknown> | null> {
  const result = await queryAbraxasPg<Record<string, unknown>>(
    `select * from public.passport_documents where capture_session_id = $1 limit 1`,
    [captureSessionId],
  );
  return result.rows[0] ?? null;
}

export async function insertReviewAuditLogDirect(row: Record<string, unknown>): Promise<void> {
  await queryAbraxasPg(
    `insert into public.identity_review_audit_log (
      capture_session_id, passport_document_id, sui_address, reviewer_id, action,
      previous_status, new_status, engine_decision, reviewer_decision,
      rejection_reasons, notes, biometric_engine_version
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      row.capture_session_id ?? null,
      row.passport_document_id ?? null,
      row.sui_address ?? null,
      row.reviewer_id,
      row.action,
      row.previous_status ?? null,
      row.new_status,
      row.engine_decision ?? null,
      row.reviewer_decision,
      row.rejection_reasons ?? null,
      row.notes ?? null,
      row.biometric_engine_version ?? null,
    ],
  );
}

export async function upsertAbraxasCredentialDirect(row: {
  jti: string;
  holder_wallet: string;
  sui_address: string | null;
  issuer: string;
  jurisdiction: string;
  document_type: string;
  verification_level: string;
  world_id_verified: boolean;
  issuance_date: string;
  expiration_date: string;
  credential_jwt: string;
}): Promise<void> {
  try {
    await queryAbraxasPg(
      `insert into public.abraxas_credentials (
        jti, holder_wallet, issuer, jurisdiction, document_type, verification_level,
        world_id_verified, issuance_date, expiration_date, credential_jwt
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      on conflict (jti) do update set
        credential_jwt = excluded.credential_jwt,
        expiration_date = excluded.expiration_date`,
      [
        row.jti,
        row.holder_wallet,
        row.issuer,
        row.jurisdiction,
        row.document_type,
        row.verification_level,
        row.world_id_verified,
        row.issuance_date,
        row.expiration_date,
        row.credential_jwt,
      ],
    );
  } catch (error) {
    if (isMissingRelation(error)) throw new IdvDirectStoreUnavailableError();
    throw error;
  }
}

export async function recordIdvConsentDirect(input: {
  holderSubjectId: string;
  consentVersion: string;
  consentScope: string;
}): Promise<void> {
  await queryAbraxasPg(
    `insert into public.passport_idv_consent_records
     (holder_subject_id, consent_version, consent_scope) values ($1,$2,$3)`,
    [input.holderSubjectId, input.consentVersion, input.consentScope],
  );
}

export class EvidenceCustodyConflictError extends Error {
  readonly code = "evidence_custody_conflict" as const;

  constructor() {
    super("evidence_custody_conflict");
  }
}

export async function registerEvidenceCustodyDirect(input: {
  holderSubjectId: string;
  captureSessionId: string;
  artifactKind: string;
  storagePath: string;
  contentSha256: string;
  retainedUntil?: string | null;
}): Promise<void> {
  const inserted = await queryAbraxasPg<{ holder_subject_id: string }>(
    `insert into public.abraxas_evidence_custody (
      holder_subject_id, capture_session_id, artifact_kind, storage_path, content_sha256, retained_until
    ) values ($1,$2,$3,$4,$5,$6)
    on conflict (capture_session_id, artifact_kind) do nothing
    returning holder_subject_id`,
    [
      input.holderSubjectId,
      input.captureSessionId,
      input.artifactKind,
      input.storagePath,
      input.contentSha256,
      input.retainedUntil ?? null,
    ],
  );
  if (inserted.rows[0]?.holder_subject_id) {
    if (inserted.rows[0].holder_subject_id !== input.holderSubjectId) {
      throw new EvidenceCustodyConflictError();
    }
    return;
  }
  const existing = await queryAbraxasPg<{ holder_subject_id: string; storage_path: string; content_sha256: string }>(
    `select holder_subject_id, storage_path, content_sha256 from public.abraxas_evidence_custody
     where capture_session_id = $1 and artifact_kind = $2 limit 1`,
    [input.captureSessionId, input.artifactKind],
  );
  const row = existing.rows[0];
  if (!row) throw new IdvDirectStoreUnavailableError();
  if (row.holder_subject_id !== input.holderSubjectId) {
    throw new EvidenceCustodyConflictError();
  }
  if (row.storage_path !== input.storagePath || row.content_sha256 !== input.contentSha256) {
    throw new EvidenceCustodyConflictError();
  }
}

export async function appendEvidenceAccessAuditDirect(input: {
  holderSubjectId: string;
  captureSessionId?: string;
  action: string;
  actor: string;
  outcome: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  await queryAbraxasPg(
    `insert into public.abraxas_evidence_access_audit
     (holder_subject_id, capture_session_id, action, actor, outcome, detail)
     values ($1,$2,$3,$4,$5,$6)`,
    [
      input.holderSubjectId,
      input.captureSessionId ?? null,
      input.action,
      input.actor,
      input.outcome,
      input.detail ? JSON.stringify(input.detail) : null,
    ],
  );
}

export async function assertEvidenceCustodyOwnerDirect(
  holderSubjectId: string,
  captureSessionId: string,
  artifactKind: string,
): Promise<boolean> {
  const result = await queryAbraxasPg<{ holder_subject_id: string; storage_path: string }>(
    `select holder_subject_id, storage_path from public.abraxas_evidence_custody
     where capture_session_id = $1 and artifact_kind = $2 limit 1`,
    [captureSessionId, artifactKind],
  );
  const row = result.rows[0];
  return row?.holder_subject_id === holderSubjectId;
}

export async function getEvidenceCustodyRecordDirect(
  captureSessionId: string,
  artifactKind: string,
): Promise<{ holder_subject_id: string; storage_path: string; content_sha256: string } | null> {
  const result = await queryAbraxasPg<{ holder_subject_id: string; storage_path: string; content_sha256: string }>(
    `select holder_subject_id, storage_path, content_sha256 from public.abraxas_evidence_custody
     where capture_session_id = $1 and artifact_kind = $2 limit 1`,
    [captureSessionId, artifactKind],
  );
  return result.rows[0] ?? null;
}

/** Transactional admin approve: audit + document + review session + verification state. */
export async function applyAdminReviewDecisionDirect(input: {
  captureSessionId: string;
  documentId: string;
  holderSubjectId: string;
  reviewerId: string;
  action: "approve" | "reject" | "request_resubmission";
  reviewerDecision: string;
  engineDecision: string | null;
  documentStatus: string;
  reviewStatus: IdentityReviewSessionStatus;
  verificationPatch: IdentityVerificationPatch;
  auditRow: Record<string, unknown>;
}): Promise<void> {
  await withAbraxasPgTransaction(async (client: PoolClient) => {
    const docUpdate = await client.query(
      `update public.passport_documents set status = $2, reviewed_at = now(), reviewed_by = $3, updated_at = now()
       where capture_session_id = $1 and (holder_subject_id = $4 or holder_subject_id is null)`,
      [input.captureSessionId, input.documentStatus, input.reviewerId, input.holderSubjectId],
    );
    if ((docUpdate.rowCount ?? 0) < 1) {
      throw new IdvDirectStoreUnavailableError();
    }
    const sessionUpdate = await client.query(
      `update public.identity_review_sessions set review_status = $2, reviewed_at = now(),
       reviewer_id = $3, updated_at = now() where capture_session_id = $1
       and (holder_subject_id = $4 or holder_subject_id is null)`,
      [input.captureSessionId, input.reviewStatus, input.reviewerId, input.holderSubjectId],
    );
    if ((sessionUpdate.rowCount ?? 0) < 1) {
      throw new IdvDirectStoreUnavailableError();
    }
    const keys = identityVerificationUpsertKeys(input.holderSubjectId, { includeHolderSubjectColumn: true });
    await client.query(
      `insert into public.identity_verifications (wallet_address, sui_address, holder_subject_id, updated_at, status)
       values ($1,$2,$3, now(), 'pending')
       on conflict (wallet_address) do nothing`,
      [keys.wallet_address, keys.sui_address, keys.holder_subject_id],
    );
    const patchEntries = Object.entries(input.verificationPatch);
    if (patchEntries.length > 0) {
      const setClause = patchEntries.map(([k], i) => `${k} = $${i + 2}`).join(", ");
      const ivUpdate = await client.query(
        `update public.identity_verifications set ${setClause}, updated_at = now()
         where wallet_address = $1 or holder_subject_id = $1`,
        [keys.wallet_address, ...patchEntries.map(([, v]) => v)],
      );
      if ((ivUpdate.rowCount ?? 0) < 1) {
        throw new IdvDirectStoreUnavailableError();
      }
    }
    await client.query(
      `insert into public.identity_review_audit_log (
        capture_session_id, passport_document_id, sui_address, reviewer_id, action,
        previous_status, new_status, engine_decision, reviewer_decision
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        input.captureSessionId,
        input.documentId,
        null,
        input.reviewerId,
        input.action,
        "submitted",
        input.documentStatus,
        input.engineDecision,
        input.reviewerDecision,
      ],
    );
  });
}

export function idvDocumentColumnsForSubject(subjectKey: string): ReturnType<typeof idvDocumentSubjectColumns> {
  return idvDocumentSubjectColumns(subjectKey);
}

export async function countBiometricAssessmentsInWindowDirect(
  holderSubjectKey: string,
  sinceIso: string,
): Promise<number> {
  const anchor = idvReviewSessionAnchor(normalizeHolderSubjectKey(holderSubjectKey));
  const params: unknown[] = [sinceIso];
  let subjectClause = "";
  if (anchor.holder_subject_id) {
    params.push(anchor.holder_subject_id);
    subjectClause = `holder_subject_id = $${params.length}`;
  } else if (anchor.sui_address) {
    params.push(anchor.sui_address);
    subjectClause = `sui_address = $${params.length}`;
  } else {
    return 0;
  }
  const result = await queryAbraxasPg<{ count: string }>(
    `select count(*)::text as count from public.identity_biometric_assessments
     where ${subjectClause} and analyzed_at >= $1`,
    params,
  );
  return Number.parseInt(result.rows[0]?.count ?? "0", 10);
}

export async function countPendingIdentityReviewQueueDirect(): Promise<number> {
  const result = await queryAbraxasPg<{ count: string }>(
    `select count(*)::text as count from public.passport_documents
     where stamp_id = 'identity' and status in ('submitted','under_review')`,
  );
  return Number.parseInt(result.rows[0]?.count ?? "0", 10);
}

export async function countPendingIdentityDocumentsDirect(holderSubjectKey: string): Promise<number> {
  const cols = idvDocumentSubjectColumns(normalizeHolderSubjectKey(holderSubjectKey));
  const params: unknown[] = [];
  let clause = "";
  if (cols.holder_subject_id) {
    params.push(cols.holder_subject_id);
    clause = "holder_subject_id = $1";
  } else if (cols.sui_address) {
    params.push(cols.sui_address);
    clause = "sui_address = $1";
  } else {
    return 0;
  }
  const result = await queryAbraxasPg<{ count: string }>(
    `select count(*)::text as count from public.passport_documents
     where ${clause} and stamp_id = 'identity' and status in ('submitted','under_review')`,
    params,
  );
  return Number.parseInt(result.rows[0]?.count ?? "0", 10);
}

export async function getPassportDocumentByIdDirect(documentId: string): Promise<Record<string, unknown> | null> {
  const result = await queryAbraxasPg<Record<string, unknown>>(
    `select * from public.passport_documents where id = $1 and stamp_id = 'identity' limit 1`,
    [documentId],
  );
  return result.rows[0] ?? null;
}

export async function updateBiometricReviewerDecisionDirect(input: {
  captureSessionId: string;
  reviewerDecision: string;
  reviewerId: string;
  reviewedAt: string;
}): Promise<void> {
  const result = await queryAbraxasPg(
    `update public.identity_biometric_assessments
     set reviewer_decision = $2, reviewer_id = $3, reviewed_at = $4
     where capture_session_id = $1`,
    [input.captureSessionId, input.reviewerDecision, input.reviewerId, input.reviewedAt],
  );
}

export async function listPassportDocumentsForQueueDirect(input: {
  status: string;
  partnerId?: string | null;
  limit?: number;
}): Promise<Record<string, unknown>[]> {
  const limit = input.limit ?? 200;
  let sql = `select * from public.passport_documents where stamp_id = 'identity'`;
  const params: unknown[] = [];
  if (input.status === "pending") {
    sql += ` and status in ('submitted','under_review')`;
  } else if (input.status !== "all") {
    params.push(input.status);
    sql += ` and status = $${params.length}`;
  }
  params.push(limit);
  sql += ` order by created_at desc limit $${params.length}`;
  const result = await queryAbraxasPg<Record<string, unknown>>(sql, params);
  return result.rows;
}

export async function listReviewSessionsByCaptureIdsDirect(
  captureSessionIds: string[],
  partnerId?: string | null,
): Promise<IdentityReviewSessionRow[]> {
  if (captureSessionIds.length === 0) return [];
  const params: unknown[] = [captureSessionIds];
  let sql = `select * from public.identity_review_sessions where capture_session_id = any($1::text[])`;
  if (partnerId) {
    params.push(partnerId);
    sql += ` and partner_id = $${params.length}`;
  }
  const result = await queryAbraxasPg<IdentityReviewSessionRow>(sql, params);
  return result.rows;
}

export async function getIdentityReviewSessionByCaptureDirect(
  captureSessionId: string,
): Promise<IdentityReviewSessionRow | null> {
  const result = await queryAbraxasPg<IdentityReviewSessionRow>(
    `select * from public.identity_review_sessions where capture_session_id = $1 limit 1`,
    [captureSessionId],
  );
  return result.rows[0] ?? null;
}

export async function listBiometricAssessmentsByCaptureIdsDirect(
  captureSessionIds: string[],
): Promise<Record<string, unknown>[]> {
  if (captureSessionIds.length === 0) return [];
  const result = await queryAbraxasPg<Record<string, unknown>>(
    `select * from public.identity_biometric_assessments where capture_session_id = any($1::text[])`,
    [captureSessionIds],
  );
  return result.rows;
}
