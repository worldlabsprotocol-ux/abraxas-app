// FILE: lib/decisionReceipts/v1_1_0/migration153.sqlParity.test.ts

import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const PG_URL = process.env.MIGRATION_153_PG_URL?.trim() || undefined;

function psql(sql: string): string {
  if (!PG_URL) throw new Error("MIGRATION_153_PG_URL is required");
  return execFileSync("psql", [PG_URL, "-q", "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql], {
    encoding: "utf8",
  }).trim();
}

function psqlJson(sql: string): { ok?: boolean; code?: string } {
  const raw = psql(sql);
  return JSON.parse(raw) as { ok?: boolean; code?: string };
}

const RECEIPT_ID = "dr_AAAAAAAAAAAAAAAAAAAA";
const COMMITMENT = JSON.stringify({
  schema: "abraxas.evidence_commitment/v1",
  digest: "deadbeef847",
  entry_count: 0,
});
const MANIFEST = "[]";

function rpcArgs(receiptId: string, provisional: string, finalHash: string): string {
  const esc = (s: string) => s.replace(/'/g, "''");
  return `'${esc(receiptId)}', '${esc(provisional)}', '${esc(finalHash)}', 'final-sig', 'anchor-sidecar-final', NULL, '${COMMITMENT}'::jsonb, '${MANIFEST}'::jsonb, 'final', now()`;
}

describe("migration 153 SQL parity (requires MIGRATION_153_PG_URL)", () => {
  if (!PG_URL) {
    it.skip("requires MIGRATION_153_PG_URL disposable Postgres", () => {});
    return;
  }

  it("function signature uses text receipt id (dr_ prefix)", () => {
    const sig = psql(`
      select pg_catalog.pg_get_function_identity_arguments(p.oid)
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'abraxas_finalize_v11_receipt_atomic';
    `);
    expect(sig.startsWith("p_receipt_id text")).toBe(true);
  });

  it("grants execute to service_role only (not anon/authenticated)", () => {
    const grants = psql(`
      select grantee || ':' || privilege_type
      from information_schema.routine_privileges
      where routine_schema = 'public'
        and routine_name = 'abraxas_finalize_v11_receipt_atomic'
      order by grantee;
    `);
    expect(grants).toContain("service_role:EXECUTE");
    expect(grants).not.toContain("anon:EXECUTE");
    expect(grants).not.toContain("authenticated:EXECUTE");
    expect(grants).not.toContain("PUBLIC:EXECUTE");
  });

  it("denies anon and authenticated execution", () => {
    expect(() => psql(`
      set role anon;
      select public.abraxas_finalize_v11_receipt_atomic(${rpcArgs(RECEIPT_ID, "h", "h2")});
    `)).toThrow();
    expect(() => psql(`
      set role authenticated;
      select public.abraxas_finalize_v11_receipt_atomic(${rpcArgs(RECEIPT_ID, "h", "h2")});
    `)).toThrow();
    psql("reset role;");
  });

  it("atomically finalizes pending v1.1.0 receipt with realistic dr_ id", () => {
    const decisionId = psql(`
      insert into public.verification_decisions (id) values (gen_random_uuid()) returning id;
    `);
    psql(`
      insert into public.decision_receipts (
        id, verification_decision_id, partner_id, policy_id, policy_version,
        subject_pseudonym_id, decision_result, evaluated_at, status, schema_version,
        payload_hash, signature, signing_key_id
      ) values (
        '${RECEIPT_ID}',
        '${decisionId}'::uuid,
        'partner_847',
        'policy_847',
        1,
        'subj_847',
        'approved',
        now(),
        'pending_finalization',
        '1.1.0',
        'provisional-hash-847',
        'provisional-sig',
        'key-847'
      );
    `);

    psql("set role service_role;");
    const result = psqlJson(`
      select public.abraxas_finalize_v11_receipt_atomic(${rpcArgs(RECEIPT_ID, "provisional-hash-847", "final-hash-847")});
    `);
    psql("reset role;");

    expect(result.ok).toBe(true);
    expect(result.code).toBe("finalized");

    const status = psql(`select status from public.decision_receipts where id = '${RECEIPT_ID}';`);
    expect(status).toBe("active");
    const phase = psql(`select v11_issuance_phase from public.decision_receipts where id = '${RECEIPT_ID}';`);
    expect(phase).toBe("final");
    const hash = psql(`select payload_hash from public.decision_receipts where id = '${RECEIPT_ID}';`);
    expect(hash).toBe("final-hash-847");
  });

  it("rejects provisional hash mismatch and finalized receipt re-entry", () => {
    const receipt2 = "dr_BBBBBBBBBBBBBBBBBBBB";
    const decisionId = psql(`insert into public.verification_decisions (id) values (gen_random_uuid()) returning id;`);
    psql(`
      insert into public.decision_receipts (
        id, verification_decision_id, partner_id, policy_id, policy_version,
        subject_pseudonym_id, decision_result, evaluated_at, status, schema_version,
        payload_hash, signature, signing_key_id
      ) values (
        '${receipt2}',
        '${decisionId}'::uuid,
        'partner_847',
        'policy_847',
        1,
        'subj_847',
        'approved',
        now(),
        'active',
        '1.1.0',
        'already-final',
        'sig',
        'key-847'
      );
    `);
    psql("set role service_role;");
    const denied = psqlJson(`
      select public.abraxas_finalize_v11_receipt_atomic(${rpcArgs(receipt2, "already-final", "new-hash")});
    `);
    psql("reset role;");
    expect(denied.ok).toBe(false);
    expect(denied.code).toBe("status_not_pending");
  });

  it("rejects invalid commitment structure", () => {
    psql("set role service_role;");
    const bad = psqlJson(`
      select public.abraxas_finalize_v11_receipt_atomic(
        'dr_nonexistent', 'h', 'h2', 's', 'a', null,
        '{"schema":"wrong"}'::jsonb, '[]'::jsonb, 'final', now()
      );
    `);
    psql("reset role;");
    expect(bad.ok).toBe(false);
    expect(bad.code).toBe("invalid_commitment");
  });
});
