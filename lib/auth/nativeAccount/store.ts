// FILE: lib/auth/nativeAccount/store.ts

import { randomBytes } from "crypto";
import { requirePersistenceAdmin } from "@/lib/persistence/admin";
import { nativeAccountMemoryStoreEnabled } from "./featureFlag";
import { nativeAccountMemory } from "./memoryStore";
import type { AbraxasAccountStatus, MembershipGrantMethod, PartnerMembershipRole } from "./contract";

export class NativeAccountStoreUnavailableError extends Error {
  constructor() {
    super("native_account_store_unavailable");
  }
}

function useMemory(): boolean {
  return nativeAccountMemoryStoreEnabled();
}

export async function insertNativeAccount(accountId: string): Promise<void> {
  if (useMemory()) {
    nativeAccountMemory.insertAccount(accountId);
    return;
  }
  const sb = requirePersistenceAdmin();
  const { error } = await sb.from("abraxas_accounts").insert({ account_id: accountId });
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    if (error.code === "23505") return;
    throw error;
  }
}

export async function getNativeAccountStatus(
  accountId: string,
): Promise<AbraxasAccountStatus | null> {
  if (useMemory()) {
    const acc = nativeAccountMemory.getAccount(accountId);
    return acc?.status ?? null;
  }
  const sb = requirePersistenceAdmin();
  const { data, error } = await sb
    .from("abraxas_accounts")
    .select("status")
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
  return (data?.status as AbraxasAccountStatus | undefined) ?? null;
}

export async function insertPasskeyRecord(input: {
  accountId: string;
  credentialId: string;
  publicKeyCose: string;
  signCount: number;
  transports: string[];
  aaguid?: string | null;
}): Promise<void> {
  const id = `apk_${randomBytes(12).toString("hex")}`;
  if (useMemory()) {
    nativeAccountMemory.insertPasskey({
      id,
      account_id: input.accountId,
      credential_id: input.credentialId,
      public_key_cose: input.publicKeyCose,
      sign_count: input.signCount,
      transports: input.transports,
      aaguid: input.aaguid ?? null,
      revoked_at: null,
    });
    return;
  }
  const sb = requirePersistenceAdmin();
  const { error } = await sb.from("abraxas_account_passkeys").insert({
    id,
    account_id: input.accountId,
    credential_id: input.credentialId,
    public_key_cose: input.publicKeyCose,
    sign_count: input.signCount,
    transports: input.transports,
    aaguid: input.aaguid ?? null,
  });
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    if (error.code === "23505") return;
    throw error;
  }
}

export async function findPasskeyByCredentialId(credentialId: string): Promise<{
  id: string;
  account_id: string;
  public_key_cose: string;
  sign_count: number;
  revoked_at: string | null;
} | null> {
  if (useMemory()) {
    const pk = nativeAccountMemory.getPasskeyByCredentialId(credentialId);
    if (!pk) return null;
    return {
      id: pk.id,
      account_id: pk.account_id,
      public_key_cose: pk.public_key_cose,
      sign_count: pk.sign_count,
      revoked_at: pk.revoked_at,
    };
  }
  const sb = requirePersistenceAdmin();
  const { data, error } = await sb
    .from("abraxas_account_passkeys")
    .select("id, account_id, public_key_cose, sign_count, revoked_at")
    .eq("credential_id", credentialId)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
  return data ?? null;
}

export async function updatePasskeySignCount(credentialId: string, signCount: number): Promise<void> {
  if (useMemory()) {
    nativeAccountMemory.updatePasskeySignCount(credentialId, signCount);
    return;
  }
  const sb = requirePersistenceAdmin();
  const { error } = await sb
    .from("abraxas_account_passkeys")
    .update({ sign_count: signCount, last_used_at: new Date().toISOString() })
    .eq("credential_id", credentialId);
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
}

export async function insertWebAuthnChallenge(input: {
  purpose: "register" | "authenticate";
  accountId?: string | null;
  challenge: string;
  origin: string;
  rpId: string;
  ttlSec: number;
}): Promise<string> {
  const id = `wch_${randomBytes(12).toString("hex")}`;
  const expiresAt = new Date(Date.now() + input.ttlSec * 1000).toISOString();
  if (useMemory()) {
    nativeAccountMemory.insertChallenge({
      id,
      purpose: input.purpose,
      account_id: input.accountId ?? null,
      challenge: input.challenge,
      origin: input.origin,
      rp_id: input.rpId,
      expires_at: expiresAt,
      consumed_at: null,
    });
    return id;
  }
  const sb = requirePersistenceAdmin();
  const { error } = await sb.from("abraxas_webauthn_challenges").insert({
    id,
    purpose: input.purpose,
    account_id: input.accountId ?? null,
    challenge: input.challenge,
    origin: input.origin,
    rp_id: input.rpId,
    expires_at: expiresAt,
  });
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
  return id;
}

