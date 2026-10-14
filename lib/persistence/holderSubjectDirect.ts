// FILE: lib/persistence/holderSubjectDirect.ts
import "server-only";
// Direct PostgreSQL holder-subject store (Build #553 sovereign path).

import { createHash, randomBytes } from "crypto";
import type { PoolClient } from "pg";
import type { Caip10Parts } from "@/lib/auth/holderSubject/caip";
import { queryAbraxasPg, withAbraxasPgTransaction } from "./pgPool";

function isMissingRelation(error: unknown): boolean {
  return error instanceof Error && /relation .* does not exist|42P01/.test(error.message);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code: string }).code === "23505"
  );
}

function caip10AdvisoryLockKeys(caip10: string): { classId: number; objectId: number } {
  const digest = createHash("sha256").update(`abx_wallet_caip10:${caip10}`, "utf8").digest();
  return {
    classId: 553001,
    objectId: digest.readInt32BE(0),
  };
}

async function lockWalletCaip10(client: PoolClient, caip10: string): Promise<void> {
  const { classId, objectId } = caip10AdvisoryLockKeys(caip10);
  await client.query(`SELECT pg_advisory_xact_lock($1::int, $2::int)`, [classId, objectId]);
}

async function selectPersistedWalletOwner(
  client: PoolClient,
  caip10: string,
): Promise<string | null> {
  const result = await client.query<{ subject_id: string }>(
    `SELECT subject_id FROM public.passport_holder_wallet_accounts WHERE caip10 = $1 LIMIT 1`,
    [caip10],
  );
  return result.rows[0]?.subject_id ?? null;
}

export async function queryPersistedWalletOwner(caip10: string): Promise<string | null> {
  const result = await queryAbraxasPg<{ subject_id: string }>(
    `SELECT subject_id FROM public.passport_holder_wallet_accounts WHERE caip10 = $1 LIMIT 1`,
    [caip10],
  );
  return result.rows[0]?.subject_id ?? null;
}

export class HolderSubjectDirectUnavailableError extends Error {
  constructor() {
    super("holder_subject_store_unavailable");
  }
}

export class LegacyLinkConflictError extends Error {
  readonly code = "legacy_link_conflict" as const;

  constructor(
    readonly legacyKind: string,
    readonly legacyKey: string,
    readonly existingSubjectId: string,
  ) {
    super("legacy_identity_already_linked_to_another_subject");
    this.name = "LegacyLinkConflictError";
  }
}

export async function insertHolderSubjectDirect(subjectId: string): Promise<void> {
  try {
    await queryAbraxasPg(
      `INSERT INTO public.passport_holder_subjects (subject_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [subjectId],
    );
  } catch (error) {
    if (isMissingRelation(error)) throw new HolderSubjectDirectUnavailableError();
    throw error;
  }
}

export async function bindVerifiedWalletAccountDirect(input: {
  subjectId: string;
  caip: Caip10Parts;
  authMethod: string;
}): Promise<{ ok: true } | { ok: false; code: "wallet_bound_to_other_subject" | "persist_failed" }> {
  try {
    return await withAbraxasPgTransaction(async (client) => {
      await lockWalletCaip10(client, input.caip.caip10);
      const owner = await selectPersistedWalletOwner(client, input.caip.caip10);
      if (owner && owner !== input.subjectId) {
        return { ok: false as const, code: "wallet_bound_to_other_subject" as const };
      }
      if (owner === input.subjectId) {
        return { ok: true as const };
      }

      const subjectExists = await client.query<{ subject_id: string }>(
        `SELECT subject_id FROM public.passport_holder_subjects WHERE subject_id = $1 LIMIT 1`,
        [input.subjectId],
      );
      if (!subjectExists.rows[0]) {
        return { ok: false as const, code: "persist_failed" as const };
      }

      const id = `phwa_${randomBytes(12).toString("hex")}`;
      await client.query(
        `INSERT INTO public.passport_holder_wallet_accounts (
          id, subject_id, caip10, chain_namespace, chain_reference, account_address, auth_method
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          id,
          input.subjectId,
          input.caip.caip10,
          input.caip.namespace,
          input.caip.reference,
          input.caip.address,
          input.authMethod,
        ],
      );

      const verified = await selectPersistedWalletOwner(client, input.caip.caip10);
      if (verified !== input.subjectId) {
        return { ok: false as const, code: "persist_failed" as const };
      }
      return { ok: true as const };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const owner = await queryPersistedWalletOwner(input.caip.caip10);
      if (owner === input.subjectId) return { ok: true };
      if (owner) return { ok: false, code: "wallet_bound_to_other_subject" };
    }
    if (isMissingRelation(error)) throw new HolderSubjectDirectUnavailableError();
    return { ok: false, code: "persist_failed" };
  }
}

