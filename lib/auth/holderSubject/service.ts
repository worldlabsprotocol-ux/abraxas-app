// FILE: lib/auth/holderSubject/service.ts

import { randomBytes } from "crypto";
import { requirePersistenceAdmin } from "@/lib/persistence/admin";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { createHolderSubjectId } from "./subjectId";
import type { Caip10Parts } from "./caip";

export class HolderSubjectStoreUnavailableError extends Error {
  constructor() {
    super("holder_subject_store_unavailable");
  }
}

export { LegacyLinkConflictError } from "@/lib/persistence/holderSubjectDirect";

async function directModule() {
  return import("@/lib/persistence/holderSubjectDirect");
}

export async function insertHolderSubject(subjectId: string): Promise<void> {
  if (persistenceUsesDirectPostgres()) {
    try {
      const direct = await directModule();
      await direct.insertHolderSubjectDirect(subjectId);
    } catch (error) {
      if (error instanceof Error && error.message === "holder_subject_store_unavailable") {
        throw new HolderSubjectStoreUnavailableError();
      }
      const direct = await directModule();
      if (error instanceof direct.HolderSubjectDirectUnavailableError) {
        throw new HolderSubjectStoreUnavailableError();
      }
      throw error;
    }
    return;
  }

  const sb = requirePersistenceAdmin();
  const { error } = await sb.from("passport_holder_subjects").insert({ subject_id: subjectId });
  if (error) {
    if (error.code === "42P01") throw new HolderSubjectStoreUnavailableError();
    if (error.code === "23505") return;
    throw error;
  }
}

export async function bindVerifiedWalletAccount(input: {
  subjectId: string;
  caip: Caip10Parts;
  authMethod: string;
}): Promise<{ ok: true } | { ok: false; code: "wallet_bound_to_other_subject" | "persist_failed" }> {
  if (persistenceUsesDirectPostgres()) {
    try {
      const direct = await directModule();
      return await direct.bindVerifiedWalletAccountDirect(input);
    } catch (error) {
      const direct = await directModule();
      if (error instanceof direct.HolderSubjectDirectUnavailableError) {
        throw new HolderSubjectStoreUnavailableError();
      }
      throw error;
    }
  }

  const sb = requirePersistenceAdmin();
  if (!await assertHolderSubjectExists(input.subjectId)) return { ok: false, code: "persist_failed" };
  const { data: existing, error: existingError } = await sb
    .from("passport_holder_wallet_accounts")
    .select("subject_id,revoked_at")
    .eq("caip10", input.caip.caip10)
    .maybeSingle();
  if (existingError) throw new HolderSubjectStoreUnavailableError();

  if (existing && (existing.subject_id !== input.subjectId || existing.revoked_at)) {
    return { ok: false, code: "wallet_bound_to_other_subject" };
  }

  const id = `phwa_${randomBytes(12).toString("hex")}`;
  const { error } = await sb.from("passport_holder_wallet_accounts").insert({
    id,
    subject_id: input.subjectId,
    caip10: input.caip.caip10,
    chain_namespace: input.caip.namespace,
    chain_reference: input.caip.reference,
    account_address: input.caip.address,
    auth_method: input.authMethod,
  });

  if (error) {
    if (error.code === "42P01") throw new HolderSubjectStoreUnavailableError();
    if (error.code === "23505") {
      return await resolveVerifiedWalletSubjectId(input.caip.caip10) === input.subjectId
        ? { ok: true }
        : { ok: false, code: "wallet_bound_to_other_subject" };
    }
    return { ok: false, code: "persist_failed" };
  }
  return { ok: true };
}

export async function resolveSubjectForVerifiedWallet(input: {
  caip: Caip10Parts;
  authMethod: string;
}): Promise<
  | { ok: true; subjectId: string; created: boolean }
  | { ok: false; code: "wallet_bound_to_other_subject" | "persist_failed" }
