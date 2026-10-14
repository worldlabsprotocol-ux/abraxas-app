import "server-only";

import { createHash } from "crypto";
import type { PoolClient } from "pg";
import type { CreateAgeEvidenceInput } from "@/lib/assurance/ageEvidence";
import { insertAgeEvidenceRecordOnClient } from "@/lib/assurance/ageEvidence";
import {
  assertReviewSessionPendingDirect,
  applySovereignReviewOutcomeOnClient,
  resolveIdempotentApprovedReviewDirect,
  SovereignReviewConflictError,
  SovereignReviewStateError,
  type SovereignReviewOutcomeInput,
} from "./sovereignAdminReviewCommit";
import {
  commitSovereignCredentialIssuanceOnClient,
  SovereignIssuanceError,
  type SovereignCredentialCommitInput,
} from "./sovereignCredentialIssuance";
import { withAbraxasPgTransaction } from "./pgPool";

export class SovereignApprovalAtomicError extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus: number,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "SovereignApprovalAtomicError";
  }
}

function reviewLockKey(captureSessionId: string): { classId: number; objectId: number } {
  const digest = createHash("sha256").update(`abx_review:${captureSessionId}`, "utf8").digest();
  return { classId: 555003, objectId: digest.readInt32BE(0) };
}

function issuanceLockKey(subjectId: string): { classId: number; objectId: number } {
  const digest = createHash("sha256").update(`abx_issuance:${subjectId}`, "utf8").digest();
  return { classId: 554002, objectId: digest.readInt32BE(0) };
}

async function assertHolderConsentOnClient(
  client: PoolClient,
  holderSubjectId: string,
): Promise<void> {
  const consent = await client.query(
    `select 1 from public.passport_idv_consent_records
     where holder_subject_id = $1 limit 1`,
    [holderSubjectId],
  );
  if ((consent.rowCount ?? 0) < 1) {
    throw new SovereignApprovalAtomicError("consent_required", 400);
  }
}

async function assertRequiredEvidenceCustodyOnClient(
  client: PoolClient,
  captureSessionId: string,
  holderSubjectId: string,
): Promise<void> {
  for (const kind of ["id_front", "selfie"] as const) {
    const row = await client.query<{ holder_subject_id: string }>(
      `select holder_subject_id from public.abraxas_evidence_custody
       where capture_session_id = $1 and artifact_kind = $2
       limit 1 for update`,
      [captureSessionId, kind],
    );
    const custodyHolder = row.rows[0]?.holder_subject_id;
    if (!custodyHolder || custodyHolder !== holderSubjectId) {
      throw new SovereignApprovalAtomicError("required_evidence_custody_missing", 400);
    }
  }
}

export type SovereignAdminApprovalAtomicInput = {
  issuance: SovereignCredentialCommitInput;
  review: SovereignReviewOutcomeInput;
  ageEvidence?: CreateAgeEvidenceInput | null;
  /** When set, simulates failure after this step (tests only). */
  testFailAfterStep?: "custody" | "age_evidence" | "issuance" | "review";
};

export type SovereignAdminApprovalAtomicResult =
  | { ok: true; jti: string; claimCount: number; ageEvidenceId?: string; alreadyIssued?: boolean }
  | { ok: false; code: string; status: number };

