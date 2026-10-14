import "server-only";

import { createHash } from "crypto";
import type { PoolClient } from "pg";
import type { AdminReviewAction } from "@/lib/idv/adminReviewService";
import type { ReviewerDecision } from "@/lib/idv/adminReviewService";
import type { BiometricDecision } from "@/lib/idv/biometric/types";
import { withAbraxasPgTransaction } from "./pgPool";

export class SovereignReviewConflictError extends Error {
  readonly code = "review_conflict" as const;
  constructor(message = "review_conflict") {
    super(message);
  }
}

export class SovereignReviewStateError extends Error {
  readonly code = "review_not_pending" as const;
  constructor(message = "review_not_pending") {
    super(message);
  }
}

function reviewLockKey(captureSessionId: string): { classId: number; objectId: number } {
  const digest = createHash("sha256").update(`abx_review:${captureSessionId}`, "utf8").digest();
  return { classId: 555003, objectId: digest.readInt32BE(0) };
}

const PENDING_DOC_STATUSES = ["submitted", "under_review"];
const TERMINAL_DOC_STATUSES = ["accepted", "rejected", "resubmission_requested"];

export async function withSovereignReviewSessionLock<T>(
  captureSessionId: string,
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withAbraxasPgTransaction(async (client) => {
    const { classId, objectId } = reviewLockKey(captureSessionId);
    await client.query(`select pg_advisory_xact_lock($1::int, $2::int)`, [classId, objectId]);
    return run(client);
  });
}

export async function assertReviewSessionPendingDirect(
  client: PoolClient,
  captureSessionId: string,
  action: AdminReviewAction,
): Promise<{ previousDocStatus: string; sessionReviewStatus: string | null }> {
  const session = await client.query<{ review_status: string }>(
    `select review_status from public.identity_review_sessions
     where capture_session_id = $1 limit 1 for update`,
    [captureSessionId],
  );
  const sessionStatus = session.rows[0]?.review_status ?? null;
  if (sessionStatus && sessionStatus !== "pending") {
    if (action === "approve" && sessionStatus === "approved") {
      throw new SovereignReviewStateError("review_already_approved");
    }
    if (action === "reject" && sessionStatus === "rejected") {
      throw new SovereignReviewStateError("review_already_rejected");
    }
    throw new SovereignReviewConflictError(`session_${sessionStatus}`);
  }

  const docs = await client.query<{ status: string }>(
    `select status from public.passport_documents
     where capture_session_id = $1 and stamp_id = 'identity' for update`,
    [captureSessionId],
  );
  if (docs.rows.length === 0) {
    throw new SovereignReviewStateError("documents_missing");
  }
  const statuses = docs.rows.map((r) => r.status);
  if (statuses.some((s) => TERMINAL_DOC_STATUSES.includes(s))) {
    if (action === "approve" && statuses.every((s) => s === "accepted")) {
      throw new SovereignReviewStateError("review_already_approved");
    }
    throw new SovereignReviewConflictError("documents_terminal");
  }
  if (!statuses.every((s) => PENDING_DOC_STATUSES.includes(s))) {
    throw new SovereignReviewConflictError("documents_not_pending");
  }
  return { previousDocStatus: statuses[0] ?? "under_review", sessionReviewStatus: sessionStatus };
}

export type SovereignReviewOutcomeInput = {
  captureSessionId: string;
  passportDocumentId: string;
  holderSubjectId: string;
  action: AdminReviewAction;
  reviewerId: string;
  reviewerDecision: ReviewerDecision;
  engineDecision: BiometricDecision | null;
  engineVersion: string | null;
  previousStatus: string;
  newStatus: string;
  note?: string | null;
  rejectionReasons?: string[] | null;
  sessionPatch: {
    reviewStatus: string;
    eligibilityResult?: string | null;
    reasonCode: string;
  };
  suiAddress: string | null;
};

