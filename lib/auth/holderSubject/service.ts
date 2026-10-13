// FILE: lib/auth/holderSubject/service.ts

import { randomBytes } from "crypto";
import { requirePersistenceAdmin } from "@/lib/persistence/admin";
import { createHolderSubjectId } from "./subjectId";
import type { Caip10Parts } from "./caip";

export class HolderSubjectStoreUnavailableError extends Error {
  constructor() {
    super("holder_subject_store_unavailable");
  }
}

export async function insertHolderSubject(subjectId: string): Promise<void> {
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
  const sb = requirePersistenceAdmin();
  const { data: existing } = await sb
    .from("passport_holder_wallet_accounts")
    .select("subject_id")
    .eq("caip10", input.caip.caip10)
    .maybeSingle();

  if (existing && existing.subject_id !== input.subjectId) {
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
    if (error.code === "23505") return { ok: true };
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
  const sb = requirePersistenceAdmin();
  const { data: bound } = await sb
    .from("passport_holder_wallet_accounts")
    .select("subject_id")
    .eq("caip10", input.caip.caip10)
    .maybeSingle();

  if (bound?.subject_id) {
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

export async function linkLegacyKeyToSubject(input: {
  subjectId: string;
  legacyKind: string;
  legacyKey: string;
}): Promise<void> {
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
  const sb = requirePersistenceAdmin();
  const { data, error } = await sb
    .from("passport_holder_subjects")
    .select("subject_id")
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") return false;
    throw error;
  }
  return Boolean(data);
}
