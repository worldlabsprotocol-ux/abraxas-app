import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEMO_MIGRATION_065_FILENAME,
  DEMO_REQUIRED_MIGRATION_ORDER,
} from "./demoMigrationManifest";
import {
  buildExpected065GrantLiterals,
  DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS,
  DEMO_SERVICE_ROLE_GRANT_TABLES,
  FORBIDDEN_SERVICE_ROLE_PRIVILEGES,
} from "./demoServiceRolePrivilegeExpectations";
import { auditMigrationFileTransactionCompatibility } from "./demoMigrationTransactionAudit";
import { hashMigrationContent } from "./demoMigrationLedger";
import { assertReadOnlyPolicyModules } from "./demoReadOnlyPolicy";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

/** Frozen hashes for ledgered migrations 1–17 — must not change when adding 065. */
const LEDGERED_MIGRATION_HASH_SNAPSHOT: Record<string, string> = {
  "006_abraxas_id.sql": "86bc47c00badaec1ae252b7b467f466b0466a6c66fce4cd551b9ebd31f55f168",
  "007_sui_zklogin.sql": "fadfda1c23421b0036326d3b0b0a110cdd1553b078fab74cc48c0b94cc204a7d",
  "020_identity_verification_state_machine.sql": "6fec4504a2f50fc58b3bdc1b55dd711937bad6eea7384064c90ea4636f395b53",
  "018_policy_verification.sql": "70acf5e5095c16feea7e93b74eac2170b21ae2ab5b1f4231a0ed469fabaa2dd8",
  "019_trust_registry_complete.sql": "437d23aae86f2daa43a3d4008b807b07a2721c50195a1822f7311d70c9ed22d6",
  "024_partner_api_keys.sql": "9427f9c159f03e113d5f07a39cbf4a1429db847888513bf9405364624d2e17ee",
  "025_partners_registry.sql": "cf552911aab48e93bd4baa8d0d4b66d4abbe9695a0b7be5de9187ce4e391f884",
  "032_reconcile_sandbox_and_cielo_operator_workflow.sql": "6fda21cdcdad2036aaa421f78750e5b49dfcd50f984c904b4cdf2304ab2af73e",
  "033_decision_receipts.sql": "f77c0f5c186f115c4b35c78ac07473448439819ce59eb76a7c449532566a24d3",
  "034_credential_status_registry.sql": "3cdced1920b684c6e7b8fa01a1aa088be58d23346739f1a5e679e14d7ddd86ef",
  "035_issuer_framework_trust_registry.sql": "939f61119ea7116395014444e548a3e02a40900bb3fb585f63c3c2c7c8b361e4",
  "036_connect_wallet_authority.sql": "4af81e1bc74f258d3104cae4f86e9860c31127ad3c6c24e20aaf98544480e274",
  "053_partner_flow_idempotency.sql": "e2552e6d15e88780fd706b993178f0854de8ac0e1e5d38f36fb0d654c8a5ffcd",
  "055_policy_immutable_versions.sql": "e0f23de8a7c65163f21cf72ef8e64b3b01d610bff4933bdfe03cbb780d9c9bc0",
  "056_publish_partner_policy_draft_rpc.sql": "04f1fdebed5e0339a85ad500a6d3c288820ee2ec347469de4703485c5f97eaa5",
  "058_partner_metering_foundation.sql": "542c91bf5695169712e6d56bcb501e284a9dd8d363dfc91c938ad8a726e521a2",
  "062_partner_webhook_outbox.sql": "7cc09dbc1d7de6c0037929b93bfc1d5444d74eb5adb672c25f521e9deab4cb70",
};

function readMigration(filename: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, filename), "utf8");
}

function extractSingleDoBlockBody(sql: string): string {
  const match = sql.match(/DO\s+\$\$([\s\S]*?)\$\$;/);
  expect(match, "expected exactly one DO $$ block").toBeTruthy();
  const allMatches = sql.match(/DO\s+\$\$/g) ?? [];
  expect(allMatches).toHaveLength(1);
  return match![1];
}

