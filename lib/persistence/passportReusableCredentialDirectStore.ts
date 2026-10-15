// FILE: lib/persistence/passportReusableCredentialDirectStore.ts
import "server-only";

import type { PoolClient } from "pg";
import type { SignedPassportReusableCredential } from "@/lib/passport/reusableCredential/contract";
import { hashPassportCredentialPayload } from "@/lib/passport/reusableCredential/sign";
import { queryAbraxasPg, withAbraxasPgTransaction } from "./pgPool";

export async function getPassportHolderPossessionPublicKeyDirect(
  holderSubjectId: string,
  client?: PoolClient,
): Promise<string | null> {
  const run = async (c: PoolClient) => {
    const res = await c.query<{ public_key_b64url: string }>(
      `select public_key_b64url from public.passport_holder_possession_keys where holder_subject_id = $1`,
      [holderSubjectId],
    );
    return res.rows[0]?.public_key_b64url ?? null;
  };
  if (client) return run(client);
  const { rows } = await queryAbraxasPg<{ public_key_b64url: string }>(
    `select public_key_b64url from public.passport_holder_possession_keys where holder_subject_id = $1`,
    [holderSubjectId],
  );
  return rows[0]?.public_key_b64url ?? null;
}

export async function countActiveReusableCredentialsForHolderDirect(
  holderSubjectId: string,
  client?: PoolClient,
): Promise<number> {
  const sql = `select count(*)::int as c from public.passport_reusable_credentials
               where holder_subject_id = $1 and expires_at > now()`;
  if (client) {
    const res = await client.query<{ c: number }>(sql, [holderSubjectId]);
    return res.rows[0]?.c ?? 0;
  }
  const { rows } = await queryAbraxasPg<{ c: number }>(sql, [holderSubjectId]);
  return rows[0]?.c ?? 0;
}

export async function deleteReusableCredentialsForHolderOnClient(
  client: PoolClient,
  holderSubjectId: string,
): Promise<number> {
  const res = await client.query(
    `delete from public.passport_reusable_credentials where holder_subject_id = $1`,
    [holderSubjectId],
  );
  return res.rowCount ?? 0;
}

export type RegisterPossessionKeyResult =
  | { ok: true; rotated: boolean }
  | { ok: false; code: "invalid_public_key" | "possession_key_rotation_required" | "rotation_previous_key_mismatch" };

export async function registerPassportHolderPossessionKeyDirect(input: {
  holderSubjectId: string;
  publicKeyB64Url: string;
  rotation?: { authorized: true; previous_public_key_b64url: string };
}): Promise<RegisterPossessionKeyResult> {
  const { validateHolderPossessionPublicKeyB64Url, possessionKeysEqual } = await import(
    "@/lib/passport/reusableCredential/holderPossessionKeyValidation"
  );
  const validated = validateHolderPossessionPublicKeyB64Url(input.publicKeyB64Url);
  if (!validated.ok) {
    return { ok: false, code: "invalid_public_key" };
  }

  return withAbraxasPgTransaction(async (client) => {
    const existing = await client.query<{ public_key_b64url: string }>(
      `select public_key_b64url from public.passport_holder_possession_keys where holder_subject_id = $1 for update`,
      [input.holderSubjectId],
    );
    const previous = existing.rows[0]?.public_key_b64url ?? null;
    if (previous && possessionKeysEqual(previous, validated.publicKeyB64Url)) {
      return { ok: true, rotated: false };
    }

    const activeCredentials = await countActiveReusableCredentialsForHolderDirect(input.holderSubjectId, client);
    if (previous && activeCredentials > 0) {
      if (!input.rotation?.authorized) {
        return { ok: false, code: "possession_key_rotation_required" };
      }
      const prevCheck = validateHolderPossessionPublicKeyB64Url(input.rotation.previous_public_key_b64url);
      if (!prevCheck.ok || !possessionKeysEqual(previous, prevCheck.publicKeyB64Url)) {
        return { ok: false, code: "rotation_previous_key_mismatch" };
      }
      await deleteReusableCredentialsForHolderOnClient(client, input.holderSubjectId);
    }

    await client.query(
      `insert into public.passport_holder_possession_keys (holder_subject_id, public_key_b64url, updated_at)
       values ($1, $2, now())
       on conflict (holder_subject_id) do update set public_key_b64url = excluded.public_key_b64url, updated_at = now()`,
      [input.holderSubjectId, validated.publicKeyB64Url],
    );
    return { ok: true, rotated: Boolean(previous) };
  });
}

