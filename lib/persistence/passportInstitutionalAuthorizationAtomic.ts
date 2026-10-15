// FILE: lib/persistence/passportInstitutionalAuthorizationAtomic.ts

import "server-only";

import { randomBytes } from "crypto";
import { withAbraxasPgTransaction } from "./pgPool";

export type InstitutionalAuthorizationCommitRecord = {
  idempotency_key: string;
  holder_subject_id: string;
  consent_id: string;
  challenge_id: string;
  credential_id: string;
  partner_id: string;
  policy_id: string;
  request_id: string;
  receipt_json: string | null;
  presentation_json: string | null;
  committed_at: string | null;
  signing_claim_token: string | null;
  signing_claim_expires_at: string | null;
};

export class AuthorizationFinalizeAbort extends Error {
  constructor(
    readonly code:
      | "consent_not_found"
      | "consent_expired"
      | "consent_already_used"
      | "consent_binding_mismatch"
      | "challenge_unknown"
      | "challenge_expired"
      | "challenge_replay"
      | "concurrent_authorization",
  ) {
    super(code);
    this.name = "AuthorizationFinalizeAbort";
  }
}

export async function loadInstitutionalAuthorizationCommitDirect(
  idempotencyKey: string,
): Promise<InstitutionalAuthorizationCommitRecord | null> {
  const { queryAbraxasPg } = await import("./pgPool");
  const { rows } = await queryAbraxasPg<InstitutionalAuthorizationCommitRecord>(
    `select idempotency_key, holder_subject_id, consent_id, challenge_id, credential_id,
            partner_id, policy_id, request_id, receipt_json, presentation_json, committed_at,
            signing_claim_token, signing_claim_expires_at
     from public.passport_institutional_authorization_commits
     where idempotency_key = $1
     limit 1`,
    [idempotencyKey],
  );
  return rows[0] ?? null;
}

