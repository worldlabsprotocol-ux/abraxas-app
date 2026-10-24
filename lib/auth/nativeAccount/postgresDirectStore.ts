// FILE: lib/auth/nativeAccount/postgresDirectStore.ts
// Native account persistence via Abraxas direct PostgreSQL (no Supabase SDK).

import { queryAbraxasPg } from "@/lib/persistence/pgPool";
import type { AbraxasAccountStatus, MembershipGrantMethod, PartnerMembershipRole } from "./contract";
import { NativeAccountStoreUnavailableError } from "./storeErrors";

function mapPgError(error: unknown): never {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: string }).code);
    if (code === "42P01") throw new NativeAccountStoreUnavailableError();
  }
  throw error;
}

export async function insertNativeAccount(accountId: string): Promise<void> {
  try {
    await queryAbraxasPg(
      `insert into public.abraxas_accounts (account_id) values ($1) on conflict (account_id) do nothing`,
      [accountId],
    );
  } catch (error) {
    mapPgError(error);
  }
}

export async function getNativeAccountStatus(accountId: string): Promise<AbraxasAccountStatus | null> {
  try {
    const { rows } = await queryAbraxasPg<{ status: AbraxasAccountStatus }>(
      `select status from public.abraxas_accounts where account_id = $1 limit 1`,
      [accountId],
    );
    return rows[0]?.status ?? null;
  } catch (error) {
    mapPgError(error);
  }
}

export async function insertPasskeyRecord(input: {
  id: string;
  accountId: string;
  credentialId: string;
  publicKeyCose: string;
  signCount: number;
  transports: string[];
  aaguid?: string | null;
}): Promise<void> {
  try {
    await queryAbraxasPg(
      `insert into public.abraxas_account_passkeys
        (id, account_id, credential_id, public_key_cose, sign_count, transports, aaguid)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (credential_id) do nothing`,
      [
        input.id,
        input.accountId,
        input.credentialId,
        input.publicKeyCose,
        input.signCount,
        input.transports,
        input.aaguid ?? null,
      ],
    );
  } catch (error) {
    mapPgError(error);
  }
}

export async function findPasskeyByCredentialId(credentialId: string): Promise<{
  id: string;
  account_id: string;
  public_key_cose: string;
  sign_count: number;
  revoked_at: string | null;
} | null> {
  try {
    const { rows } = await queryAbraxasPg<{
      id: string;
      account_id: string;
      public_key_cose: string;
      sign_count: number;
      revoked_at: string | null;
    }>(
      `select id, account_id, public_key_cose, sign_count, revoked_at
       from public.abraxas_account_passkeys where credential_id = $1 limit 1`,
      [credentialId],
    );
    return rows[0] ?? null;
  } catch (error) {
    mapPgError(error);
  }
}

export async function updatePasskeySignCount(credentialId: string, signCount: number): Promise<void> {
  try {
    await queryAbraxasPg(
      `update public.abraxas_account_passkeys
       set sign_count = $2, last_used_at = now() where credential_id = $1`,
      [credentialId, signCount],
    );
  } catch (error) {
    mapPgError(error);
  }
}

export async function insertWebAuthnChallenge(input: {
  id: string;
  purpose: "register" | "authenticate";
  accountId?: string | null;
  challenge: string;
  origin: string;
  rpId: string;
  expiresAt: string;
}): Promise<void> {
  try {
    await queryAbraxasPg(
      `insert into public.abraxas_webauthn_challenges
        (id, purpose, account_id, challenge, origin, rp_id, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7::timestamptz)`,
      [
        input.id,
        input.purpose,
        input.accountId ?? null,
        input.challenge,
        input.origin,
        input.rpId,
        input.expiresAt,
      ],
    );
  } catch (error) {
    mapPgError(error);
  }
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
  try {
    const { rows } = await queryAbraxasPg<{
      purpose: "register" | "authenticate";
      account_id: string | null;
      challenge: string;
      origin: string;
      rp_id: string;
      expires_at: string;
      consumed_at: string | null;
    }>(
      `select purpose, account_id, challenge, origin, rp_id, expires_at, consumed_at
       from public.abraxas_webauthn_challenges where id = $1 limit 1`,
      [challengeId],
    );
    return rows[0] ?? null;
  } catch (error) {
    mapPgError(error);
  }
}

