#!/usr/bin/env npx tsx
/**
 * BUILD #824 — prove atomic portable export status checkpoints (read-only except test row).
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Demo operational store).
 */

import { createClient } from "@supabase/supabase-js";

const PARALLEL = 24;
const receiptId = `dr_concurrency_${Date.now()}`;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error(JSON.stringify({ ok: false, error: "missing_supabase_credentials" }));
    process.exit(2);
  }

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const results = await Promise.all(
    Array.from({ length: PARALLEL }, () =>
      client.rpc("bump_portable_export_status_checkpoint", { p_receipt_id: receiptId }),
    ),
  );

  const versions = results.map((r) => {
    if (r.error) return { error: r.error.message };
    return { version: Number(r.data) };
  });

  const numeric = versions
    .filter((v): v is { version: number } => "version" in v && Number.isInteger(v.version))
    .map((v) => v.version);

  const unique = new Set(numeric);
  const report = {
    ok: numeric.length === PARALLEL && unique.size === PARALLEL,
    receipt_id: receiptId,
    parallel: PARALLEL,
    distinct_versions: unique.size,
    min: numeric.length ? Math.min(...numeric) : null,
    max: numeric.length ? Math.max(...numeric) : null,
    errors: versions.filter((v) => "error" in v),
  };

  if (report.ok) {
    await client
      .from("portable_export_status_checkpoints")
      .delete()
      .eq("receipt_id", receiptId);
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});