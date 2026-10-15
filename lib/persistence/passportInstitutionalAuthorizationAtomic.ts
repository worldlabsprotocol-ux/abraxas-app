// FILE: lib/persistence/passportInstitutionalAuthorizationAtomic.ts

import "server-only";

import { withAbraxasPgTransaction } from "./pgPool";

export type InstitutionalAuthorizationIdempotencyRecord = {
  idempotency_key: string;
  consent_id: string;
  receipt_json: string | null;
  presentation_json: string | null;
  committed_at: string | null;
};

export async function loadInstitutionalAuthorizationCommitDirect(
  idempotencyKey: string,
): Promise<InstitutionalAuthorizationIdempotencyRecord | null> {
  const { queryAbraxasPg } = await import("./pgPool");
  const { rows } = await queryAbraxasPg<InstitutionalAuthorizationIdempotencyRecord>(
    `select idempotency_key, consent_id, receipt_json, presentation_json, committed_at
     from public.passport_institutional_authorization_commits
     where idempotency_key = $1
     limit 1`,
    [idempotencyKey],
  );
  return rows[0] ?? null;
}

export type FinalizeInstitutionalAuthorizationResourcesResult =
  | { ok: true; newlyCommitted: true }
  | { ok: true; newlyCommitted: false; existing: InstitutionalAuthorizationIdempotencyRecord }
  | {
      ok: false;
      code:
        | "consent_not_found"
        | "consent_expired"
        | "consent_already_used"
        | "consent_binding_mismatch"
        | "challenge_unknown"
        | "challenge_expired"
        | "challenge_replay"
        | "persistence_unavailable"
        | "concurrent_authorization";
    };

export async function finalizeInstitutionalAuthorizationResourcesDirect(input: {
  idempotencyKey: string;
  holderSubjectId: string;
  consentId: string;
  challengeId: string;
  credentialId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  disclosureHash: string;
  requestId: string;
  at?: Date;
}): Promise<FinalizeInstitutionalAuthorizationResourcesResult> {
  const at = input.at ?? new Date();
  try {
    return await withAbraxasPgTransaction(async (client) => {
      const existing = await client.query<InstitutionalAuthorizationIdempotencyRecord>(
        `select idempotency_key, consent_id, receipt_json, presentation_json, committed_at
         from public.passport_institutional_authorization_commits
         where idempotency_key = $1
         for update`,
        [input.idempotencyKey],
      );
      const prior = existing.rows[0];
      if (prior?.receipt_json && prior.presentation_json) {
        return { ok: true as const, newlyCommitted: false as const, existing: prior };
      }

      const consentLock = await client.query<{
        holder_subject_id: string;
        credential_id: string;
        partner_id: string;
        policy_id: string;
        policy_version: number;
        disclosure_hash: string;
        expires_at: string;
        consumed_at: string | null;
      }>(
        `select holder_subject_id, credential_id, partner_id, policy_id, policy_version,
                disclosure_hash, expires_at, consumed_at
         from public.passport_institutional_presentation_consents
         where consent_id = $1
         for update`,
        [input.consentId],
      );
      const consent = consentLock.rows[0];
      if (!consent) return { ok: false as const, code: "consent_not_found" as const };
      if (consent.consumed_at) return { ok: false as const, code: "consent_already_used" as const };
      if (Date.parse(consent.expires_at) < at.getTime()) {
        return { ok: false as const, code: "consent_expired" as const };
      }
      if (
        consent.holder_subject_id !== input.holderSubjectId
        || consent.credential_id !== input.credentialId
        || consent.partner_id !== input.partnerId
        || consent.policy_id !== input.policyId
        || consent.policy_version !== input.policyVersion
        || consent.disclosure_hash !== input.disclosureHash
      ) {
        return { ok: false as const, code: "consent_binding_mismatch" as const };
      }

      const challengeConsume = await client.query<{ challenge_id: string; expires_at: string }>(
        `select challenge_id, expires_at from public.consume_passport_possession_challenge($1,$2,$3,$4)`,
        [input.challengeId, input.credentialId, input.partnerId, input.policyId],
      );
      const consumedChallenge = challengeConsume.rows[0];
      if (!consumedChallenge?.challenge_id) {
        const challengeRow = await client.query<{ consumed_at: string | null; expires_at: string }>(
          `select consumed_at, expires_at from public.passport_possession_challenges where challenge_id = $1`,
          [input.challengeId],
        );
        const row = challengeRow.rows[0];
        if (!row) return { ok: false as const, code: "challenge_unknown" as const };
        if (row.consumed_at) return { ok: false as const, code: "challenge_replay" as const };
        if (Date.parse(row.expires_at) < at.getTime()) {
          return { ok: false as const, code: "challenge_expired" as const };
        }
        return { ok: false as const, code: "challenge_unknown" as const };
      }
      if (Date.parse(consumedChallenge.expires_at) < at.getTime()) {
        return { ok: false as const, code: "challenge_expired" as const };
      }

      const consentUpdate = await client.query(
        `update public.passport_institutional_presentation_consents
         set consumed_at = $2::timestamptz
         where consent_id = $1 and consumed_at is null`,
        [input.consentId, at.toISOString()],
      );
      if ((consentUpdate.rowCount ?? 0) < 1) {
        return { ok: false as const, code: "consent_already_used" as const };
      }

      if (prior) {
        return { ok: true as const, newlyCommitted: false as const, existing: prior };
      }

      try {
        await client.query(
          `insert into public.passport_institutional_authorization_commits (
             idempotency_key, holder_subject_id, consent_id, challenge_id,
             credential_id, partner_id, policy_id, request_id
           ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            input.idempotencyKey,
            input.holderSubjectId,
            input.consentId,
            input.challengeId,
            input.credentialId,
            input.partnerId,
            input.policyId,
            input.requestId,
          ],
        );
      } catch {
        return { ok: false as const, code: "concurrent_authorization" as const };
      }

      return { ok: true as const, newlyCommitted: true as const };
    });
  } catch {
    return { ok: false, code: "persistence_unavailable" };
  }
}

export async function persistInstitutionalAuthorizationOutcomeDirect(input: {
  idempotencyKey: string;
  receiptJson: string;
  presentationJson: string;
  committedAt: string;
}): Promise<{ ok: true } | { ok: false; code: "persistence_unavailable" }> {
  try {
    const { queryAbraxasPg } = await import("./pgPool");
    await queryAbraxasPg(
      `update public.passport_institutional_authorization_commits
       set receipt_json = $2, presentation_json = $3, committed_at = $4::timestamptz
       where idempotency_key = $1`,
      [input.idempotencyKey, input.receiptJson, input.presentationJson, input.committedAt],
    );
    return { ok: true };
  } catch {
    return { ok: false, code: "persistence_unavailable" };
  }
}