export async function consumeWebAuthnChallengeAtomic(challengeId: string): Promise<{
  purpose: "register" | "authenticate";
  account_id: string | null;
  challenge: string;
  origin: string;
  rp_id: string;
} | null> {
  try {
    const { rows } = await queryAbraxasPg<{ payload: { ok?: boolean; purpose?: string; account_id?: string | null; challenge?: string; origin?: string; rp_id?: string } }>(
      `select public.abraxas_consume_webauthn_challenge_atomic($1) as payload`,
      [challengeId],
    );
    const payload = rows[0]?.payload;
    if (!payload?.ok) return null;
    return {
      purpose: payload.purpose as "register" | "authenticate",
      account_id: payload.account_id ?? null,
      challenge: String(payload.challenge),
      origin: String(payload.origin),
      rp_id: String(payload.rp_id),
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "42883") {
      throw new NativeAccountStoreUnavailableError();
    }
    mapPgError(error);
  }
}

export async function upsertPartnerMembership(input: {
  accountId: string;
  partnerId: string;
  role: PartnerMembershipRole;
}): Promise<void> {
  try {
    await queryAbraxasPg(
      `insert into public.abraxas_account_partner_memberships (account_id, partner_id, role, status)
       values ($1, $2, $3, 'active')
       on conflict (account_id, partner_id) do update set role = excluded.role`,
      [input.accountId, input.partnerId, input.role],
    );
  } catch (error) {
    mapPgError(error);
  }
}

export async function insertPartnerMembershipIfAbsent(input: {
  accountId: string;
  partnerId: string;
  role: PartnerMembershipRole;
}): Promise<boolean> {
  try {
    const { rows } = await queryAbraxasPg<{ account_id: string }>(
      `insert into public.abraxas_account_partner_memberships (account_id, partner_id, role, status)
       values ($1, $2, $3, 'active')
       on conflict (account_id, partner_id) do nothing
       returning account_id`,
      [input.accountId, input.partnerId, input.role],
    );
    return rows.length > 0;
  } catch (error) {
    mapPgError(error);
  }
}

export async function revokePartnerMembership(accountId: string, partnerId: string): Promise<void> {
  try {
    await queryAbraxasPg(
      `update public.abraxas_account_partner_memberships
          set status = 'revoked'
        where account_id = $1 and partner_id = $2`,
      [accountId, partnerId],
    );
  } catch (error) {
    mapPgError(error);
  }
}

export async function assertPartnerMembership(
  accountId: string,
  partnerId: string,
): Promise<{ ok: true; role: PartnerMembershipRole } | { ok: false }> {
  try {
    const { rows } = await queryAbraxasPg<{ role: PartnerMembershipRole; status: string }>(
      `select role, coalesce(status, 'active') as status
       from public.abraxas_account_partner_memberships
       where account_id = $1 and partner_id = $2 limit 1`,
      [accountId, partnerId],
    );
    const row = rows[0];
    if (!row || row.status !== "active") return { ok: false };
    return { ok: true, role: row.role };
  } catch (error) {
    mapPgError(error);
  }
}

export async function getPrimarySandboxEnrollment(
  accountId: string,
): Promise<{ partner_id: string; application_id: string | null } | null> {
  try {
    const { rows } = await queryAbraxasPg<{ partner_id: string; application_id: string | null }>(
      `select partner_id, application_id::text
       from public.abraxas_sandbox_enrollments
       where account_id = $1 order by created_at asc limit 1`,
      [accountId],
    );
    const row = rows[0];
    if (!row) return null;
    return { partner_id: row.partner_id, application_id: row.application_id };
  } catch (error) {
    mapPgError(error);
  }
}

