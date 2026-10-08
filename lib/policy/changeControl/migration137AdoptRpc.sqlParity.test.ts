import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const PG_URL = process.env.MIGRATION_137_PG_URL?.trim() || undefined;
const PARTNER = "partner-m137-adopt-rpc";
const POLICY = "policy-m137-adopt-rpc";
const APP_ID = "11111111-1111-4111-8111-111111113137";

function psql(sql: string): string {
  if (!PG_URL) throw new Error("MIGRATION_137_PG_URL is required");
  return execFileSync("psql", [PG_URL, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql], {
    encoding: "utf8",
  }).trim();
}

function adoptRpc(input: {
  applicationId?: string;
  partnerId?: string;
  policyId?: string;
  fromVersion?: number;
  toVersion?: number;
  actorId?: string | null;
}): { ok: boolean; code: string } {
  const applicationId = input.applicationId ?? APP_ID;
  const partnerId = input.partnerId ?? PARTNER;
  const policyId = input.policyId ?? POLICY;
  const fromVersion = input.fromVersion ?? 1;
  const toVersion = input.toVersion ?? 2;
  const actorId =
    input.actorId === undefined || input.actorId === null
      ? "NULL"
      : `'${input.actorId.replace(/'/g, "''")}'`;

  const raw = psql(`
    SELECT public.partner_policy_adopt_version_atomic(
      '${applicationId}'::uuid,
      '${partnerId}',
      '${policyId}',
      ${fromVersion},
      ${toVersion},
      ${actorId}
    )::text;
  `);
  const parsed = JSON.parse(raw) as { ok?: boolean; code?: string };
  return { ok: parsed.ok === true, code: parsed.code ?? "unknown" };
}

function resetFixture(pinVersion = 1): void {
  psql(`
    ALTER TABLE public.partner_policy_lifecycle_audit
      DISABLE TRIGGER trg_partner_policy_lifecycle_audit_append_only;
    ALTER TABLE public.partner_policy_adoptions
      DISABLE TRIGGER trg_partner_policy_adoptions_append_only;

    DELETE FROM public.partner_policy_lifecycle_audit
     WHERE application_id = '${APP_ID}'::uuid;
    DELETE FROM public.partner_policy_adoptions
     WHERE application_id = '${APP_ID}'::uuid;
    DELETE FROM public.partner_launchpad_application_policies
     WHERE application_id = '${APP_ID}'::uuid;
    DELETE FROM public.partner_launchpad_applications
     WHERE id = '${APP_ID}'::uuid;

    INSERT INTO public.partner_launchpad_applications (
      id,
      public_slug,
      partner_id,
      application_name,
      display_name,
      environment,
      policy_id,
      policy_version,
      policy_template_id,
      status
    ) VALUES (
      '${APP_ID}'::uuid,
      'm137-adopt-rpc-test',
      '${PARTNER}',
      'M137 Adopt RPC Test App',
      'M137 Adopt RPC Test',
      'sandbox',
      '${POLICY}',
      ${pinVersion},
      'template-test',
      'active'
    )
    ON CONFLICT (id) DO UPDATE
      SET policy_version = EXCLUDED.policy_version,
          updated_at = now();

    ALTER TABLE public.partner_policy_lifecycle_audit
      ENABLE TRIGGER trg_partner_policy_lifecycle_audit_append_only;
    ALTER TABLE public.partner_policy_adoptions
      ENABLE TRIGGER trg_partner_policy_adoptions_append_only;
  `);
}

