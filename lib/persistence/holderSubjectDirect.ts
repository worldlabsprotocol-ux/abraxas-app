// FILE: lib/persistence/holderSubjectDirect.ts
import "server-only";
// Direct PostgreSQL holder-subject store (Build #553 sovereign path).

import { randomBytes } from "crypto";
import type { Caip10Parts } from "@/lib/auth/holderSubject/caip";
import { queryAbraxasPg } from "./pgPool";

function isMissingRelation(error: unknown): boolean {
  return error instanceof Error && /relation .* does not exist|42P01/.test(error.message);
}

export async function insertHolderSubjectDirect(subjectId: string): Promise<void> {
  try {
    await queryAbraxasPg(
      `insert into public.passport_holder_subjects (subject_id) values ($1) on conflict do nothing`,
      [subjectId],
    );
  } catch (error) {
    if (isMissingRelation(error)) throw new HolderSubjectDirectUnavailableError();
    throw error;
  }
}

export class HolderSubjectDirectUnavailableError extends Error {
  constructor() {
    super("holder_subject_store_unavailable");
  }
}

export async function bindVerifiedWalletAccountDirect(input: {
  subjectId: string;
  caip: Caip10Parts;
  authMethod: string;
}): Promise<{ ok: true } | { ok: false; code: "wallet_bound_to_other_subject" | "persist_failed" }> {
  try {
    const existing = await queryAbraxasPg<{ subject_id: string }>(
      `select subject_id from public.passport_holder_wallet_accounts where caip10 = $1 limit 1`,
      [input.caip.caip10],
    );
    if (existing.rows[0] && existing.rows[0].subject_id !== input.subjectId) {
      return { ok: false, code: "wallet_bound_to_other_subject" };
    }

    const id = `phwa_${randomBytes(12).toString("hex")}`;
    await queryAbraxasPg(
      `insert into public.passport_holder_wallet_accounts (
        id, subject_id, caip10, chain_namespace, chain_reference, account_address, auth_method
      ) values ($1,$2,$3,$4,$5,$6,$7) on conflict do nothing`,
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
    return { ok: true };
  } catch (error) {
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
  const bound = await queryAbraxasPg<{ subject_id: string }>(
    `select subject_id from public.passport_holder_wallet_accounts where caip10 = $1 limit 1`,
    [input.caip.caip10],
  );
  if (bound.rows[0]?.subject_id) {
    return { ok: true, subjectId: bound.rows[0].subject_id, created: false };
  }

  const { createHolderSubjectId } = await import("@/lib/auth/holderSubject/subjectId");
  const subjectId = createHolderSubjectId();
  try {
    await insertHolderSubjectDirect(subjectId);
  } catch (error) {
    if (error instanceof HolderSubjectDirectUnavailableError) throw error;
    return { ok: false, code: "persist_failed" };
  }

  const bind = await bindVerifiedWalletAccountDirect({
    subjectId,
    caip: input.caip,
    authMethod: input.authMethod,
  });
  if (!bind.ok) return bind;

  return { ok: true, subjectId, created: true };
}

export async function linkLegacyKeyToSubjectDirect(input: {
  subjectId: string;
  legacyKind: string;
  legacyKey: string;
}): Promise<void> {
  try {
    await queryAbraxasPg(
      `insert into public.passport_holder_legacy_links (subject_id, legacy_kind, legacy_key)
       values ($1,$2,$3) on conflict do nothing`,
      [input.subjectId, input.legacyKind, input.legacyKey],
    );
  } catch (error) {
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
      `select subject_id from public.passport_holder_legacy_links
       where legacy_kind = $1 and legacy_key = $2 limit 1`,
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
      `select subject_id from public.passport_holder_subjects where subject_id = $1 limit 1`,
      [subjectId],
    );
    return Boolean(result.rows[0]);
  } catch (error) {
    if (isMissingRelation(error)) return false;
    throw error;
  }
}