export async function recordMembershipGrant(input: {
  accountId: string;
  partnerId: string;
  grantMethod: MembershipGrantMethod;
  apiKeyId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await queryAbraxasPg(
      `insert into public.abraxas_account_partner_membership_grants
        (account_id, partner_id, grant_method, api_key_id, metadata)
       values ($1, $2, $3, $4, $5::jsonb)`,
      [
        input.accountId,
        input.partnerId,
        input.grantMethod,
        input.apiKeyId ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  } catch (error) {
    mapPgError(error);
  }
}

export async function listPartnerMemberships(
  accountId: string,
): Promise<Array<{ partner_id: string; role: PartnerMembershipRole }>> {
  try {
    const { rows } = await queryAbraxasPg<{ partner_id: string; role: PartnerMembershipRole }>(
      `select partner_id, role from public.abraxas_account_partner_memberships where account_id = $1`,
      [accountId],
    );
    return rows;
  } catch (error) {
    mapPgError(error);
  }
}

export async function recordSandboxEnrollment(input: {
  accountId: string;
  partnerId: string;
  applicationId?: string | null;
  idempotencyKey?: string | null;
}): Promise<void> {
  try {
    await queryAbraxasPg(
      `insert into public.abraxas_sandbox_enrollments
        (account_id, partner_id, application_id, idempotency_key)
       values ($1, $2, $3::uuid, $4)
       on conflict (idempotency_key) do nothing`,
      [input.accountId, input.partnerId, input.applicationId ?? null, input.idempotencyKey ?? null],
    );
  } catch (error) {
    mapPgError(error);
  }
}

export async function insertAccountSolanaChallenge(row: {
  id: string;
  wallet_address: string;
  solana_network: string;
  origin: string;
  uri: string;
  request_id: string;
  session_context_hash: string;
  nonce: string;
  message: string;
  expires_at: string;
}): Promise<void> {
  try {
    await queryAbraxasPg(
      `insert into public.abraxas_account_solana_auth_challenges
        (id, wallet_address, solana_network, origin, uri, request_id, session_context_hash, nonce, message, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz)`,
      [
        row.id,
        row.wallet_address,
        row.solana_network,
        row.origin,
        row.uri,
        row.request_id,
        row.session_context_hash,
        row.nonce,
        row.message,
        row.expires_at,
      ],
    );
  } catch (error) {
    mapPgError(error);
  }
}

export async function consumeAccountSolanaChallengeAtomic(input: {
  challengeId: string;
  walletAddress: string;
  sessionContextHash: string;
}): Promise<{
  id: string;
  wallet_address: string;
  solana_network: string;
  origin: string;
  uri: string;
  request_id: string;
  session_context_hash: string;
  nonce: string;
  message: string;
  expires_at: string;
  consumed_at: string | null;
} | null> {
  try {
    const { rows } = await queryAbraxasPg<{ result: { ok?: boolean } & Record<string, unknown> }>(
      `select public.abraxas_consume_account_solana_challenge_atomic($1, $2, $3) as result`,
      [input.challengeId, input.walletAddress, input.sessionContextHash],
    );
    const payload = rows[0]?.result;
    if (!payload?.ok) return null;
    return {
      id: input.challengeId,
      wallet_address: String(payload.wallet_address),
      solana_network: String(payload.solana_network),
      origin: String(payload.origin),
      uri: String(payload.uri),
      request_id: String(payload.request_id),
      session_context_hash: input.sessionContextHash,
      nonce: String(payload.nonce),
      message: String(payload.message),
      expires_at: String(payload.expires_at),
      consumed_at: new Date().toISOString(),
    };
  } catch (error) {
    mapPgError(error);
  }
}

export async function findAccountIdBySolanaWallet(
  walletAddress: string,
  solanaNetwork: string,
): Promise<string | null> {
  try {
    const { rows } = await queryAbraxasPg<{ account_id: string }>(
      `select account_id from public.abraxas_account_solana_wallets
       where wallet_address = $1 and solana_network = $2 and revoked_at is null limit 1`,
      [walletAddress, solanaNetwork],
    );
    return rows[0]?.account_id ?? null;
  } catch (error) {
    mapPgError(error);
  }
}

export async function linkSolanaWalletToAccount(input: {
  id: string;
  accountId: string;
  walletAddress: string;
  solanaNetwork: string;
}): Promise<void> {
  try {
    await queryAbraxasPg(
      `insert into public.abraxas_account_solana_wallets
        (id, account_id, wallet_address, solana_network, last_used_at)
       values ($1, $2, $3, $4, now())
       on conflict (wallet_address, solana_network) do nothing`,
      [input.id, input.accountId, input.walletAddress, input.solanaNetwork],
    );
  } catch (error) {
    mapPgError(error);
  }
}

export async function getPrimarySolanaWalletForAccount(
  accountId: string,
): Promise<{ wallet_address: string; solana_network: string } | null> {
  try {
    const { rows } = await queryAbraxasPg<{ wallet_address: string; solana_network: string }>(
      `select wallet_address, solana_network
       from public.abraxas_account_solana_wallets
       where account_id = $1 and revoked_at is null
       order by last_used_at desc nulls last, created_at asc
       limit 1`,
      [accountId],
    );
    return rows[0] ?? null;
  } catch (error) {
    mapPgError(error);
  }
}

export async function touchSolanaWalletLastUsed(
  walletAddress: string,
  solanaNetwork: string,
): Promise<void> {
  try {
    await queryAbraxasPg(
      `update public.abraxas_account_solana_wallets set last_used_at = now()
       where wallet_address = $1 and solana_network = $2 and revoked_at is null`,
      [walletAddress, solanaNetwork],
    );
  } catch (error) {
    mapPgError(error);
  }
}

export async function insertAccountSessionRecord(input: {
  sessionId: string;
  accountId: string;
  authMethod: "passkey" | "solana_wallet";
  expiresAt: string;
}): Promise<void> {
  try {
    await queryAbraxasPg(
      `insert into public.abraxas_account_sessions (session_id, account_id, auth_method, expires_at)
       values ($1, $2, $3, $4::timestamptz)`,
      [input.sessionId, input.accountId, input.authMethod, input.expiresAt],
    );
  } catch (error) {
    mapPgError(error);
  }
}

export async function isAccountSessionActive(input: {
  sessionId: string;
  accountId: string;
}): Promise<boolean> {
  try {
    const { rows } = await queryAbraxasPg<{ active: boolean }>(
      `select public.abraxas_validate_account_session($1, $2) as active`,
      [input.sessionId, input.accountId],
    );
    return Boolean(rows[0]?.active);
  } catch (error) {
    mapPgError(error);
  }
}

export async function revokeAccountSession(input: {
  sessionId: string;
  accountId: string;
  reason: string;
}): Promise<boolean> {
  try {
    const { rows } = await queryAbraxasPg<{ revoked: boolean }>(
      `select public.abraxas_revoke_account_session($1, $2, $3) as revoked`,
      [input.sessionId, input.accountId, input.reason],
    );
    return Boolean(rows[0]?.revoked);
  } catch (error) {
    mapPgError(error);
  }
}

export async function revokeAllAccountSessions(accountId: string, reason: string): Promise<number> {
  try {
    const { rows } = await queryAbraxasPg<{ session_id: string }>(
      `update public.abraxas_account_sessions
          set revoked_at = now(), revoke_reason = $2
        where account_id = $1 and revoked_at is null
        returning session_id`,
      [accountId, reason],
    );
    return rows.length;
  } catch (error) {
    mapPgError(error);
  }
}
