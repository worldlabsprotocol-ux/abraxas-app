#!/usr/bin/env npx tsx
// FILE: scripts/database-recovery/verify-demo-trust-slice.ts
// Post-restore read-only trust slice fingerprint (disposable DB only).

import { assertDisposableRestoreTarget } from "@/lib/databaseRecovery/guard";
import { createRecoveryPgClient } from "@/lib/databaseRecovery/pgClient";
import { redactDatabaseSecrets } from "@/scripts/demo/lib/demoDatabaseUrl";

const TRUST_FINGERPRINT_SQL = `
  SELECT json_build_object(
    'receipts', (SELECT coalesce(json_agg(row_to_json(r) ORDER BY r.id), '[]'::json) FROM (
      SELECT id, schema_version, status, payload_hash, signature, signing_key_id
      FROM public.decision_receipts ORDER BY id
    ) r),
    'receipt_count', (SELECT count(*)::int FROM public.decision_receipts),
    'verification_decisions', (SELECT count(*)::int FROM public.verification_decisions),
    'credential_claims', (SELECT count(*)::int FROM public.credential_claims),
    'receipt_claim_dependencies', (SELECT count(*)::int FROM public.receipt_claim_dependencies),
    'reusable_eligibility_facts', (SELECT count(*)::int FROM public.reusable_eligibility_facts),
    'reusable_eligibility_derivations', (SELECT count(*)::int FROM public.reusable_eligibility_derivations),
    'decision_receipt_revocation_events', (
      SELECT CASE WHEN to_regclass('public.decision_receipt_revocation_events') IS NULL THEN -1
      ELSE (SELECT count(*)::int FROM public.decision_receipt_revocation_events) END
    ),
    'decision_receipt_evidence_dependencies', (
      SELECT CASE WHEN to_regclass('public.decision_receipt_evidence_dependencies') IS NULL THEN -1
      ELSE (SELECT count(*)::int FROM public.decision_receipt_evidence_dependencies) END
    )
  )::text AS fingerprint;
`;

async function main(): Promise<void> {
  const env = process.env;
  const restoreUrl = env.ABRAXAS_RESTORE_DATABASE_URL?.trim();
  if (!restoreUrl) throw new Error("ABRAXAS_RESTORE_DATABASE_URL is required");
  assertDisposableRestoreTarget(restoreUrl, env);

  const client = await createRecoveryPgClient({
    databaseUrl: restoreUrl,
    env: { ...env, DEMO_SUPABASE_SSL_ROOT_CERT_PATH: undefined },
  });
  try {
    const result = await client.query<{ fingerprint: string }>(TRUST_FINGERPRINT_SQL);
    const fingerprint = result.rows[0]?.fingerprint ?? "{}";
    console.log(JSON.stringify({ ok: true, trust_slice_fingerprint: JSON.parse(fingerprint) }));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(redactDatabaseSecrets(error instanceof Error ? error.message : String(error), process.env));
  process.exit(1);
});
