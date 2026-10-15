// FILE: lib/passport/holderIdentityLinkPersistence.ts
// Transactionally safe legacy anchor → canonical subject link claims.

import { createHash, randomBytes } from "crypto";
import type { PoolClient } from "pg";
import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import { LEGACY_KIND_SUI_ADDRESS, type LegacyIdentityAnchor } from "./holderIdentityReconciliation";

export type LegacyLinkClaimResult =
  | { ok: true; subjectId: string; createdLink: boolean; createdSubject: boolean }
  | {
      ok: false;
      code: "conflict_different_subject" | "invalid_subject" | "link_race_unresolved";
      persistedSubjectId?: string;
    };

function normalizedLegacyKey(anchor: LegacyIdentityAnchor): string {
  return anchor.kind === LEGACY_KIND_SUI_ADDRESS ? anchor.key.trim().toLowerCase() : anchor.key.trim();
}

function legacyAnchorAdvisoryLockKeys(kind: string, key: string): { classId: number; objectId: number } {
  const digest = createHash("sha256").update(`abx_legacy_anchor:${kind}:${key}`, "utf8").digest();
  return { classId: 580_001, objectId: digest.readInt32BE(0) };
}

export function mintCanonicalHolderSubjectId(): string {
  return `abx_hs_${randomBytes(16).toString("hex")}`;
}

/** Serialize concurrent link attempts for one anchor; never accept a different canonical owner. */
export async function claimLegacyIdentityLink(input: {
  client: PoolClient;
  anchor: LegacyIdentityAnchor;
  /** When null, mint only if no link exists. When set, must match persisted owner or empty slot. */
  requestedSubjectId: string | null;
  allowMintWhenAbsent: boolean;
}): Promise<LegacyLinkClaimResult> {
  const legacyKey = normalizedLegacyKey(input.anchor);
  const { classId, objectId } = legacyAnchorAdvisoryLockKeys(input.anchor.kind, legacyKey);
  await input.client.query(`select pg_advisory_xact_lock($1::int, $2::int)`, [classId, objectId]);

  const existing = await input.client.query<{ subject_id: string }>(
    `select subject_id from public.passport_holder_legacy_links
     where legacy_kind = $1 and legacy_key = $2
     for update`,
    [input.anchor.kind, legacyKey],
  );
  const persisted = existing.rows[0]?.subject_id?.trim() ?? null;

  if (persisted) {
    if (input.requestedSubjectId && input.requestedSubjectId !== persisted) {
      return { ok: false, code: "conflict_different_subject", persistedSubjectId: persisted };
    }
    if (!isChainNeutralHolderSubjectId(persisted)) {
      return { ok: false, code: "invalid_subject", persistedSubjectId: persisted };
    }
    return { ok: true, subjectId: persisted, createdLink: false, createdSubject: false };
  }

  let subjectId = input.requestedSubjectId?.trim() ?? null;
  if (!subjectId) {
    if (!input.allowMintWhenAbsent) {
      return { ok: false, code: "link_race_unresolved" };
    }
    subjectId = mintCanonicalHolderSubjectId();
  }

  if (!isChainNeutralHolderSubjectId(subjectId)) {
    return { ok: false, code: "invalid_subject" };
  }

  const subjectInsert = await input.client.query(
    `insert into public.passport_holder_subjects (subject_id) values ($1) on conflict do nothing`,
    [subjectId],
  );
  const createdSubject = (subjectInsert.rowCount ?? 0) > 0;

  const linkInsert = await input.client.query(
    `insert into public.passport_holder_legacy_links (subject_id, legacy_kind, legacy_key)
     values ($1, $2, $3)
     on conflict (legacy_kind, legacy_key) do nothing
     returning subject_id`,
    [subjectId, input.anchor.kind, legacyKey],
  );

  if (linkInsert.rows[0]?.subject_id) {
    const winner = String(linkInsert.rows[0].subject_id);
    if (winner !== subjectId) {
      return { ok: false, code: "conflict_different_subject", persistedSubjectId: winner };
    }
    return { ok: true, subjectId: winner, createdLink: true, createdSubject };
  }

  const reread = await input.client.query<{ subject_id: string }>(
    `select subject_id from public.passport_holder_legacy_links
     where legacy_kind = $1 and legacy_key = $2 for update`,
    [input.anchor.kind, legacyKey],
  );
  const winner = reread.rows[0]?.subject_id?.trim() ?? null;
  if (!winner) {
    return { ok: false, code: "link_race_unresolved" };
  }
  if (winner !== subjectId) {
    return { ok: false, code: "conflict_different_subject", persistedSubjectId: winner };
  }
  return { ok: true, subjectId: winner, createdLink: false, createdSubject };
}

export async function bindApprovedIdvToLegacyLinkOwner(input: {
  client: PoolClient;
  anchor: LegacyIdentityAnchor;
  authoritativeSubjectId: string;
}): Promise<{ ok: true; updatedRows: number } | { ok: false; code: "idv_owner_mismatch" | "not_applicable" }> {
  if (input.anchor.kind !== LEGACY_KIND_SUI_ADDRESS) {
    return { ok: false, code: "not_applicable" };
  }
  const legacyKey = normalizedLegacyKey(input.anchor);
  const owner = await input.client.query<{ subject_id: string }>(
    `select subject_id from public.passport_holder_legacy_links
     where legacy_kind = $1 and legacy_key = $2`,
    [input.anchor.kind, legacyKey],
  );
  const persisted = owner.rows[0]?.subject_id?.trim();
  if (!persisted || persisted !== input.authoritativeSubjectId) {
    return { ok: false, code: "idv_owner_mismatch" };
  }

  const update = await input.client.query(
    `update public.identity_verifications
     set holder_subject_id = $1, updated_at = now()
     where lower(sui_address) = lower($2)
       and (holder_subject_id is null or holder_subject_id = $1)
       and coalesce(identity_verification_status, status, '') in ('approved','verified','complete')`,
    [persisted, legacyKey],
  );
  return { ok: true, updatedRows: update.rowCount ?? 0 };
}

export async function countApprovedIdvForSuiAnchor(client: PoolClient, sui: string): Promise<number> {
  const res = await client.query<{ c: number }>(
    `select count(*)::int as c from public.identity_verifications
     where lower(sui_address) = lower($1)
       and coalesce(identity_verification_status, status, '') in ('approved','verified','complete')`,
    [sui],
  );
  return res.rows[0]?.c ?? 0;
}
