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
