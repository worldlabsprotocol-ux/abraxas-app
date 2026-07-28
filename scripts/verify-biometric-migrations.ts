#!/usr/bin/env npx tsx
// FILE: scripts/verify-biometric-migrations.ts
// Verify biometric migration SQL files and optional live Supabase schema.

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(__dirname, "..");

const MIGRATIONS = [
  {
    file: "supabase/migrations/036_identity_capture_metadata.sql",
    requiredColumns: ["document_type", "capture_session_id", "legal_name"],
    table: "passport_documents",
  },
  {
    file: "supabase/migrations/037_biometric_assessments.sql",
    requiredTable: "identity_biometric_assessments",
  },
  {
    file: "supabase/migrations/050_identity_review_workflow.sql",
    requiredTable: "identity_review_audit_log",
    requiredColumns: ["reviewer_decision", "engine_decision"],
  },
  {
    file: "supabase/migrations/051_identity_biometric_service_update.sql",
    requiredColumns: ["grant update"],
  },
];

function checkSqlFiles(): { ok: boolean; messages: string[] } {
  const messages: string[] = [];
  let ok = true;

  for (const m of MIGRATIONS) {
    const path = join(ROOT, m.file);
    if (!existsSync(path)) {
      ok = false;
      messages.push(`MISSING: ${m.file}`);
      continue;
    }
    const sql = readFileSync(path, "utf8");
    if (m.requiredColumns) {
      for (const col of m.requiredColumns) {
        if (!sql.includes(col)) {
          ok = false;
          messages.push(`${m.file}: missing column reference ${col}`);
        }
      }
    }
    if (m.requiredTable && !sql.includes(m.requiredTable)) {
      ok = false;
      messages.push(`${m.file}: missing table ${m.requiredTable}`);
    }
    messages.push(`OK file: ${m.file}`);
  }

  return { ok, messages };
}

async function checkLiveSchema(): Promise<{ ok: boolean; messages: string[] }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const messages: string[] = [];

  if (!url || !key) {
    messages.push("SKIP live schema: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY unset");
    return { ok: true, messages };
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  let ok = true;

  const { error: docErr } = await sb.from("passport_documents").select("capture_session_id").limit(1);
  if (docErr) {
    ok = false;
    messages.push(`LIVE: passport_documents.capture_session_id — ${docErr.message}`);
  } else {
    messages.push("LIVE: passport_documents capture columns present");
  }

  const { error: assessErr } = await sb.from("identity_biometric_assessments").select("id").limit(1);
  if (assessErr) {
    ok = false;
    messages.push(`LIVE: identity_biometric_assessments — ${assessErr.message} (run 037 in Supabase SQL editor)`);
  } else {
    messages.push("LIVE: identity_biometric_assessments table present");
  }

  const { error: auditErr } = await sb.from("identity_review_audit_log").select("id").limit(1);
  if (auditErr) {
    ok = false;
    messages.push(`LIVE: identity_review_audit_log — ${auditErr.message} (run 050 in Supabase SQL editor)`);
  } else {
    messages.push("LIVE: identity_review_audit_log table present");
  }

  return { ok, messages };
}

async function main() {
  console.log("=== Abraxas biometric migration verify ===\n");

  const files = checkSqlFiles();
  for (const m of files.messages) console.log(m);

  const live = await checkLiveSchema();
  console.log("");
  for (const m of live.messages) console.log(m);

  const allOk = files.ok && live.ok;
  console.log(allOk ? "\n✓ Migrations verified" : "\n✗ Migration issues found");
  process.exit(allOk ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