function extractIndentedGrantStatements(doBody: string): string[] {
  return doBody
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("GRANT "));
}

/** Models PostgreSQL DO-block atomicity: grants are visible only after full success. */
class DisposableDoBlockTransaction {
  readonly appliedGrants: string[] = [];
  private committed = false;

  stageGrant(grant: string): void {
    if (this.committed) {
      throw new Error("cannot stage grants after commit");
    }
    this.appliedGrants.push(grant);
  }

  commit(): void {
    this.committed = true;
  }

  rollback(): void {
    this.appliedGrants.length = 0;
    this.committed = false;
  }
}

function simulateAtomic065DoBlock(input: {
  grants: readonly string[];
  failAfterAssertions?: boolean;
  failAfterGrantIndex?: number;
}): DisposableDoBlockTransaction {
  const txn = new DisposableDoBlockTransaction();
  try {
    if (input.failAfterAssertions) {
      throw new Error("simulated assertion failure");
    }
    for (let index = 0; index < input.grants.length; index += 1) {
      if (input.failAfterGrantIndex === index) {
        throw new Error("simulated grant failure");
      }
      txn.stageGrant(input.grants[index]!);
    }
    txn.commit();
  } catch {
    txn.rollback();
  }
  return txn;
}

describe("065_service_role_runtime_grants migration", () => {
  const sql = readMigration(DEMO_MIGRATION_065_FILENAME);
  const doBody = extractSingleDoBlockBody(sql);
  const grantStatements = extractIndentedGrantStatements(doBody);
  const expectedGrants = buildExpected065GrantLiterals();

  it("is migration 18 and follows 062 in the required order", () => {
    expect(DEMO_REQUIRED_MIGRATION_ORDER).toHaveLength(18);
    expect(DEMO_REQUIRED_MIGRATION_ORDER.at(-1)).toBe(DEMO_MIGRATION_065_FILENAME);
    expect(DEMO_REQUIRED_MIGRATION_ORDER.at(-2)).toBe("062_partner_webhook_outbox.sql");
  });

  it("preserves hashes for the existing 17 ledgered manifest files", () => {
    const ledgered = DEMO_REQUIRED_MIGRATION_ORDER.slice(0, 17);
    expect(ledgered).toHaveLength(17);
    for (const file of ledgered) {
      const content = readMigration(file);
      expect(hashMigrationContent(content)).toBe(LEDGERED_MIGRATION_HASH_SNAPSHOT[file]);
    }
  });

  it("uses one fixed DO block with assertions textually before the first GRANT", () => {
    const roleAssertIndex = doBody.indexOf("pg_catalog.pg_roles");
    const tableAssertIndex = doBody.indexOf("to_regclass('public.identity_verifications')");
    const firstGrantIndex = doBody.indexOf("GRANT USAGE ON SCHEMA public");
    expect(roleAssertIndex).toBeGreaterThanOrEqual(0);
    expect(tableAssertIndex).toBeGreaterThan(roleAssertIndex);
    expect(firstGrantIndex).toBeGreaterThan(tableAssertIndex);
    const outsideDoBlock = sql.replace(/DO\s+\$\$[\s\S]*?\$\$;/, "");
    expect(outsideDoBlock).not.toMatch(/^\s*GRANT /m);
  });

  it("asserts every fixed runtime table with hardcoded to_regclass literals", () => {
    for (const table of DEMO_SERVICE_ROLE_GRANT_TABLES) {
      expect(doBody).toContain(`to_regclass('public.${table}')`);
    }
    expect(doBody).not.toContain("format(");
    expect(doBody).not.toMatch(/\bFOR\b[\s\S]*\bLOOP\b/i);
  });

  it("executes exactly the audited grant literals once each", () => {
    expect(grantStatements).toHaveLength(expectedGrants.length);
    expect(grantStatements).toEqual(expectedGrants);
    const privilegePairs = new Map<string, Set<string>>();
    for (const entry of DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS) {
      privilegePairs.set(entry.table, new Set(entry.privileges));
    }
    expect(privilegePairs.size).toBe(24);
    expect(
      DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS.reduce(
        (count, entry) => count + entry.privileges.length,
        0,
      ),
    ).toBe(62);
  });

  it("does not use dynamic SQL, concatenation, catalog-driven targets, or user input", () => {
    expect(doBody).not.toMatch(/\bEXECUTE\b/i);
    expect(doBody).not.toContain("format(");
    expect(doBody).not.toContain("||");
    expect(doBody).not.toMatch(/\bFROM\s+information_schema\b/i);
    expect(doBody).not.toMatch(/\bFROM\s+pg_catalog\.pg_tables\b/i);
    for (const grant of grantStatements) {
      const usageGrant = /^GRANT USAGE ON SCHEMA public TO service_role;$/;
      const tableGrant =
        /^GRANT (?:SELECT|INSERT|UPDATE)(?:, (?:SELECT|INSERT|UPDATE))* ON TABLE public\.\w+ TO service_role;$/;
      expect(usageGrant.test(grant) || tableGrant.test(grant)).toBe(true);
    }
  });

  it("does not grant DELETE, TRUNCATE, REFERENCES, TRIGGER, anon, authenticated, ALL TABLES, or default privileges", () => {
    const grantSql = grantStatements.join("\n").toUpperCase();
    for (const forbidden of FORBIDDEN_SERVICE_ROLE_PRIVILEGES) {
      expect(grantSql).not.toContain(forbidden);
    }
    expect(grantSql).not.toContain("ON ALL TABLES");
    expect(grantSql).not.toContain("ALTER DEFAULT PRIVILEGES");
    expect(grantSql).not.toMatch(/\bTO\s+ANON\b/);
    expect(grantSql).not.toMatch(/\bTO\s+AUTHENTICATED\b/);
    expect(grantSql).not.toContain("REVOKE");
    expect(grantSql).not.toContain("GRANT ALL");
  });

  it("keeps GRANT USAGE ON SCHEMA public idempotently and does not revoke existing privileges", () => {
    expect(grantStatements[0]).toBe("GRANT USAGE ON SCHEMA public TO service_role;");
    expect(doBody.toUpperCase()).not.toContain("REVOKE");
  });

  it("rolls back all staged grants when assertion or grant execution fails", () => {
    const afterAssertionFailure = simulateAtomic065DoBlock({
      grants: expectedGrants,
      failAfterAssertions: true,
    });
    expect(afterAssertionFailure.appliedGrants).toEqual([]);

    for (let index = 0; index < expectedGrants.length; index += 1) {
      const afterGrantFailure = simulateAtomic065DoBlock({
        grants: expectedGrants,
        failAfterGrantIndex: index,
      });
      expect(afterGrantFailure.appliedGrants).toEqual([]);
    }
  });

  it("commits all grants only after the full DO block succeeds", () => {
    const success = simulateAtomic065DoBlock({ grants: expectedGrants });
    expect(success.appliedGrants).toEqual([...expectedGrants]);
  });

  it("remains safe for the guarded demo runner as atomic_wrapper without top-level BEGIN/COMMIT", () => {
    const audit = auditMigrationFileTransactionCompatibility(DEMO_MIGRATION_065_FILENAME, sql);
    expect(audit.mode).toBe("atomic_wrapper");
    expect(audit.hazards).toEqual([]);
    expect(sql).not.toMatch(/^\s*BEGIN\s*;/m);
    expect(sql).not.toMatch(/^\s*COMMIT\s*;/m);
    expect(sql).toContain("independent of the guarded demo migration runner");
  });

  it("documents why automatic table grants remain disabled", () => {
    expect(sql).toContain("Automatically expose new tables");
    expect(sql).toMatch(/does NOT:[\s\S]*ALTER DEFAULT PRIVILEGES/i);
    expect(sql).toContain("ocntwbxarpjeixdnzide");
    expect(sql).toContain("does not auto-apply on Vercel deployment");
  });
});

describe("read-only policy after 065 integration", () => {
  it("passes the static scanner for demo validator modules", () => {
    expect(() => assertReadOnlyPolicyModules()).not.toThrow();
  });
});
