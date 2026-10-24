// FILE: lib/persistence/boundary/staging/issuerTrustRecovery.ts
// Issuer compromise is not reversible by database restore alone.

import type { Pool } from "pg";

/**
 * After a signing-key compromise, operators must revoke the key in authoritative
 * issuer state. Restoring an older backup must not silently re-authorize a
 * compromised key without an explicit, audited promotion procedure.
 */
export async function revokeIssuerSigningKeyOnSovereignPg(
  pool: Pool,
  signingKeyId: string,
): Promise<void> {
  await pool.query(
    `update public.issuer_signing_keys set status = 'revoked' where signing_key_id = $1`,
    [signingKeyId],
  );
}

export async function readIssuerSigningKeyStatus(
  pool: Pool,
  signingKeyId: string,
): Promise<string | null> {
  const result = await pool.query<{ status: string }>(
    `select status from public.issuer_signing_keys where signing_key_id = $1 limit 1`,
    [signingKeyId],
  );
  return result.rows[0]?.status ?? null;
}
