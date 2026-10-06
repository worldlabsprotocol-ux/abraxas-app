import { execFileSync, spawn } from "node:child_process";
import { describe, expect, it } from "vitest";

const PG_URL = process.env.MIGRATION_133_PG_URL?.trim() || undefined;
const OPAQUE = "vr_migration1330000001";
const EXPIRES = "2099-06-01T00:00:00.000Z";
const CREATED = "2026-10-06T00:00:00.000Z";

function psql(sql: string): string {
  if (!PG_URL) throw new Error("MIGRATION_133_PG_URL is required");
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
        'partner-m133',
        'policy-m133-v1',
        1,
        'https://example.com/callback',
        '${EXPIRES}'::timestamptz,
        '${CREATED}'::timestamptz,
        NULL,
        NULL,
        'Confirm wallet control',
        'ref-m133-proof'
      );
  `;
}

function parseEnsureLine(line: string): { wasCreated: boolean; jti: string } {
  const [wasCreated, jti] = line.split("|");
  return {
    wasCreated: wasCreated === "t" || wasCreated === "true",
    jti: jti ?? "",
  };
}

function runEnsureParallel(jti: string): Promise<string> {
  if (!PG_URL) return Promise.reject(new Error("MIGRATION_133_PG_URL is required"));
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

describe("migration 133 SQL parity (requires MIGRATION_133_PG_URL)", () => {
  if (!PG_URL) {
    it.skip("requires MIGRATION_133_PG_URL (database parity runs via scripts/ci/run-migration-133-sql-parity.sh)", () => {});
    return;
  }

  it("sequential call 1 creates and call 2 reuses the same canonical jti", () => {
    psql(`DELETE FROM public.partner_flow_continuations WHERE opaque_verify_request = '${OPAQUE}';`);

    const first = parseEnsureLine(psql(ensureSql("jti-winner-m133")));
    const second = parseEnsureLine(psql(ensureSql("jti-loser-m133")));

    expect(first.wasCreated).toBe(true);
    expect(second.wasCreated).toBe(false);
    expect(first.jti).toBe("jti-winner-m133");
    expect(second.jti).toBe("jti-winner-m133");
    expect(psql(`
      SELECT count(*)::text
        FROM public.partner_flow_continuations
       WHERE opaque_verify_request = '${OPAQUE}';
    `)).toBe("1");
    expect(psql(`
      SELECT jti FROM public.partner_flow_continuations
       WHERE opaque_verify_request = '${OPAQUE}';
    `)).toBe("jti-winner-m133");
  });

  it("concurrent callers converge on one row with one creator and one reuser", async () => {
    psql(`DELETE FROM public.partner_flow_continuations WHERE opaque_verify_request = '${OPAQUE}';`);

    const [lineA, lineB] = await Promise.all([
      runEnsureParallel("jti-race-a-m133"),
      runEnsureParallel("jti-race-b-m133"),
    ]);

    const parsed = [lineA, lineB].map(parseEnsureLine);
    expect(parsed.every((row) => row.jti.length > 0)).toBe(true);
    expect(parsed[0]?.jti).toBe(parsed[1]?.jti);
    expect(parsed.filter((row) => row.wasCreated)).toHaveLength(1);
    expect(parsed.filter((row) => !row.wasCreated)).toHaveLength(1);
    expect(psql(`
      SELECT count(*)::text
        FROM public.partner_flow_continuations
       WHERE opaque_verify_request = '${OPAQUE}';
    `)).toBe("1");
  });

  it("does not expose EXECUTE to anon or authenticated after migration 133", () => {
    const grants = psql(`
      SELECT grantee || ':' || privilege_type
        FROM information_schema.routine_privileges
       WHERE routine_schema = 'public'
         AND routine_name = 'ensure_partner_flow_continuation_by_opaque'
       ORDER BY grantee;
    `);
    expect(grants).toContain("service_role:EXECUTE");
    expect(grants).not.toContain("anon:EXECUTE");
    expect(grants).not.toContain("authenticated:EXECUTE");
  });
});