export async function applySovereignReviewOutcomeOnClient(
  client: PoolClient,
  input: SovereignReviewOutcomeInput,
): Promise<void> {
    const now = new Date().toISOString();

    const docUpdate = await client.query(
      `update public.passport_documents set status = $2, reviewer_note = $3, reviewed_at = $4,
       reviewed_by = $5, updated_at = $4
       where capture_session_id = $1 and stamp_id = 'identity'
       and status in ('submitted','under_review')`,
      [
        input.captureSessionId,
        input.newStatus,
        input.note ?? null,
        now,
        input.reviewerId,
      ],
    );
    if ((docUpdate.rowCount ?? 0) < 1) {
      throw new SovereignReviewConflictError("document_update_failed");
    }

    await client.query(
      `update public.identity_review_sessions set review_status = $2, eligibility_result = $3,
       reviewed_at = $4, reviewer_id = $5, reviewer_category = $6, reason_code = $7, updated_at = $4
       where capture_session_id = $1`,
      [
        input.captureSessionId,
        input.sessionPatch.reviewStatus,
        input.sessionPatch.eligibilityResult ?? null,
        now,
        input.reviewerId,
        "admin_allowlisted",
        input.sessionPatch.reasonCode,
      ],
    );

    await client.query(
      `update public.identity_biometric_assessments set reviewer_decision = $2, reviewer_id = $3, reviewed_at = $4
       where capture_session_id = $1`,
      [input.captureSessionId, input.reviewerDecision, input.reviewerId, now],
    );

    await client.query(
      `insert into public.identity_review_audit_log (
        capture_session_id, passport_document_id, sui_address, reviewer_id, action,
        previous_status, new_status, engine_decision, reviewer_decision,
        rejection_reasons, notes, biometric_engine_version
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        input.captureSessionId,
        input.passportDocumentId,
        input.suiAddress,
        input.reviewerId,
        input.action,
        input.previousStatus,
        input.newStatus,
        input.engineDecision,
        input.reviewerDecision,
        input.rejectionReasons?.length ? input.rejectionReasons : null,
        input.note ?? null,
        input.engineVersion,
      ],
    );
}

export async function commitSovereignReviewOutcomeDirect(
  input: SovereignReviewOutcomeInput,
): Promise<void> {
  await withSovereignReviewSessionLock(input.captureSessionId, async (client) => {
    await assertReviewSessionPendingDirect(client, input.captureSessionId, input.action);
    await applySovereignReviewOutcomeOnClient(client, input);
  });
}

export async function resolveIdempotentApprovedReviewDirect(
  client: PoolClient,
  holderSubjectId: string,
  captureSessionId: string,
): Promise<{ jti: string; consistent: true } | { consistent: false; reason: string }> {
  const session = await client.query<{ review_status: string }>(
    `select review_status from public.identity_review_sessions
     where capture_session_id = $1 limit 1`,
    [captureSessionId],
  );
  const reviewStatus = session.rows[0]?.review_status;
  if (reviewStatus !== "approved") {
    return { consistent: false, reason: "session_not_approved" };
  }
  const docs = await client.query<{ status: string }>(
    `select status from public.passport_documents
     where capture_session_id = $1 and stamp_id = 'identity'`,
    [captureSessionId],
  );
  if (!docs.rows.every((r) => r.status === "accepted")) {
    return { consistent: false, reason: "documents_not_accepted" };
  }
  const ver = await client.query<{ credential_jti: string | null; credential_status: string | null }>(
    `select credential_jti, credential_status from public.identity_verifications
     where holder_subject_id = $1 or wallet_address = $1 limit 1`,
    [holderSubjectId],
  );
  const jti = ver.rows[0]?.credential_jti;
  if (!jti || ver.rows[0]?.credential_status !== "active") {
    return { consistent: false, reason: "credential_not_active" };
  }
  const claims = await client.query<{ count: string }>(
    `select count(*)::text as count from public.credential_claims
     where subject_id = $1 and credential_jti = $2 and status = 'active'`,
    [holderSubjectId, jti],
  );
  if (Number.parseInt(claims.rows[0]?.count ?? "0", 10) < 1) {
    return { consistent: false, reason: "claims_missing" };
  }
  return { jti, consistent: true };
}
