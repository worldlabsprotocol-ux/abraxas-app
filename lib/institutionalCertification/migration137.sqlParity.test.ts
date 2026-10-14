import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PG_URL = process.env.MIGRATION_137_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim()
  || process.env.DATABASE_URL?.trim()
  || undefined;

function psql(sql: string): string {
  if (!PG_URL) throw new Error("MIGRATION_137_PG_URL is required");
  return execFileSync("psql", [PG_URL, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql], {
    encoding: "utf8",
  }).trim();
}

function applyMigration(file: string): void {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations", file), "utf8");
  execFileSync("psql", [PG_URL!, "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" });
}

describe("migration 137 SQL parity (requires MIGRATION_137_PG_URL disposable Postgres)", () => {
  if (!PG_URL) {
    it.skip("requires MIGRATION_137_PG_URL disposable Postgres", () => {});
    return;
  }

  it("enforces exclusive subject anchors with legacy-compatible passport rows", () => {
    applyMigration("021_passport_documents_manual_idv.sql");
    applyMigration("037_biometric_assessments.sql");
    applyMigration("079_identity_review_sessions.sql");
    applyMigration("137_idv_holder_subject_columns.sql");
    applyMigration("137_idv_holder_subject_columns.sql");

    const hs = "abx_hs_aabbccddeeff00112233445566778899";
    const sui = "0x00000000000000000000000000000000000000000000000000000000000000aa";
    const runId = randomUUID().slice(0, 8);

    psql(`
      INSERT INTO public.passport_documents (
        user_email, stamp_id, file_name, storage_path, status, sui_address
      ) VALUES (
        'legacy-${runId}@example.com', 'identity', 'id.jpg', 'opaque/legacy-${runId}', 'submitted', '${sui}'
      );
    `);

    psql(`
      INSERT INTO public.passport_documents (
        user_email, stamp_id, file_name, storage_path, status, holder_subject_id, sui_address
      ) VALUES (
        'wallet-${runId}@example.com', 'identity', 'id.jpg', 'opaque/wallet-${runId}', 'submitted', '${hs}', null
      );
    `);

    expect(() => psql(`
      INSERT INTO public.passport_documents (
        user_email, stamp_id, file_name, storage_path, status, holder_subject_id, sui_address
      ) VALUES (
        'bad-${runId}@example.com', 'identity', 'id.jpg', 'opaque/bad-${runId}', 'submitted', '${hs}', '${sui}'
      );
    `)).toThrow();

    psql(`
      INSERT INTO public.identity_review_sessions (
        capture_session_id, sui_address, review_status
      ) VALUES ('cap_legacy_${runId}', '${sui}', 'pending');
    `);

    psql(`
      INSERT INTO public.identity_review_sessions (
        capture_session_id, holder_subject_id, review_status
      ) VALUES ('cap_wallet_${runId}', '${hs}', 'pending');
    `);

    expect(() => psql(`
      INSERT INTO public.identity_review_sessions (
        capture_session_id, sui_address, holder_subject_id, review_status
      ) VALUES ('cap_dual_${runId}', '${sui}', '${hs}', 'pending');
    `)).toThrow();

    expect(() => psql(`
      INSERT INTO public.identity_biometric_assessments (
        capture_session_id, holder_subject_id, face_match_score, liveness_score,
        document_quality_score, selfie_quality_score, decision, assurance_level,
        review_method, engine_version, analyzed_at
      ) VALUES (
        'bio_bad_hs_${runId}', 'abx_hs_notvalid', 0.5, 0.5, 0.5, 0.5, 'human_review', 'L2',
        'human_biometric_match', 'test', now()
      );
    `)).toThrow();

    psql(`
      INSERT INTO public.identity_biometric_assessments (
        capture_session_id, sui_address, face_match_score, liveness_score,
        document_quality_score, selfie_quality_score, decision, assurance_level,
        review_method, engine_version, analyzed_at
      ) VALUES (
        'bio_legacy_${runId}', '${sui}', 0.5, 0.5, 0.5, 0.5, 'human_review', 'L2',
        'human_biometric_match', 'test', now()
      );
    `);
  });
});
