// FILE: lib/persistence/claimsDirectStore.ts
import "server-only";

import type { PoolClient } from "pg";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { normalizeHolderSubjectKey } from "@/lib/idv/holderIdentityRef";
import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { queryAbraxasPg, withAbraxasPgTransaction } from "./pgPool";

export class ClaimsDirectStoreUnavailableError extends Error {
  constructor() {
    super("claims_direct_store_unavailable");
  }
}

export class ClaimsDirectPersistError extends Error {
  constructor(
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ClaimsDirectPersistError";
  }
}

function normalizeClaimSubjectId(subjectId: string): string {
  const key = normalizeHolderSubjectKey(subjectId);
  if (isChainNeutralHolderSubjectId(key)) return key;
  return normalizeSuiAddress(key);
}

async function replaceCredentialClaimOnClient(
  client: PoolClient,
  claim: Omit<CredentialClaimRecord, "id" | "status">,
): Promise<string> {
  const subject = normalizeClaimSubjectId(claim.subject_id);
  const claimType = claim.claim_type.trim();
  if (!subject || !claimType || !claim.issuer_id?.trim()) {
    throw new ClaimsDirectPersistError("invalid_claim_input");
  }

  const inserted = await client.query<{ id: string }>(
    `insert into public.credential_claims (
      subject_id, credential_jti, claim_type, claim_value, issuer_id, assurance_level,
      issued_at, expires_at, status, evidence_reference, jurisdiction, policy_scope, updated_at
    ) values ($1,$2,$3,$4,$5,$6,coalesce($7, now()),$8,'active',$9,$10,$11, now())
    returning id`,
    [
      subject,
      claim.credential_jti,
      claimType,
      JSON.stringify(claim.claim_value ?? {}),
      claim.issuer_id.trim(),
      claim.assurance_level,
      claim.issued_at,
      claim.expires_at,
      claim.evidence_reference,
      claim.jurisdiction,
      claim.policy_scope,
    ],
  );
  const newId = inserted.rows[0]?.id;
  if (!newId) throw new ClaimsDirectPersistError("claim_insert_failed");

  await client.query(
    `update public.credential_claims
     set status = 'expired', updated_at = now()
     where subject_id = $1 and claim_type = $2 and status = 'active' and id <> $3`,
    [subject, claimType, newId],
  );
  return newId;
}

export async function upsertClaimsDirect(
  claims: Omit<CredentialClaimRecord, "id" | "status">[],
  client?: PoolClient,
): Promise<void> {
  if (!claims.length) {
    throw new ClaimsDirectPersistError("claims_required");
  }
  const run = async (c: PoolClient) => {
    for (const claim of claims) {
      await replaceCredentialClaimOnClient(c, claim);
    }
  };
  if (client) {
    await run(client);
    return;
  }
  try {
    await withAbraxasPgTransaction(run);
  } catch (error) {
    if (error instanceof ClaimsDirectPersistError) throw error;
    throw new ClaimsDirectStoreUnavailableError();
  }
}

function normalizeTimestamp(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapClaimRow(row: Record<string, unknown>): CredentialClaimRecord {
  const rawValue = row.claim_value;
  const claimValue = typeof rawValue === "string"
    ? (JSON.parse(rawValue) as Record<string, unknown>)
    : ((rawValue as Record<string, unknown>) ?? {});
  return {
    id: row.id as string,
    subject_id: row.subject_id as string,
    credential_jti: (row.credential_jti as string | null) ?? null,
    claim_type: row.claim_type as CredentialClaimRecord["claim_type"],
    claim_value: claimValue,
    issuer_id: row.issuer_id as string,
    assurance_level: (row.assurance_level as CredentialClaimRecord["assurance_level"]) ?? null,
    issued_at: normalizeTimestamp(row.issued_at) ?? new Date().toISOString(),
    expires_at: normalizeTimestamp(row.expires_at),
    status: row.status as CredentialClaimRecord["status"],
    revocation_reference: (row.revocation_reference as string | null) ?? null,
    evidence_reference: (row.evidence_reference as string | null) ?? null,
    jurisdiction: (row.jurisdiction as string | null) ?? null,
    policy_scope: (row.policy_scope as string | null) ?? null,
  };
}

export async function getActiveClaimsDirect(subjectId: string): Promise<CredentialClaimRecord[]> {
  const subject = normalizeClaimSubjectId(subjectId);
  const now = new Date().toISOString();
  try {
    const result = await queryAbraxasPg<Record<string, unknown>>(
      `select * from public.credential_claims
       where subject_id = $1 and status = 'active'
       order by issued_at desc`,
      [subject],
    );
    return result.rows
      .map(mapClaimRow)
      .filter((c) => !c.expires_at || c.expires_at > now);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "42P01") {
      throw new ClaimsDirectStoreUnavailableError();
    }
    throw error;
  }
}

export async function revokeSubjectClaimsDirect(
  subjectId: string,
  reason: string,
  jti?: string,
): Promise<void> {
  const subject = normalizeClaimSubjectId(subjectId);
  const revokedAt = new Date().toISOString();
  await withAbraxasPgTransaction(async (client) => {
    if (jti) {
      const claims = await client.query(
        `update public.credential_claims
         set status = 'revoked', revocation_reference = $3, updated_at = $4
         where subject_id = $1 and credential_jti = $2 and status = 'active'`,
        [subject, jti, reason, revokedAt],
      );
      const cred = await client.query(
        `update public.abraxas_credentials
         set revoked_at = $3
         where jti = $2 and holder_wallet = $1`,
        [subject, jti, revokedAt],
      );
      if ((claims.rowCount ?? 0) < 1 && (cred.rowCount ?? 0) < 1) {
        throw new ClaimsDirectPersistError("credential_scoped_revoke_noop");
      }
      return;
    }
    await client.query(
      `update public.credential_claims
       set status = 'revoked', revocation_reference = $2, updated_at = $3
       where subject_id = $1 and status = 'active'`,
      [subject, reason, revokedAt],
    );
  });
}

export async function countActiveClaimsForJtiDirect(
  subjectId: string,
  jti: string,
  client?: PoolClient,
): Promise<number> {
  const subject = normalizeClaimSubjectId(subjectId);
  const sql = `select count(*)::text as count from public.credential_claims
    where subject_id = $1 and credential_jti = $2 and status = 'active'`;
  const params = [subject, jti];
  if (client) {
    const result = await client.query<{ count: string }>(sql, params);
    return Number.parseInt(result.rows[0]?.count ?? "0", 10);
  }
  const result = await queryAbraxasPg<{ count: string }>(sql, params);
  return Number.parseInt(result.rows[0]?.count ?? "0", 10);
}