export async function resolveSubjectForVerifiedWalletDirect(input: {
  caip: Caip10Parts;
  authMethod: string;
}): Promise<
  | { ok: true; subjectId: string; created: boolean }
  | { ok: false; code: "wallet_bound_to_other_subject" | "persist_failed" }
> {
  try {
    return await withAbraxasPgTransaction(async (client) => {
      await lockWalletCaip10(client, input.caip.caip10);
      const existing = await selectPersistedWalletOwner(client, input.caip.caip10);
      if (existing) {
        return { ok: true as const, subjectId: existing, created: false as const };
      }

      const { createHolderSubjectId } = await import("@/lib/auth/holderSubject/subjectId");
      const subjectId = createHolderSubjectId();
      await client.query(
        `INSERT INTO public.passport_holder_subjects (subject_id) VALUES ($1)`,
        [subjectId],
      );

      const id = `phwa_${randomBytes(12).toString("hex")}`;
      await client.query(
        `INSERT INTO public.passport_holder_wallet_accounts (
          id, subject_id, caip10, chain_namespace, chain_reference, account_address, auth_method
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          id,
          subjectId,
          input.caip.caip10,
          input.caip.namespace,
          input.caip.reference,
          input.caip.address,
          input.authMethod,
        ],
      );

      const verified = await selectPersistedWalletOwner(client, input.caip.caip10);
      if (verified !== subjectId) {
        return { ok: false as const, code: "persist_failed" as const };
      }
      return { ok: true as const, subjectId: verified, created: true as const };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const owner = await queryPersistedWalletOwner(input.caip.caip10);
      if (owner) {
        return { ok: true, subjectId: owner, created: false };
      }
    }
    if (error instanceof HolderSubjectDirectUnavailableError) throw error;
    if (isMissingRelation(error)) throw new HolderSubjectDirectUnavailableError();
    return { ok: false, code: "persist_failed" };
  }
}

export async function linkLegacyKeyToSubjectDirect(input: {
  subjectId: string;
  legacyKind: string;
  legacyKey: string;
}): Promise<void> {
  try {
    await withAbraxasPgTransaction(async (client) => {
      const inserted = await client.query<{ subject_id: string }>(
        `INSERT INTO public.passport_holder_legacy_links (subject_id, legacy_kind, legacy_key)
         VALUES ($1,$2,$3)
         ON CONFLICT (legacy_kind, legacy_key) DO NOTHING
         RETURNING subject_id`,
        [input.subjectId, input.legacyKind, input.legacyKey],
      );
      if (inserted.rows[0]?.subject_id) {
        return;
      }

      const existing = await client.query<{ subject_id: string }>(
        `SELECT subject_id FROM public.passport_holder_legacy_links
         WHERE legacy_kind = $1 AND legacy_key = $2 LIMIT 1`,
        [input.legacyKind, input.legacyKey],
      );
      const owner = existing.rows[0]?.subject_id;
      if (owner && owner !== input.subjectId) {
        throw new LegacyLinkConflictError(input.legacyKind, input.legacyKey, owner);
      }
    });
  } catch (error) {
    if (error instanceof LegacyLinkConflictError) throw error;
    if (isMissingRelation(error)) return;
    throw error;
  }
}

export async function resolveLegacySubjectIdDirect(
  legacyKind: string,
  legacyKey: string,
): Promise<string | null> {
  try {
    const result = await queryAbraxasPg<{ subject_id: string }>(
      `SELECT subject_id FROM public.passport_holder_legacy_links
       WHERE legacy_kind = $1 AND legacy_key = $2 LIMIT 1`,
      [legacyKind, legacyKey],
    );
    return result.rows[0]?.subject_id ?? null;
  } catch (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }
}

export async function assertHolderSubjectExistsDirect(subjectId: string): Promise<boolean> {
  try {
    const result = await queryAbraxasPg<{ subject_id: string }>(
      `SELECT subject_id FROM public.passport_holder_subjects WHERE subject_id = $1 LIMIT 1`,
      [subjectId],
    );
    return Boolean(result.rows[0]);
  } catch (error) {
    if (isMissingRelation(error)) return false;
    throw error;
  }
}