> {
  if (persistenceUsesDirectPostgres()) {
    try {
      const direct = await directModule();
      return await direct.resolveSubjectForVerifiedWalletDirect(input);
    } catch (error) {
      const direct = await directModule();
      if (error instanceof direct.HolderSubjectDirectUnavailableError) {
        throw new HolderSubjectStoreUnavailableError();
      }
      throw error;
    }
  }

  const sb = requirePersistenceAdmin();
  const { data: bound, error: boundError } = await sb
    .from("passport_holder_wallet_accounts")
    .select("subject_id,revoked_at")
    .eq("caip10", input.caip.caip10)
    .maybeSingle();
  if (boundError) throw new HolderSubjectStoreUnavailableError();

  if (bound?.subject_id) {
    if (bound.revoked_at || !await assertHolderSubjectExists(bound.subject_id)) {
      return { ok: false, code: "persist_failed" };
    }
    return { ok: true, subjectId: bound.subject_id, created: false };
  }

  const subjectId = createHolderSubjectId();
  try {
    await insertHolderSubject(subjectId);
  } catch (error) {
    if (error instanceof HolderSubjectStoreUnavailableError) throw error;
    return { ok: false, code: "persist_failed" };
  }

  const bind = await bindVerifiedWalletAccount({
    subjectId,
    caip: input.caip,
    authMethod: input.authMethod,
  });
  if (!bind.ok) return bind;

  return { ok: true, subjectId, created: true };
}

/** Recheck a signed-in wallet's current owner before serving holder records. */
export async function resolveVerifiedWalletSubjectId(caip10: string): Promise<string | null> {
  if (persistenceUsesDirectPostgres()) {
    const direct = await directModule();
    return direct.queryPersistedWalletOwner(caip10);
  }

  const sb = requirePersistenceAdmin();
  const { data, error } = await sb
    .from("passport_holder_wallet_accounts")
    .select("subject_id")
    .eq("caip10", caip10)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new HolderSubjectStoreUnavailableError();
  if (!data?.subject_id) return null;
  return await assertHolderSubjectExists(data.subject_id) ? data.subject_id : null;
}

export async function linkLegacyKeyToSubject(input: {
  subjectId: string;
  legacyKind: string;
  legacyKey: string;
}): Promise<void> {
  if (persistenceUsesDirectPostgres()) {
    const direct = await directModule();
    return direct.linkLegacyKeyToSubjectDirect(input);
  }

  const sb = requirePersistenceAdmin();
  const { error } = await sb.from("passport_holder_legacy_links").insert({
    subject_id: input.subjectId,
    legacy_kind: input.legacyKind,
    legacy_key: input.legacyKey,
  });
  if (error && error.code !== "23505" && error.code !== "42P01") {
    throw error;
  }
}

export async function resolveLegacySubjectId(legacyKind: string, legacyKey: string): Promise<string | null> {
  if (persistenceUsesDirectPostgres()) {
    const direct = await directModule();
    return direct.resolveLegacySubjectIdDirect(legacyKind, legacyKey);
  }

  const sb = requirePersistenceAdmin();
  const { data, error } = await sb
    .from("passport_holder_legacy_links")
    .select("subject_id")
    .eq("legacy_kind", legacyKind)
    .eq("legacy_key", legacyKey)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") return null;
    throw error;
  }
  return data?.subject_id ?? null;
}

export async function assertHolderSubjectExists(subjectId: string): Promise<boolean> {
  if (persistenceUsesDirectPostgres()) {
    const direct = await directModule();
    return direct.assertHolderSubjectExistsDirect(subjectId);
  }

  const sb = requirePersistenceAdmin();
  const { data, error } = await sb
    .from("passport_holder_subjects")
    .select("subject_id")
    .eq("subject_id", subjectId)
    .eq("status", "active")
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") return false;
    throw error;
  }
  return Boolean(data);
}