export async function loadWebAuthnChallenge(challengeId: string): Promise<{
  purpose: "register" | "authenticate";
  account_id: string | null;
  challenge: string;
  origin: string;
  rp_id: string;
  expires_at: string;
  consumed_at: string | null;
} | null> {
  if (useMemory()) {
    const ch = nativeAccountMemory.getChallenge(challengeId);
    if (!ch) return null;
    return {
      purpose: ch.purpose,
      account_id: ch.account_id,
      challenge: ch.challenge,
      origin: ch.origin,
      rp_id: ch.rp_id,
      expires_at: ch.expires_at,
      consumed_at: ch.consumed_at,
    };
  }
  const sb = requirePersistenceAdmin();
  const { data, error } = await sb
    .from("abraxas_webauthn_challenges")
    .select("purpose, account_id, challenge, origin, rp_id, expires_at, consumed_at")
    .eq("id", challengeId)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
  return data ?? null;
}

export async function consumeWebAuthnChallenge(challengeId: string): Promise<boolean> {
  if (useMemory()) {
    return nativeAccountMemory.consumeChallenge(challengeId);
  }
  const sb = requirePersistenceAdmin();
  const { data } = await sb
    .from("abraxas_webauthn_challenges")
    .select("consumed_at")
    .eq("id", challengeId)
    .maybeSingle();
  if (!data || data.consumed_at) return false;
  const { error } = await sb
    .from("abraxas_webauthn_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", challengeId)
    .is("consumed_at", null);
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    return false;
  }
  return true;
}

export async function upsertPartnerMembership(input: {
  accountId: string;
  partnerId: string;
  role: PartnerMembershipRole;
}): Promise<void> {
  if (useMemory()) {
    nativeAccountMemory.upsertMembership(input.accountId, input.partnerId, input.role);
    return;
  }
  const sb = requirePersistenceAdmin();
  const { error } = await sb.from("abraxas_account_partner_memberships").upsert({
    account_id: input.accountId,
    partner_id: input.partnerId,
    role: input.role,
  });
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
}

export async function assertPartnerMembership(
  accountId: string,
  partnerId: string,
): Promise<{ ok: true; role: PartnerMembershipRole } | { ok: false }> {
  if (useMemory()) {
    const m = nativeAccountMemory.getMembership(accountId, partnerId);
    if (!m) return { ok: false };
    return { ok: true, role: m.role };
  }
  const sb = requirePersistenceAdmin();
  const { data, error } = await sb
    .from("abraxas_account_partner_memberships")
    .select("role")
    .eq("account_id", accountId)
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
  if (!data) return { ok: false };
  return { ok: true, role: data.role as PartnerMembershipRole };
}

export async function recordMembershipGrant(input: {
  accountId: string;
  partnerId: string;
  grantMethod: MembershipGrantMethod;
  apiKeyId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (useMemory()) {
    nativeAccountMemory.recordGrant({
      account_id: input.accountId,
      partner_id: input.partnerId,
      grant_method: input.grantMethod,
      api_key_id: input.apiKeyId ?? null,
      metadata: input.metadata,
    });
    return;
  }
  const sb = requirePersistenceAdmin();
  const { error } = await sb.from("abraxas_account_partner_membership_grants").insert({
    account_id: input.accountId,
    partner_id: input.partnerId,
    grant_method: input.grantMethod,
    api_key_id: input.apiKeyId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
}

export async function listPartnerMemberships(
  accountId: string,
): Promise<Array<{ partner_id: string; role: PartnerMembershipRole }>> {
  if (useMemory()) {
    return nativeAccountMemory.listMemberships(accountId);
  }
  const sb = requirePersistenceAdmin();
  const { data, error } = await sb
    .from("abraxas_account_partner_memberships")
    .select("partner_id, role")
    .eq("account_id", accountId);
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    throw error;
  }
  return (data ?? []) as Array<{ partner_id: string; role: PartnerMembershipRole }>;
}

export async function recordSandboxEnrollment(input: {
  accountId: string;
  partnerId: string;
  applicationId?: string | null;
  idempotencyKey?: string | null;
}): Promise<void> {
  if (useMemory()) {
    nativeAccountMemory.recordEnrollment({
      account_id: input.accountId,
      partner_id: input.partnerId,
      application_id: input.applicationId ?? null,
      idempotency_key: input.idempotencyKey ?? null,
    });
    return;
  }
  const sb = requirePersistenceAdmin();
  const { error } = await sb.from("abraxas_sandbox_enrollments").insert({
    account_id: input.accountId,
    partner_id: input.partnerId,
    application_id: input.applicationId ?? null,
    idempotency_key: input.idempotencyKey ?? null,
  });
  if (error) {
    if (error.code === "42P01") throw new NativeAccountStoreUnavailableError();
    if (error.code === "23505") return;
    throw error;
  }
}
