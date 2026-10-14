import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PG_URL = process.env.DEMO_IDV_RECOVERY_PG_URL?.trim()
  || process.env.MIGRATION_137_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim()
  || process.env.DATABASE_URL?.trim()
  || undefined;

/** Minimal ordered manifest for wallet-native Abraxas Verify on demo (see docs/DEMO_IDV_SCHEMA_RECOVERY.md). */
const DEMO_IDV_MANIFEST = [
  "021_passport_documents_manual_idv.sql",
  "036_identity_capture_metadata.sql",
  "037_biometric_assessments.sql",
  "050_identity_review_workflow.sql",
  "051_identity_biometric_service_update.sql",
  "079_identity_review_sessions.sql",
  "137_idv_holder_subject_columns.sql",
] as const;

function psql(sql: string): string {
  if (!PG_URL) throw new Error("DEMO_IDV_RECOVERY_PG_URL is required");
  return execFileSync("psql", [PG_URL, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql], {
    encoding: "utf8",
  }).trim();
}

function applyMigration(file: string): void {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations", file), "utf8");
  execFileSync("psql", [PG_URL!, "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" });
}

function applyManifestTwice(): void {
  for (const file of DEMO_IDV_MANIFEST) applyMigration(file);
  for (const file of DEMO_IDV_MANIFEST) applyMigration(file);
}

describe("demo IDV schema recovery manifest (disposable Postgres only)", () => {
  if (!PG_URL) {
    it.skip("requires DEMO_IDV_RECOVERY_PG_URL disposable Postgres", () => {});
    return;
  }

  it("applies manifest idempotently with legacy + wallet-native anchors", () => {
    applyManifestTwice();

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
        user_email, stamp_id, file_name, storage_path, status, holder_subject_id, capture_session_id
      ) VALUES (
        'wallet-${runId}@example.com', 'identity', 'id.jpg', 'opaque/wallet-${runId}', 'submitted', '${hs}', 'cap_${runId}'
      );
    `);

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

    psql(`
      INSERT INTO public.identity_biometric_assessments (
        capture_session_id, holder_subject_id, face_match_score, liveness_score,
        document_quality_score, selfie_quality_score, decision, assurance_level,
        review_method, engine_version, analyzed_at
      ) VALUES (
        'bio_wallet_${runId}', '${hs}', 0.9, 0.9, 0.9, 0.9, 'human_review', 'L2',
        'human_biometric_match', 'test', now()
      );
    `);

    const legacyDocs = psql("select count(*) from public.passport_documents where sui_address is not null and holder_subject_id is null;");
    const walletDocs = psql(`select count(*) from public.passport_documents where holder_subject_id = '${hs}';`);
    expect(Number(legacyDocs)).toBeGreaterThan(0);
    expect(Number(walletDocs)).toBeGreaterThan(0);

    expect(() => psql(`
      INSERT INTO public.passport_documents (
        user_email, stamp_id, file_name, storage_path, status, holder_subject_id, sui_address
      ) VALUES (
        'dual-${runId}@example.com', 'identity', 'id.jpg', 'opaque/dual', 'submitted', '${hs}', '${sui}'
      );
    `)).toThrow();
  });

  it("preserves simulated legacy identity table row counts across manifest (no identity_verifications DDL)", () => {
    psql(`
      create table if not exists public.identity_verifications (
        wallet_address text primary key,
        sui_address text,
        holder_subject_id text,
        identity_verification_status text,
        credential_jti text
      );
    `);
    const sui = "0xlegacydemo000000000000000000000000000000000000000000000000000001";
    psql(`
      INSERT INTO public.identity_verifications (
        wallet_address, sui_address, identity_verification_status, credential_jti
      ) VALUES ('${sui}', '${sui}', 'approved', 'urn:uuid:legacy-demo')
      ON CONFLICT (wallet_address) DO NOTHING;
    `);
    const before = psql("select count(*) from public.identity_verifications;");
    applyManifestTwice();
    const after = psql("select count(*) from public.identity_verifications;");
    const status = psql("select identity_verification_status from public.identity_verifications where wallet_address = '" + sui + "';");
    expect(after).toBe(before);
    expect(status).toBe("approved");
  });
});