/** @deprecated Use registerPassportHolderPossessionKeyDirect */
export async function upsertPassportHolderPossessionKeyDirect(input: {
  holderSubjectId: string;
  publicKeyB64Url: string;
}): Promise<void> {
  const result = await registerPassportHolderPossessionKeyDirect(input);
  if (!result.ok) {
    throw new Error(result.code);
  }
}

export async function getPassportReusableCredentialByIdDirect(
  credentialId: string,
): Promise<SignedPassportReusableCredential | null> {
  const { rows } = await queryAbraxasPg<{ signed_credential_text: string }>(
    `select signed_credential_text from public.passport_reusable_credentials where credential_id = $1`,
    [credentialId],
  );
  return normalizeStoredCredential(rows[0]?.signed_credential_text);
}

function normalizeStoredCredential(
  value: SignedPassportReusableCredential | string | undefined | null,
): SignedPassportReusableCredential | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as SignedPassportReusableCredential;
    } catch {
      return null;
    }
  }
  return value;
}

export async function listPassportReusableCredentialsForHolderDirect(
  holderSubjectId: string,
): Promise<SignedPassportReusableCredential[]> {
  const { rows } = await queryAbraxasPg<{ signed_credential_text: string }>(
    `select signed_credential_text from public.passport_reusable_credentials
     where holder_subject_id = $1 order by issued_at desc`,
    [holderSubjectId],
  );
  return rows.map((r) => normalizeStoredCredential(r.signed_credential_text)).filter(Boolean) as SignedPassportReusableCredential[];
}

export async function getPassportReusableCredentialByJtiOnClient(
  client: PoolClient,
  linkedJti: string,
): Promise<SignedPassportReusableCredential | null> {
  const res = await client.query<{ signed_credential_text: string }>(
    `select signed_credential_text from public.passport_reusable_credentials where linked_credential_jti = $1`,
    [linkedJti],
  );
  return normalizeStoredCredential(res.rows[0]?.signed_credential_text);
}

export async function persistPassportReusableCredentialOnClient(
  client: PoolClient,
  input: {
    credential: SignedPassportReusableCredential;
    linkedCredentialJti: string;
    sandboxLabeled: boolean;
  },
): Promise<{ inserted: true } | { duplicate: true }> {
  const p = input.credential.payload;
  if (hashPassportCredentialPayload(p) !== input.credential.payload_hash) {
    throw new Error("passport_reusable_credential_hash_mismatch_before_persist");
  }
  const serialized = JSON.stringify(input.credential);
  const existing = await client.query<{ credential_id: string }>(
    `select credential_id from public.passport_reusable_credentials where linked_credential_jti = $1`,
    [input.linkedCredentialJti],
  );
  if (existing.rows[0]) {
    return { duplicate: true };
  }
  await client.query(
    `insert into public.passport_reusable_credentials (
      credential_id, holder_subject_id, linked_credential_jti, signed_credential_text,
      issuer_id, assurance_level, idv_method, revocation_status_id, issued_at, expires_at, sandbox_labeled, updated_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())`,
    [
      p.credential_id,
      p.holder_subject_id,
      input.linkedCredentialJti,
      serialized,
      p.issuer_id,
      p.assurance_level,
      p.provenance.idv_method,
      p.revocation_status_id,
      p.issued_at,
      p.expires_at,
      input.sandboxLabeled,
    ],
  );
  return { inserted: true };
}

export async function recordPassportReusableIssuanceAuditOnClient(
  client: PoolClient,
  input: {
    holderSubjectId: string;
    linkedCredentialJti: string;
    credentialId?: string | null;
    source: string;
    outcome: string;
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  await client.query(
    `insert into public.passport_reusable_credential_issuance_audit
     (holder_subject_id, linked_credential_jti, credential_id, source, outcome, detail)
     values ($1,$2,$3,$4,$5,$6)`,
    [
      input.holderSubjectId,
      input.linkedCredentialJti,
      input.credentialId ?? null,
      input.source,
      input.outcome,
      input.detail ? JSON.stringify(input.detail) : null,
    ],
  );
}

export async function tryBackfillPassportReusableCredentialForSubjectDirect(input: {
  subjectKey: string;
  eventSource: string;
}): Promise<{ ok: true; credentialId: string } | { ok: false; code: string }> {
  return withAbraxasPgTransaction(async (client) => {
    const { tryIssuePassportReusableCredentialOnClient } = await import(
      "@/lib/persistence/passportReusableCredentialIssuanceHook"
    );
    return tryIssuePassportReusableCredentialOnClient(client, {
      subjectKey: input.subjectKey,
      eventSource: input.eventSource,
    });
  });
}