describe("migration 137 adopt RPC SQL parity (requires MIGRATION_137_PG_URL)", () => {
  if (!PG_URL) {
    it.skip("requires MIGRATION_137_PG_URL (database parity runs via scripts/ci/run-migration-137-sql-parity.sh)", () => {});
    return;
  }

  it("restricts EXECUTE to service_role only", () => {
    const grants = psql(`
      SELECT grantee || ':' || privilege_type
        FROM information_schema.routine_privileges
       WHERE routine_schema = 'public'
         AND routine_name = 'partner_policy_adopt_version_atomic'
       ORDER BY grantee;
    `);
    expect(grants).toContain("service_role:EXECUTE");
    expect(grants).not.toMatch(/anon:EXECUTE/);
    expect(grants).not.toMatch(/authenticated:EXECUTE/);
    expect(grants).not.toMatch(/PUBLIC:EXECUTE/);
  });

  it("uses pg_catalog, public search_path in SECURITY DEFINER body", () => {
    const def = psql(`
      SELECT pg_catalog.pg_get_functiondef(p.oid)
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.proname = 'partner_policy_adopt_version_atomic';
    `);
    expect(def).toMatch(/set search_path (?:=|to) ['"]?pg_catalog['"]?, ['"]?public['"]?/i);
    expect(def).toContain("SECURITY DEFINER");
    expect(def).toContain("partner_policies");
    expect(def).toContain("adoption_audit_incomplete");
  });

  it("adopts atomically and records adoption + audit with application partner as actor", () => {
    resetFixture(1);

    const result = adoptRpc({ fromVersion: 1, toVersion: 2, actorId: null });
    expect(result).toEqual({ ok: true, code: "adopted" });

    expect(psql(`
      SELECT policy_version::text
        FROM public.partner_launchpad_applications
       WHERE id = '${APP_ID}'::uuid;
    `)).toBe("2");

    expect(psql(`
      SELECT actor_id
        FROM public.partner_policy_adoptions
       WHERE application_id = '${APP_ID}'::uuid
         AND to_version = 2;
    `)).toBe(PARTNER);

    expect(psql(`
      SELECT actor_id
        FROM public.partner_policy_lifecycle_audit
       WHERE application_id = '${APP_ID}'::uuid
         AND event_type = 'adopted'
         AND to_version = 2;
    `)).toBe(PARTNER);
  });

  it("rejects caller-supplied partner or policy identifiers that do not match the application", () => {
    resetFixture(1);

    expect(adoptRpc({ partnerId: "wrong-partner" })).toEqual({ ok: false, code: "not_found" });
    expect(adoptRpc({ policyId: "wrong-policy" })).toEqual({ ok: false, code: "not_found" });
    expect(adoptRpc({ actorId: "wrong-actor" })).toEqual({ ok: false, code: "invalid_input" });
  });

  it("rejects draft target versions and mismatched from_version pins", () => {
    resetFixture(1);

    expect(adoptRpc({ fromVersion: 1, toVersion: 3 })).toEqual({ ok: false, code: "policy_version_draft" });
    expect(adoptRpc({ fromVersion: 99, toVersion: 2 })).toEqual({ ok: false, code: "policy_version_mismatched" });
  });

  it("allows idempotent replay only when adoption and audit rows exist", () => {
    resetFixture(1);
    expect(adoptRpc({ fromVersion: 1, toVersion: 2, actorId: null })).toEqual({ ok: true, code: "adopted" });
    expect(adoptRpc({ fromVersion: 1, toVersion: 2, actorId: null })).toEqual({
      ok: true,
      code: "idempotent_replay",
    });

    psql(`
      ALTER TABLE public.partner_policy_lifecycle_audit
        DISABLE TRIGGER trg_partner_policy_lifecycle_audit_append_only;
      DELETE FROM public.partner_policy_lifecycle_audit
       WHERE application_id = '${APP_ID}'::uuid
         AND to_version = 2;
      ALTER TABLE public.partner_policy_lifecycle_audit
        ENABLE TRIGGER trg_partner_policy_lifecycle_audit_append_only;
    `);

    expect(adoptRpc({ fromVersion: 1, toVersion: 2 })).toEqual({
      ok: false,
      code: "adoption_audit_incomplete",
    });
  });

  it("denies anon EXECUTE on the privileged RPC", () => {
    resetFixture(1);
    expect(() =>
      psql(`
        SET LOCAL ROLE anon;
        SELECT public.partner_policy_adopt_version_atomic(
          '${APP_ID}'::uuid,
          '${PARTNER}',
          '${POLICY}',
          1,
          2,
          NULL
        );
      `),
    ).toThrow(/permission denied|42501/i);
  });
});
