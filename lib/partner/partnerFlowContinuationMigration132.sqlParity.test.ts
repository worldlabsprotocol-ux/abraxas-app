import { execFileSync, spawn } from "node:child_process";
import { describe, expect, it } from "vitest";

const PG_URL = process.env.MIGRATION_132_PG_URL?.trim() || undefined;
const OPAQUE = "vr_concurrency13200001";
const EXPIRES = "2099-01-01T00:00:00.000Z";
const CREATED = "2026-10-05T00:00:00.000Z";

function psql(sql: string): string {
  if (!PG_URL) throw new Error("MIGRATION_132_PG_URL is required");
  return execFileSync("psql", [PG_URL, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql], {
    encoding: "utf8",
  }).trim();
}

function ensureSql(jti: string): string {
  return `
    SELECT was_created::text || '|' || jti
      FROM public.ensure_partner_flow_continuation_by_opaque(
        '${OPAQUE}',
        '${jti}',
        'partner-concurrency',
        'policy-concurrency-v1',
        1,
        'https://example.com/callback',
        '${EXPIRES}'::timestamptz,
        '${CREATED}'::timestamptz
      );
  `;
}

function runEnsureParallel(jti: string): Promise<string> {
  if (!PG_URL) return Promise.reject(new Error("MIGRATION_132_PG_URL is required"));
  return new Promise((resolve, reject) => {
    const child = spawn("psql", [PG_URL, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", ensureSql(jti)], {
      encoding: "utf8",
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr || `psql exited ${code}`));
    });
  });
}

function parseEnsureLine(line: string): { wasCreated: boolean; jti: string } {
  const [wasCreated, jti] = line.split("|");
  return { wasCreated: wasCreated === "t", jti: jti ?? "" };
}

describe("migration 132 SQL parity (requires MIGRATION_132_PG_URL)", () => {
  if (!PG_URL) {
    it.skip("requires MIGRATION_132_PG_URL (database parity runs via scripts/ci/run-migration-132-sql-parity.sh)", () => {});
    return;
  }

  it("returns separate INSERT and SELECT commands in function body (not single-statement CTE fallback)", () => {
    const body = psql(`
      SELECT pg_catalog.regexp_replace(
        pg_catalog.pg_get_functiondef(p.oid),
        E'[\\n\\r]+',
        ' ',
        'g'
      )
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.proname = 'ensure_partner_flow_continuation_by_opaque';
    `);
    expect(body).toContain("INSERT INTO public.partner_flow_continuations");
    expect(body).toContain("SELECT * INTO v_row");
    expect(body).toContain("FROM public.partner_flow_continuations c");
    expect(body).not.toMatch(/WITH inserted AS/i);
    expect(body).not.toContain("UNION ALL");
  });

  it("concurrent ensure callers converge on one row and both receive the canonical jti", async () => {
    psql(`DELETE FROM public.partner_flow_continuations WHERE opaque_verify_request = '${OPAQUE}';`);

    const [lineA, lineB] = await Promise.all([
      runEnsureParallel("jti-race-a"),
      runEnsureParallel("jti-race-b"),
    ]);

    const parsed = [lineA, lineB].map(parseEnsureLine);
    expect(parsed.every((row) => row.jti.length > 0)).toBe(true);
    expect(parsed[0]?.jti).toBe(parsed[1]?.jti);
    expect(psql(`
      SELECT count(*)::text
        FROM public.partner_flow_continuations
       WHERE opaque_verify_request = '${OPAQUE}';
    `)).toBe("1");
  });

  it("conflict loser receives existing row on sequential second call", () => {
    psql(`DELETE FROM public.partner_flow_continuations WHERE opaque_verify_request = '${OPAQUE}';`);

    const first = parseEnsureLine(psql(ensureSql("jti-winner-132")));
    const second = parseEnsureLine(psql(ensureSql("jti-loser-132")));

    expect(first.wasCreated).toBe(true);
    expect(second.wasCreated).toBe(false);
    expect(first.jti).toBe("jti-winner-132");
    expect(second.jti).toBe("jti-winner-132");
    expect(psql(`
      SELECT count(*)::text
        FROM public.partner_flow_continuations
       WHERE opaque_verify_request = '${OPAQUE}';
    `)).toBe("1");
  });
});