export async function commitSovereignAdminApprovalAtomicDirect(
  input: SovereignAdminApprovalAtomicInput,
): Promise<SovereignAdminApprovalAtomicResult> {
  const jti = input.issuance.jti;
  const subjectKey = input.issuance.subjectKey;
  const captureSessionId = input.review.captureSessionId;

  try {
    return await withAbraxasPgTransaction(async (client) => {
      const reviewLock = reviewLockKey(captureSessionId);
      await client.query(`select pg_advisory_xact_lock($1::int, $2::int)`, [
        reviewLock.classId,
        reviewLock.objectId,
      ]);
      const issuanceLock = issuanceLockKey(subjectKey);
      await client.query(`select pg_advisory_xact_lock($1::int, $2::int)`, [
        issuanceLock.classId,
        issuanceLock.objectId,
      ]);

      try {
        await assertReviewSessionPendingDirect(client, captureSessionId, "approve");
      } catch (error) {
        if (error instanceof SovereignReviewStateError && error.message === "review_already_approved") {
          const idempotent = await resolveIdempotentApprovedReviewDirect(
            client,
            subjectKey,
            captureSessionId,
          );
          if (idempotent.consistent) {
            return {
              ok: true,
              jti: idempotent.jti,
              claimCount: 0,
              alreadyIssued: true,
            };
          }
          throw new SovereignApprovalAtomicError("idempotent_state_mismatch", 409, idempotent.reason);
        }
        throw error;
      }

      await assertHolderConsentOnClient(client, subjectKey);
      await assertRequiredEvidenceCustodyOnClient(client, captureSessionId, subjectKey);
      if (input.testFailAfterStep === "custody") {
        throw new SovereignApprovalAtomicError("test_injected_failure", 500);
      }

      let ageEvidenceId: string | undefined;
      if (input.ageEvidence) {
        ageEvidenceId = await insertAgeEvidenceRecordOnClient(client, {
          ...input.ageEvidence,
          credentialJti: jti,
        });
        if (input.testFailAfterStep === "age_evidence") {
          throw new SovereignApprovalAtomicError("test_injected_failure", 500);
        }
      }

      const issued = await commitSovereignCredentialIssuanceOnClient(client, input.issuance, {
        skipAdvisoryLock: true,
      });
      if ("duplicate" in issued) {
        throw new SovereignIssuanceError("credential_already_active");
      }
      if (input.testFailAfterStep === "issuance") {
        throw new SovereignApprovalAtomicError("test_injected_failure", 500);
      }

      await applySovereignReviewOutcomeOnClient(client, input.review);
      if (input.testFailAfterStep === "review") {
        throw new SovereignApprovalAtomicError("test_injected_failure", 500);
      }

      return {
        ok: true,
        jti,
        claimCount: issued.claimCount,
        ageEvidenceId,
      };
    });
  } catch (error) {
    if (error instanceof SovereignApprovalAtomicError) {
      return { ok: false, code: error.code, status: error.httpStatus };
    }
    if (error instanceof SovereignReviewConflictError) {
      return { ok: false, code: error.message, status: 409 };
    }
    if (error instanceof SovereignReviewStateError) {
      return { ok: false, code: error.message, status: 409 };
    }
    if (error instanceof SovereignIssuanceError) {
      return { ok: false, code: error.code, status: 409 };
    }
    return { ok: false, code: "atomic_approval_failed", status: 500 };
  }
}

export async function countPersistedApprovalArtifactsDirect(
  holderSubjectId: string,
  jti: string,
  captureSessionId: string,
): Promise<{
  activeClaims: number;
  credentialRow: number;
  verificationApproved: boolean;
  documentAccepted: boolean;
  sessionApproved: boolean;
  ageEvidenceRows: number;
}> {
  const { queryAbraxasPg } = await import("./pgPool");
  const [claims, cred, ver, doc, session, age] = await Promise.all([
    queryAbraxasPg<{ count: string }>(
      `select count(*)::text as count from public.credential_claims
       where subject_id = $1 and credential_jti = $2 and status = 'active'`,
      [holderSubjectId, jti],
    ),
    queryAbraxasPg<{ count: string }>(
      `select count(*)::text as count from public.abraxas_credentials
       where jti = $1 and holder_wallet = $2 and revoked_at is null`,
      [jti, holderSubjectId],
    ),
    queryAbraxasPg<{ credential_status: string | null; identity_verification_status: string | null }>(
      `select credential_status, identity_verification_status from public.identity_verifications
       where holder_subject_id = $1 or wallet_address = $1 limit 1`,
      [holderSubjectId],
    ),
    queryAbraxasPg<{ status: string }>(
      `select status from public.passport_documents
       where capture_session_id = $1 and stamp_id = 'identity' limit 1`,
      [captureSessionId],
    ),
    queryAbraxasPg<{ review_status: string }>(
      `select review_status from public.identity_review_sessions
       where capture_session_id = $1 limit 1`,
      [captureSessionId],
    ),
    queryAbraxasPg<{ count: string }>(
      `select count(*)::text as count from public.age_evidence_records
       where capture_session_id = $1 and credential_jti = $2`,
      [captureSessionId, jti],
    ),
  ]);
  const v = ver.rows[0];
  return {
    activeClaims: Number.parseInt(claims.rows[0]?.count ?? "0", 10),
    credentialRow: Number.parseInt(cred.rows[0]?.count ?? "0", 10),
    verificationApproved:
      v?.credential_status === "active" && v?.identity_verification_status === "approved",
    documentAccepted: doc.rows[0]?.status === "accepted",
    sessionApproved: session.rows[0]?.review_status === "approved",
    ageEvidenceRows: Number.parseInt(age.rows[0]?.count ?? "0", 10),
  };
}