export type FinalizeInstitutionalAuthorizationResourcesResult =
  | { ok: true; newlyCommitted: true }
  | { ok: true; newlyCommitted: false; existing: InstitutionalAuthorizationCommitRecord }
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
      const existing = await client.query<InstitutionalAuthorizationCommitRecord>(
        `select idempotency_key, holder_subject_id, consent_id, challenge_id, credential_id,
                partner_id, policy_id, request_id, receipt_json, presentation_json, committed_at,
                signing_claim_token, signing_claim_expires_at
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
      if (!consent) throw new AuthorizationFinalizeAbort("consent_not_found");
      if (consent.consumed_at && !prior) {
        const commitForConsumedConsent = await client.query<{ idempotency_key: string }>(
          `select idempotency_key from public.passport_institutional_authorization_commits
           where idempotency_key = $1`,
          [input.idempotencyKey],
        );
        if (!commitForConsumedConsent.rows[0]) {
          throw new AuthorizationFinalizeAbort("consent_already_used");
        }
      }
      if (!consent.consumed_at) {
        if (Date.parse(consent.expires_at) < at.getTime()) {
          throw new AuthorizationFinalizeAbort("consent_expired");
        }
        if (
          consent.holder_subject_id !== input.holderSubjectId
          || consent.credential_id !== input.credentialId
          || consent.partner_id !== input.partnerId
          || consent.policy_id !== input.policyId
          || consent.policy_version !== input.policyVersion
          || consent.disclosure_hash !== input.disclosureHash
        ) {
          throw new AuthorizationFinalizeAbort("consent_binding_mismatch");
        }
      }

      let insertedCommit = false;
      if (!prior) {
        const inserted = await client.query<{ idempotency_key: string }>(
          `insert into public.passport_institutional_authorization_commits (
             idempotency_key, holder_subject_id, consent_id, challenge_id,
             credential_id, partner_id, policy_id, request_id
           ) values ($1,$2,$3,$4,$5,$6,$7,$8)
           on conflict (idempotency_key) do nothing
           returning idempotency_key`,
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
        insertedCommit = Boolean(inserted.rows[0]);
        if (!insertedCommit) {
          const raced = await client.query<InstitutionalAuthorizationCommitRecord>(
            `select idempotency_key, holder_subject_id, consent_id, challenge_id, credential_id,
                    partner_id, policy_id, request_id, receipt_json, presentation_json, committed_at,
                    signing_claim_token, signing_claim_expires_at
             from public.passport_institutional_authorization_commits
             where idempotency_key = $1
             for update`,
            [input.idempotencyKey],
          );
          const racedRow = raced.rows[0];
          if (!racedRow) {
            throw new AuthorizationFinalizeAbort("concurrent_authorization");
          }
          if (
            racedRow.holder_subject_id !== input.holderSubjectId
            || racedRow.consent_id !== input.consentId
            || racedRow.challenge_id !== input.challengeId
            || racedRow.credential_id !== input.credentialId
            || racedRow.partner_id !== input.partnerId
            || racedRow.policy_id !== input.policyId
            || racedRow.request_id !== input.requestId
          ) {
            throw new AuthorizationFinalizeAbort("consent_binding_mismatch");
          }
          if (racedRow.receipt_json && racedRow.presentation_json) {
            return { ok: true as const, newlyCommitted: false as const, existing: racedRow };
          }
        }
      } else if (
        prior.holder_subject_id !== input.holderSubjectId
        || prior.consent_id !== input.consentId
        || prior.challenge_id !== input.challengeId
        || prior.credential_id !== input.credentialId
        || prior.partner_id !== input.partnerId
        || prior.policy_id !== input.policyId
        || prior.request_id !== input.requestId
      ) {
        throw new AuthorizationFinalizeAbort("consent_binding_mismatch");
      }

      const shouldConsumeResources = insertedCommit || (!prior && !consent.consumed_at);
      if (shouldConsumeResources && !consent.consumed_at) {
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
          if (!row) throw new AuthorizationFinalizeAbort("challenge_unknown");
          if (row.consumed_at) throw new AuthorizationFinalizeAbort("challenge_replay");
          if (Date.parse(row.expires_at) < at.getTime()) {
            throw new AuthorizationFinalizeAbort("challenge_expired");
          }
          throw new AuthorizationFinalizeAbort("challenge_unknown");
        }
        if (Date.parse(consumedChallenge.expires_at) < at.getTime()) {
          throw new AuthorizationFinalizeAbort("challenge_expired");
        }

        const consentUpdate = await client.query(
          `update public.passport_institutional_presentation_consents
           set consumed_at = $2::timestamptz
           where consent_id = $1 and consumed_at is null`,
          [input.consentId, at.toISOString()],
        );
        if ((consentUpdate.rowCount ?? 0) < 1) {
          throw new AuthorizationFinalizeAbort("consent_already_used");
        }
      }

      if (prior) {
        return { ok: true as const, newlyCommitted: false as const, existing: prior };
      }
      if (!insertedCommit) {
        const existingAfterRace = await client.query<InstitutionalAuthorizationCommitRecord>(
          `select idempotency_key, holder_subject_id, consent_id, challenge_id, credential_id,
                  partner_id, policy_id, request_id, receipt_json, presentation_json, committed_at,
                  signing_claim_token, signing_claim_expires_at
           from public.passport_institutional_authorization_commits
           where idempotency_key = $1`,
          [input.idempotencyKey],
        );
        const row = existingAfterRace.rows[0];
        if (!row) {
          throw new AuthorizationFinalizeAbort("concurrent_authorization");
        }
        return { ok: true as const, newlyCommitted: false as const, existing: row };
      }
      return { ok: true as const, newlyCommitted: true as const };
    });
  } catch (error) {
    if (error instanceof AuthorizationFinalizeAbort) {
      return { ok: false, code: error.code };
    }
    return { ok: false, code: "persistence_unavailable" };
  }
}

export type ClaimCanonicalSigningResult =
  | { ok: true; claimed: true; claimToken: string }
  | { ok: true; claimed: false; existing: InstitutionalAuthorizationCommitRecord }
  | { ok: false; code: "persistence_unavailable" | "commit_not_found" };

export async function claimCanonicalAuthorizationSigningDirect(input: {
  idempotencyKey: string;
  claimTtlMs?: number;
}): Promise<ClaimCanonicalSigningResult> {
  const claimToken = randomBytes(16).toString("base64url");
  const ttlMs = input.claimTtlMs ?? 30_000;
  const claimExpiresAt = new Date(Date.now() + ttlMs).toISOString();
  try {
    const { queryAbraxasPg } = await import("./pgPool");
    const updated = await queryAbraxasPg<{ idempotency_key: string }>(
      `update public.passport_institutional_authorization_commits
       set signing_claim_token = $2,
           signing_claim_expires_at = $3::timestamptz
       where idempotency_key = $1
         and receipt_json is null
         and (
           signing_claim_token is null
           or signing_claim_expires_at is null
           or signing_claim_expires_at < now()
         )
       returning idempotency_key`,
      [input.idempotencyKey, claimToken, claimExpiresAt],
    );
    if (updated.rows[0]) {
      return { ok: true, claimed: true, claimToken };
    }
    const existing = await loadInstitutionalAuthorizationCommitDirect(input.idempotencyKey);
    if (!existing) return { ok: false, code: "commit_not_found" };
    return { ok: true, claimed: false, existing };
  } catch {
    return { ok: false, code: "persistence_unavailable" };
  }
}

export type PersistCanonicalAuthorizationOutcomeResult =
  | { ok: true; persisted: true }
  | { ok: true; persisted: false; existing: InstitutionalAuthorizationCommitRecord }
  | { ok: false; code: "persistence_unavailable" | "signing_claim_lost" | "commit_not_found" };

export async function persistCanonicalAuthorizationOutcomeDirect(input: {
  idempotencyKey: string;
  claimToken: string;
  receiptJson: string;
  presentationJson: string;
  committedAt: string;
}): Promise<PersistCanonicalAuthorizationOutcomeResult> {
  try {
    const { queryAbraxasPg } = await import("./pgPool");
    const updated = await queryAbraxasPg<{ idempotency_key: string }>(
      `update public.passport_institutional_authorization_commits
       set receipt_json = $3,
           presentation_json = $4,
           committed_at = $5::timestamptz,
           signing_claim_token = null,
           signing_claim_expires_at = null
       where idempotency_key = $1
         and signing_claim_token = $2
         and receipt_json is null
       returning idempotency_key`,
      [
        input.idempotencyKey,
        input.claimToken,
        input.receiptJson,
        input.presentationJson,
        input.committedAt,
      ],
    );
    if (updated.rows[0]) {
      return { ok: true, persisted: true };
    }
    const existing = await loadInstitutionalAuthorizationCommitDirect(input.idempotencyKey);
    if (!existing) return { ok: false, code: "commit_not_found" };
    if (existing.receipt_json && existing.presentation_json) {
      return { ok: true, persisted: false, existing };
    }
    return { ok: false, code: "signing_claim_lost" };
  } catch {
    return { ok: false, code: "persistence_unavailable" };
  }
}

/** @deprecated Use persistCanonicalAuthorizationOutcomeDirect */
export async function persistInstitutionalAuthorizationOutcomeDirect(input: {
  idempotencyKey: string;
  receiptJson: string;
  presentationJson: string;
  committedAt: string;
}): Promise<{ ok: true } | { ok: false; code: "persistence_unavailable" }> {
  const claim = await claimCanonicalAuthorizationSigningDirect({ idempotencyKey: input.idempotencyKey });
  if (!claim.ok) return { ok: false, code: "persistence_unavailable" };
  if (!claim.claimed) {
    if (claim.existing.receipt_json) return { ok: true };
    return { ok: false, code: "persistence_unavailable" };
  }
  const result = await persistCanonicalAuthorizationOutcomeDirect({
    idempotencyKey: input.idempotencyKey,
    claimToken: claim.claimToken,
    receiptJson: input.receiptJson,
    presentationJson: input.presentationJson,
    committedAt: input.committedAt,
  });
  if (!result.ok) return { ok: false, code: "persistence_unavailable" };
  return { ok: true };
}
