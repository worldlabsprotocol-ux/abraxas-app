// FILE: lib/verification/auditEventHash.sqlParity.test.ts

// @ts-expect-error pg has no bundled TypeScript declarations in this repo
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { computeLifecycleAuditEventHash } from "@/lib/verification/auditEventHash";
import { LIFECYCLE_AUDIT_HASH_GOLDEN_VECTORS } from "@/lib/verification/auditEventHash.test";
import { mapOperatorCategoryToAccessMethod } from "@/lib/admin/designPartnerApplicationLifecycleAuditMetadata";

const PG_URL = process.env.AUDIT_HASH_PG_URL?.trim() || undefined;
const FIXTURE_EMAIL = "applicant@example.invalid";

const ENTRY_FUNCTIONS = [
  { name: "design_partner_promote_atomic", args: "p_application_id uuid, p_partner_id text, p_key_prefix text, p_key_hash text" },
  { name: "design_partner_promote_atomic_v2", args: "p_application_id uuid, p_partner_id text, p_key_prefix text, p_key_hash text, p_actor_category text" },
  { name: "design_partner_review_transition_atomic", args: "p_application_id uuid, p_target_status text, p_actor_category text, p_reviewer_notes text, p_reviewer_notes_present boolean" },
  { name: "design_partner_lifecycle_audit_list", args: "p_application_id uuid, p_limit integer" },
  {
    name: "design_partner_lifecycle_audit_list_v2",
    args: "p_application_id uuid, p_limit integer, p_cursor_occurred_at timestamp with time zone, p_cursor_id uuid",
  },
] as const;

const INTERNAL_FUNCTIONS = [
  "_design_partner_promote_impl",
  "_insert_lifecycle_audit_event",
  "_compute_lifecycle_audit_event_hash",
  "_format_iso8601_utc_ms",
  "_serialize_lifecycle_audit_hash_payload",
  "_lifecycle_audit_access_method",
] as const;

const KEY_PREFIX = "abx_test_abcdefg";
const KEY_HASH = "a".repeat(64);

const LIST_V2_IDENTITY_ARGS =
  "p_application_id uuid, p_limit integer, p_cursor_occurred_at timestamp with time zone, p_cursor_id uuid";
const LIST_V1_IDENTITY_ARGS = "p_application_id uuid, p_limit integer";
const LIFECYCLE_AUDIT_EVENT_KEYS = [
  "event_type",
  "application_id",
  "from_status",
  "to_status",
  "promoted_partner_id",
  "occurred_at",
  "operator_category",
] as const;

interface LifecycleAuditListV2Envelope {
  events: Array<Record<string, unknown>>;
  next_cursor: { occurred_at: string; id: string } | null;
}

const INTERNAL_FUNCTION_ARGS: Record<string, string> = {
  _design_partner_promote_impl: "p_application_id uuid, p_partner_id text, p_key_prefix text, p_key_hash text, p_actor_category text",
  _insert_lifecycle_audit_event: "p_actor_category text, p_action text, p_application_id uuid, p_from_status text, p_to_status text, p_promoted_partner_id text, p_include_promoted_partner_id boolean",
  _compute_lifecycle_audit_event_hash: "p_actor_category text, p_action text, p_application_id text, p_from_status text, p_to_status text, p_admin_access_method text, p_promoted_partner_id text, p_include_promoted_partner_id boolean, p_ts text",
  _format_iso8601_utc_ms: "p_ts timestamp with time zone",
  _serialize_lifecycle_audit_hash_payload: "p_actor_category text, p_action text, p_application_id text, p_from_status text, p_to_status text, p_admin_access_method text, p_promoted_partner_id text, p_include_promoted_partner_id boolean, p_ts text",
  _lifecycle_audit_access_method: "p_actor_category text",
};

async function sqlHash(client: Client, vector: (typeof LIFECYCLE_AUDIT_HASH_GOLDEN_VECTORS)[number]): Promise<string> {
  const includePromoted = vector.input.action === "admin.design_partner.promoted";
  const { rows } = await client.query<{ hash: string }>(
    `SELECT public._compute_lifecycle_audit_event_hash(
      $1, $2, $3, $4, $5, $6, $7, $8, $9
    ) AS hash`,
    [
      vector.input.actorCategory,
      vector.input.action,
      vector.input.applicationId.toLowerCase(),
      vector.input.fromStatus,
      vector.input.toStatus,
      mapOperatorCategoryToAccessMethod(vector.input.actorCategory),
      includePromoted ? vector.input.promotedPartnerId ?? null : null,
      includePromoted,
      vector.input.ts,
    ],
  );
  return rows[0]?.hash ?? "";
}

async function hasExecutePrivilege(
  client: Client,
  role: string,
  fnName: string,
  fnArgs: string,
): Promise<boolean> {
  const { rows } = await client.query<{ allowed: boolean }>(
    `
      SELECT has_function_privilege($1, p.oid, 'EXECUTE') AS allowed
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.proname = $2
         AND pg_get_function_identity_arguments(p.oid) = $3
       LIMIT 1
    `,
    [role, fnName, fnArgs],
  );
  return Boolean(rows[0]?.allowed);
}

async function isSecurityDefiner(
  client: Client,
  fnName: string,
  fnArgs: string,
): Promise<boolean> {
  const { rows } = await client.query<{ prosecdef: boolean }>(
    `
      SELECT p.prosecdef
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.proname = $1
         AND pg_get_function_identity_arguments(p.oid) = $2
       LIMIT 1
    `,
    [fnName, fnArgs],
  );
  return Boolean(rows[0]?.prosecdef);
}

async function publicAclGrantsExecute(
  client: Client,
  fnName: string,
  fnArgs: string,
): Promise<boolean> {
  const { rows } = await client.query<{ grants_execute: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS acl
          JOIN pg_roles r ON r.oid = acl.grantee
         WHERE n.nspname = 'public'
           AND p.proname = $1
           AND pg_get_function_identity_arguments(p.oid) = $2
           AND r.rolname = 'PUBLIC'
           AND acl.privilege_type = 'EXECUTE'
      ) AS grants_execute
    `,
    [fnName, fnArgs],
  );
  return Boolean(rows[0]?.grants_execute);
}

async function tableGrants(
  client: Client,
  grantee: string,
): Promise<string[]> {
  const { rows } = await client.query<{ privilege_type: string }>(
    `SELECT privilege_type
       FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name = 'audit_events'
        AND grantee = $1
      ORDER BY privilege_type`,
    [grantee],
  );
  return rows.map((row: { privilege_type: string }) => row.privilege_type);
}

async function hasTablePrivilege(
  client: Client,
  role: string,
  privilege: string,
): Promise<boolean> {
  const { rows } = await client.query<{ allowed: boolean }>(
    `SELECT has_table_privilege($1, 'public.audit_events', $2) AS allowed`,
    [role, privilege],
  );
  return Boolean(rows[0]?.allowed);
}

async function publicTableAclGrantsPrivilege(
  client: Client,
  privilege: string,
): Promise<boolean> {
  const { rows } = await client.query<{ grants_privilege: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS acl
         WHERE n.nspname = 'public'
           AND c.relname = 'audit_events'
           AND acl.grantee = 0
           AND acl.privilege_type = $1
      ) AS grants_privilege
    `,
    [privilege],
  );
  return Boolean(rows[0]?.grants_privilege);
}

async function auditCount(client: Client): Promise<number> {
  const { rows } = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM public.audit_events`,
  );
  return Number(rows[0]?.count ?? 0);
}

async function auditCountForAction(
  client: Client,
  action: string,
  objectId: string,
): Promise<number> {
  const { rows } = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM public.audit_events
      WHERE action = $1
        AND object_id = $2`,
    [action, objectId.toLowerCase()],
  );
  return Number(rows[0]?.count ?? 0);
}

async function insertApplication(
  client: Client,
  input: {
    id: string;
    status: string;
    reviewerNotes?: string | null;
    company?: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO public.design_partners (
       id, company, email, status, public_name_ok, reviewer_notes
     ) VALUES ($1, $2, $3, $4, false, $5)`,
    [
      input.id,
      input.company ?? "Fixture Co",
      FIXTURE_EMAIL,
      input.status,
      input.reviewerNotes ?? null,
    ],
  );
}

async function getApplication(
  client: Client,
  appId: string,
): Promise<{ status: string; reviewer_notes: string | null; promoted_partner_id: string | null }> {
  const { rows } = await client.query<{
    status: string;
    reviewer_notes: string | null;
    promoted_partner_id: string | null;
  }>(
    `SELECT status, reviewer_notes, promoted_partner_id
       FROM public.design_partners
      WHERE id = $1`,
    [appId],
  );
  return rows[0] ?? { status: "", reviewer_notes: null, promoted_partner_id: null };
}

async function transition(
  client: Client,
  appId: string,
  targetStatus: "approved" | "rejected",
  actorCategory: string,
  reviewerNotes: string | null,
  reviewerNotesPresent: boolean,
): Promise<{ code: string; reviewer_notes?: string | null }> {
  const { rows } = await client.query<{ result: { code: string; application?: { reviewer_notes: string | null } } }>(
    `SELECT public.design_partner_review_transition_atomic(
       $1::uuid, $2, $3, $4, $5
     ) AS result`,
    [appId, targetStatus, actorCategory, reviewerNotes, reviewerNotesPresent],
  );
  return {
    code: rows[0]?.result.code ?? "",
    reviewer_notes: rows[0]?.result.application?.reviewer_notes,
  };
}

async function promote(
  client: Client,
  appId: string,
  partnerId: string,
  keyPrefix = KEY_PREFIX,
  keyHash = KEY_HASH,
): Promise<{ ok: boolean; code: string }> {
  const { rows } = await client.query<{ result: { ok: boolean; code: string } }>(
    `SELECT public.design_partner_promote_atomic($1::uuid, $2, $3, $4) AS result`,
    [appId, partnerId, keyPrefix, keyHash],
  );
  return rows[0]?.result ?? { ok: false, code: "missing" };
}

async function listLifecycleAuditV2(
  client: Client,
  applicationId: string | null,
  limit?: number | null,
  cursor?: { occurred_at: string; id: string } | null,
): Promise<LifecycleAuditListV2Envelope> {
  const { rows } = await client.query<{ result: LifecycleAuditListV2Envelope }>(
    `SELECT public.design_partner_lifecycle_audit_list_v2(
       $1::uuid,
       $2::integer,
       $3::timestamptz,
       $4::uuid
     ) AS result`,
    [
      applicationId,
      limit ?? null,
      cursor?.occurred_at ?? null,
      cursor?.id ?? null,
    ],
  );
  return rows[0]?.result ?? { events: [], next_cursor: null };
}

async function getFunctionOwner(
  client: Client,
  fnName: string,
  identityArgs: string,
): Promise<string> {
  const { rows } = await client.query<{ owner: string }>(
    `SELECT pg_get_userbyid(p.proowner) AS owner
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = $1
        AND pg_get_function_identity_arguments(p.oid) = $2`,
    [fnName, identityArgs],
  );
  return rows[0]?.owner ?? "";
}

async function getFunctionProconfig(
  client: Client,
  fnName: string,
  identityArgs: string,
): Promise<string[]> {
  const { rows } = await client.query<{ proconfig: string[] | null }>(
    `SELECT p.proconfig
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = $1
        AND pg_get_function_identity_arguments(p.oid) = $2`,
    [fnName, identityArgs],
  );
  return rows[0]?.proconfig ?? [];
}

async function insertRawLifecycleAuditRow(
  client: Client,
  input: {
    id: string;
    objectId: string;
    action: "admin.design_partner.approved" | "admin.design_partner.rejected" | "admin.design_partner.promoted";
    fromStatus?: string;
    toStatus?: string;
    accessMethod?: string;
    actorId?: string | null;
    promotedPartnerId?: string | null;
    createdAt: string;
    invalid?: boolean;
  },
): Promise<void> {
  const metadata = input.invalid
    ? {
        from_status: "invalid-status",
        to_status: "approved",
        admin_access_method: "email",
      }
    : {
        from_status: input.fromStatus ?? "submitted",
        to_status: input.toStatus ?? "approved",
        admin_access_method: input.accessMethod ?? "email",
        ...(input.action === "admin.design_partner.promoted" && input.promotedPartnerId
          ? { promoted_partner_id: input.promotedPartnerId }
          : {}),
      };

  await client.query(
    `INSERT INTO public.audit_events (
       id, actor_type, actor_id, action, object_type, object_id, metadata, event_hash, created_at
     ) VALUES (
       $1::uuid,
       'admin_operator',
       $2,
       $3,
       'design_partner_application',
       $4,
       $5::jsonb,
       'parity-fixture-hash',
       $6::timestamptz
     )`,
    [
      input.id,
      input.actorId ?? "admin_authorized_email",
      input.action,
      input.objectId.toLowerCase(),
      JSON.stringify(metadata),
      input.createdAt,
    ],
  );
}

function assertLifecycleAuditListV2Envelope(envelope: LifecycleAuditListV2Envelope): void {
  expect(Object.keys(envelope).sort()).toEqual(["events", "next_cursor"]);
  expect(Array.isArray(envelope.events)).toBe(true);
  if (envelope.next_cursor !== null) {
    expect(Object.keys(envelope.next_cursor).sort()).toEqual(["id", "occurred_at"]);
  }
  for (const event of envelope.events) {
    expect(Object.keys(event).sort()).toEqual([...LIFECYCLE_AUDIT_EVENT_KEYS].sort());
    expect(event).not.toHaveProperty("id");
    expect(event).not.toHaveProperty("metadata");
    expect(event).not.toHaveProperty("event_hash");
    expect(event).not.toHaveProperty("actor_type");
    expect(event).not.toHaveProperty("admin_access_method");
    expect(JSON.stringify(event)).not.toMatch(/@|api[_-]?key|Bearer|eyJ[a-zA-Z0-9_-]+\./i);
  }
}

describe("auditEventHash SQL parity", () => {
  if (!PG_URL) {
    it.skip("requires AUDIT_HASH_PG_URL (database parity runs via scripts/ci/run-audit-hash-sql-parity.sh)", () => {});
    return;
  }

  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: PG_URL });
    await client.connect();
  });

  afterAll(async () => {
    await client?.end();
  });

  it("matches Supabase Production pgcrypto layout and applies migration 072", async () => {
    const { rows: extRows } = await client.query<{ schema_name: string }>(
      `SELECT n.nspname AS schema_name
         FROM pg_extension e
         JOIN pg_namespace n ON n.oid = e.extnamespace
        WHERE e.extname = 'pgcrypto'`,
    );
    expect(extRows).toHaveLength(1);
    expect(extRows[0]?.schema_name).toBe("extensions");

    const { rows: extensionsDigestRows } = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'extensions'
          AND p.proname = 'digest'`,
    );
    expect(Number(extensionsDigestRows[0]?.count ?? 0)).toBeGreaterThanOrEqual(2);

    const { rows: publicDigestRows } = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname = 'digest'
       ) AS exists`,
    );
    expect(publicDigestRows[0]?.exists).toBe(false);

    const { rows: migrationRows } = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname = '_compute_lifecycle_audit_event_hash'
       ) AS exists`,
    );
    expect(migrationRows[0]?.exists).toBe(true);
  });

  it("matches TypeScript hash for every golden vector", async () => {
    for (const vector of LIFECYCLE_AUDIT_HASH_GOLDEN_VECTORS) {
      const tsHash = computeLifecycleAuditEventHash(vector.input);
      const dbHash = await sqlHash(client, vector);
      expect(dbHash).toBe(tsHash);
      expect(dbHash).toBe(vector.expectedHash);
    }
  });

  it("exposes expected function signatures", async () => {
    for (const fn of ENTRY_FUNCTIONS) {
      const { rows } = await client.query<{ args: string }>(
        `SELECT pg_get_function_identity_arguments(p.oid) AS args
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname = $1`,
        [fn.name],
      );
      expect(rows.some((row: { args: string }) => row.args === fn.args)).toBe(true);
    }

    const { rows: promoteRows } = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'design_partner_promote_atomic'`,
    );
    expect(Number(promoteRows[0]?.count ?? 0)).toBe(1);
  });

  it("keeps internal helpers SECURITY INVOKER and entry RPCs SECURITY DEFINER", async () => {
    for (const fn of ENTRY_FUNCTIONS) {
      expect(await isSecurityDefiner(client, fn.name, fn.args)).toBe(true);
    }
    for (const fn of INTERNAL_FUNCTIONS) {
      expect(
        await isSecurityDefiner(client, fn, INTERNAL_FUNCTION_ARGS[fn] ?? ""),
      ).toBe(false);
    }
  });

  it("grants service_role execute only on entry RPCs", async () => {
    for (const fn of ENTRY_FUNCTIONS) {
      expect(await hasExecutePrivilege(client, "service_role", fn.name, fn.args)).toBe(true);
    }
    for (const fn of INTERNAL_FUNCTIONS) {
      expect(
        await hasExecutePrivilege(client, "service_role", fn, INTERNAL_FUNCTION_ARGS[fn] ?? ""),
      ).toBe(false);
    }
  });

  it("denies anon and authenticated execute on entry RPCs", async () => {
    for (const fn of ENTRY_FUNCTIONS) {
      expect(await hasExecutePrivilege(client, "anon", fn.name, fn.args)).toBe(false);
      expect(await hasExecutePrivilege(client, "authenticated", fn.name, fn.args)).toBe(false);
    }
  });

  it("does not grant PUBLIC execute via proacl", async () => {
    for (const fn of ENTRY_FUNCTIONS) {
      expect(await publicAclGrantsExecute(client, fn.name, fn.args)).toBe(false);
    }
    for (const internal of INTERNAL_FUNCTIONS) {
      expect(await publicAclGrantsExecute(client, internal, INTERNAL_FUNCTION_ARGS[internal] ?? "")).toBe(false);
    }
  });

  it("denies unprivileged role execute on internal helpers", async () => {
    for (const fn of INTERNAL_FUNCTIONS) {
      expect(
        await hasExecutePrivilege(client, "parity_unprivileged", fn, INTERNAL_FUNCTION_ARGS[fn] ?? ""),
      ).toBe(false);
    }
  });

  it("hardens audit_events table ACLs via migration 073", async () => {
    for (const grantee of ["PUBLIC", "anon", "authenticated"] as const) {
      expect(await tableGrants(client, grantee)).toEqual([]);
    }

    expect(await tableGrants(client, "service_role")).toEqual(["INSERT", "SELECT"]);

    for (const privilege of ["INSERT", "SELECT"] as const) {
      expect(await hasTablePrivilege(client, "service_role", privilege)).toBe(true);
    }
    for (const privilege of ["UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"] as const) {
      expect(await hasTablePrivilege(client, "service_role", privilege)).toBe(false);
    }

    for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "TRIGGER", "REFERENCES"] as const) {
      expect(await publicTableAclGrantsPrivilege(client, privilege)).toBe(false);
    }

    const { rows: rlsRows } = await client.query<{
      row_security: boolean;
      force_row_security: boolean;
    }>(
      `SELECT c.relrowsecurity AS row_security,
              c.relforcerowsecurity AS force_row_security
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'audit_events'`,
    );
    expect(rlsRows[0]?.row_security).toBe(true);
    expect(rlsRows[0]?.force_row_security).toBe(false);

    const { rows: policyRows } = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'audit_events'`,
    );
    expect(Number(policyRows[0]?.count ?? 0)).toBe(0);
  });

  it("keeps service_role INSERT and SELECT compatible with append-return reads", async () => {
    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL ROLE service_role");
      const { rows: insertRows } = await client.query<{ id: string }>(
        `INSERT INTO public.audit_events (
           actor_type, action, metadata
         ) VALUES (
           'system', 'parity.phase1.insert_probe', '{}'::jsonb
         )
         RETURNING id::text AS id`,
      );
      const insertedId = insertRows[0]?.id;
      expect(insertedId).toBeTruthy();

      const { rows: selectRows } = await client.query<{ id: string }>(
        `SELECT id::text AS id
           FROM public.audit_events
          WHERE id = $1::uuid`,
        [insertedId],
      );
      expect(selectRows[0]?.id).toBe(insertedId);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("records exactly one approved audit row for submitted to approved", async () => {
    await client.query("BEGIN");
    try {
      const appId = "00000000-0000-4000-8000-000000000090";
      const before = await auditCount(client);
      await insertApplication(client, { id: appId, status: "submitted" });

      const result = await transition(client, appId, "approved", "admin_authorized_email", null, false);
      expect(result.code).toBe("ok");
      expect(await auditCount(client)).toBe(before + 1);
      expect(await auditCountForAction(client, "admin.design_partner.approved", appId)).toBe(1);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("records exactly one rejected audit row for submitted to rejected", async () => {
    await client.query("BEGIN");
    try {
      const appId = "00000000-0000-4000-8000-000000000091";
      const before = await auditCount(client);
      await insertApplication(client, { id: appId, status: "submitted" });

      const result = await transition(client, appId, "rejected", "admin_pin", null, false);
      expect(result.code).toBe("ok");
      expect(await auditCount(client)).toBe(before + 1);
      expect(await auditCountForAction(client, "admin.design_partner.rejected", appId)).toBe(1);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("records exactly one rejected audit row for approved to rejected", async () => {
    await client.query("BEGIN");
    try {
      const appId = "00000000-0000-4000-8000-000000000092";
      const before = await auditCount(client);
      await insertApplication(client, { id: appId, status: "approved" });

      const result = await transition(client, appId, "rejected", "admin_unknown", null, false);
      expect(result.code).toBe("ok");
      expect(await auditCount(client)).toBe(before + 1);
      expect(await auditCountForAction(client, "admin.design_partner.rejected", appId)).toBe(1);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("does not add audit rows for duplicate approve or duplicate reject", async () => {
    await client.query("BEGIN");
    try {
      const appId = "00000000-0000-4000-8000-000000000093";
      await insertApplication(client, { id: appId, status: "submitted" });
      expect((await transition(client, appId, "approved", "admin_authorized_email", null, false)).code).toBe("ok");
      const afterFirst = await auditCount(client);

      expect((await transition(client, appId, "approved", "admin_authorized_email", null, false)).code).toBe("no_op");
      expect(await auditCount(client)).toBe(afterFirst);

      expect((await transition(client, appId, "rejected", "admin_pin", null, false)).code).toBe("ok");
      const afterReject = await auditCount(client);
      expect(afterReject).toBe(afterFirst + 1);

      expect((await transition(client, appId, "rejected", "admin_pin", null, false)).code).toBe("no_op");
      expect(await auditCount(client)).toBe(afterReject);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("notes-only transitions create zero audit rows for null, empty, whitespace, and trimmed values", async () => {
    await client.query("BEGIN");
    try {
      const cases = [
        { appId: "00000000-0000-4000-8000-000000000094", notes: null, expected: null },
        { appId: "00000000-0000-4000-8000-000000000095", notes: "", expected: null },
        { appId: "00000000-0000-4000-8000-000000000096", notes: "   ", expected: null },
        { appId: "00000000-0000-4000-8000-000000000097", notes: "  ops  ", expected: "ops" },
      ] as const;

      for (const testCase of cases) {
        const before = await auditCount(client);
        await insertApplication(client, {
          id: testCase.appId,
          status: "rejected",
          reviewerNotes: "keep",
        });

        const result = await transition(
          client,
          testCase.appId,
          "rejected",
          "admin_unknown",
          testCase.notes,
          true,
        );
        expect(result.code).toBe("notes_only");
        expect(await auditCount(client)).toBe(before);
        expect((await getApplication(client, testCase.appId)).reviewer_notes).toBe(testCase.expected);
      }
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("leaves reviewer_notes unchanged when notes are omitted on status transition", async () => {
    await client.query("BEGIN");
    try {
      const appId = "00000000-0000-4000-8000-000000000088";
      await insertApplication(client, {
        id: appId,
        status: "submitted",
        reviewerNotes: "keep-me",
      });

      const result = await transition(client, appId, "approved", "admin_authorized_email", "ignored", false);
      expect(result.code).toBe("ok");
      expect((await getApplication(client, appId)).reviewer_notes).toBe("keep-me");
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("creates zero audit rows for promote-vs-reject losing outcomes", async () => {
    await client.query("BEGIN");
    try {
      const appId = "00000000-0000-4000-8000-000000000087";
      await insertApplication(client, { id: appId, status: "rejected" });
      const before = await auditCount(client);

      const promoteResult = await promote(client, appId, "loser-partner");
      expect(promoteResult.ok).toBe(false);
      expect(promoteResult.code).toBe("application_rejected");
      expect(await auditCount(client)).toBe(before);

      const rejectResult = await transition(client, appId, "approved", "admin_unknown", null, false);
      expect(rejectResult.code).toBe("status_conflict");
      expect(await auditCount(client)).toBe(before);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("promote wrapper and v2 share single audit insert in impl", async () => {
    await client.query("BEGIN");
    try {
      const appId = "00000000-0000-4000-8000-000000000099";
      await insertApplication(client, { id: appId, status: "approved", company: "Acme" });

      const before = await auditCount(client);

      await promote(client, appId, "acme-wrapper");
      expect(await auditCount(client)).toBe(before + 1);

      const duplicate = await promote(client, appId, "acme-wrapper-2", KEY_PREFIX, "b".repeat(64));
      expect(duplicate.code).toBe("application_already_promoted");
      expect(await auditCount(client)).toBe(before + 1);

      const appId2 = "00000000-0000-4000-8000-000000000098";
      await insertApplication(client, { id: appId2, status: "approved", company: "Beta" });

      await client.query(
        `SELECT public.design_partner_promote_atomic_v2($1::uuid, $2, $3, $4, $5)`,
        [appId2, "beta-v2", KEY_PREFIX, "c".repeat(64), "admin_authorized_email"],
      );
      expect(await auditCount(client)).toBe(before + 2);

      const { rows: eventHashRows } = await client.query<{ event_hash: string | null }>(
        `SELECT event_hash FROM public.audit_events ORDER BY created_at DESC LIMIT 1`,
      );
      expect(eventHashRows[0]?.event_hash).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("rolls back promotion with zero audit rows on partner_id conflict and key conflict", async () => {
    await client.query("BEGIN");
    try {
      const appId = "00000000-0000-4000-8000-000000000086";
      await insertApplication(client, { id: appId, status: "approved" });
      const before = await auditCount(client);

      await client.query(
        `INSERT INTO public.partners (partner_id, company, status)
         VALUES ('conflict-partner', 'Existing', 'pilot')`,
      );

      await client.query("SAVEPOINT partner_id_conflict");
      await expect(
        client.query(
          `SELECT public.design_partner_promote_atomic($1::uuid, $2, $3, $4)`,
          [appId, "conflict-partner", KEY_PREFIX, KEY_HASH],
        ),
      ).rejects.toThrow(/partner_id_conflict/);
      await client.query("ROLLBACK TO SAVEPOINT partner_id_conflict");
      expect(await auditCount(client)).toBe(before);
      expect((await getApplication(client, appId)).status).toBe("approved");
      expect((await getApplication(client, appId)).promoted_partner_id).toBeNull();

      const appId2 = "00000000-0000-4000-8000-000000000085";
      await insertApplication(client, { id: appId2, status: "approved" });
      await client.query(
        `INSERT INTO public.partner_api_keys (partner_id, display_name, key_prefix, key_hash)
         VALUES ('other-partner', 'Other', $1, $2)`,
        [KEY_PREFIX, KEY_HASH],
      );

      await client.query("SAVEPOINT key_conflict");
      await expect(
        client.query(
          `SELECT public.design_partner_promote_atomic($1::uuid, $2, $3, $4)`,
          [appId2, "fresh-partner", KEY_PREFIX, KEY_HASH],
        ),
      ).rejects.toThrow(/key_insert_failed/);
      await client.query("ROLLBACK TO SAVEPOINT key_conflict");
      expect(await auditCount(client)).toBe(before);
      expect((await getApplication(client, appId2)).status).toBe("approved");
      expect((await getApplication(client, appId2)).promoted_partner_id).toBeNull();
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("rolls back transition and promotion when audit insert is forced to fail", async () => {
    await client.query("BEGIN");
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION public.parity_fail_audit_insert()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RAISE EXCEPTION 'forced_audit_insert_failure';
        END;
        $$;
      `);
      await client.query(`
        CREATE TRIGGER parity_fail_audit_insert
        BEFORE INSERT ON public.audit_events
        FOR EACH ROW
        EXECUTE FUNCTION public.parity_fail_audit_insert();
      `);

      const transitionAppId = "00000000-0000-4000-8000-000000000084";
      await insertApplication(client, { id: transitionAppId, status: "submitted" });
      await client.query("SAVEPOINT transition_audit_failure");
      await expect(
        client.query(
          `SELECT public.design_partner_review_transition_atomic(
             $1::uuid, 'approved', 'admin_authorized_email', NULL, false
           )`,
          [transitionAppId],
        ),
      ).rejects.toThrow(/forced_audit_insert_failure/);
      await client.query("ROLLBACK TO SAVEPOINT transition_audit_failure");
      expect((await getApplication(client, transitionAppId)).status).toBe("submitted");

      const promoteAppId = "00000000-0000-4000-8000-000000000083";
      await insertApplication(client, { id: promoteAppId, status: "approved" });
      await client.query("SAVEPOINT promote_audit_failure");
      await expect(
        client.query(
          `SELECT public.design_partner_promote_atomic($1::uuid, $2, $3, $4)`,
          [promoteAppId, "fail-promote", KEY_PREFIX, "d".repeat(64)],
        ),
      ).rejects.toThrow(/forced_audit_insert_failure/);
      await client.query("ROLLBACK TO SAVEPOINT promote_audit_failure");
      expect((await getApplication(client, promoteAppId)).status).toBe("approved");
      expect((await getApplication(client, promoteAppId)).promoted_partner_id).toBeNull();
    } finally {
      await client.query("ROLLBACK");
    }
  });

  describe("design_partner_lifecycle_audit_list_v2", () => {
    it("exists with exact identity arguments and hardened security posture", async () => {
      const { rows } = await client.query<{ args: string }>(
        `SELECT pg_get_function_identity_arguments(p.oid) AS args
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname = 'design_partner_lifecycle_audit_list_v2'`,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.args).toBe(LIST_V2_IDENTITY_ARGS);
      expect(
        await isSecurityDefiner(client, "design_partner_lifecycle_audit_list_v2", LIST_V2_IDENTITY_ARGS),
      ).toBe(true);
      const proconfig = await getFunctionProconfig(
        client,
        "design_partner_lifecycle_audit_list_v2",
        LIST_V2_IDENTITY_ARGS,
      );
      expect(proconfig.some((entry) => entry.startsWith("search_path="))).toBe(true);
      const v2Owner = await getFunctionOwner(
        client,
        "design_partner_lifecycle_audit_list_v2",
        LIST_V2_IDENTITY_ARGS,
      );
      const v1Owner = await getFunctionOwner(
        client,
        "design_partner_lifecycle_audit_list",
        LIST_V1_IDENTITY_ARGS,
      );
      expect(v2Owner).toBe("postgres");
      expect(v2Owner).toBe(v1Owner);
    });

    it("revokes PUBLIC, anon, and authenticated execute and grants postgres and service_role only", async () => {
      expect(
        await publicAclGrantsExecute(
          client,
          "design_partner_lifecycle_audit_list_v2",
          LIST_V2_IDENTITY_ARGS,
        ),
      ).toBe(false);
      expect(
        await hasExecutePrivilege(
          client,
          "anon",
          "design_partner_lifecycle_audit_list_v2",
          LIST_V2_IDENTITY_ARGS,
        ),
      ).toBe(false);
      expect(
        await hasExecutePrivilege(
          client,
          "authenticated",
          "design_partner_lifecycle_audit_list_v2",
          LIST_V2_IDENTITY_ARGS,
        ),
      ).toBe(false);
      expect(
        await hasExecutePrivilege(
          client,
          "parity_unprivileged",
          "design_partner_lifecycle_audit_list_v2",
          LIST_V2_IDENTITY_ARGS,
        ),
      ).toBe(false);
      expect(
        await hasExecutePrivilege(
          client,
          "postgres",
          "design_partner_lifecycle_audit_list_v2",
          LIST_V2_IDENTITY_ARGS,
        ),
      ).toBe(true);
      expect(
        await hasExecutePrivilege(
          client,
          "service_role",
          "design_partner_lifecycle_audit_list_v2",
          LIST_V2_IDENTITY_ARGS,
        ),
      ).toBe(true);
    });

    it("returns the fixed envelope for null application id and cursor XOR", async () => {
      const nullApp = await listLifecycleAuditV2(client, null);
      assertLifecycleAuditListV2Envelope(nullApp);
      expect(nullApp.events).toEqual([]);
      expect(nullApp.next_cursor).toBeNull();

      const appId = "00000000-0000-4000-8000-0000000000b1";
      const { rows: timestampOnlyRows } = await client.query<{ result: LifecycleAuditListV2Envelope }>(
        `SELECT public.design_partner_lifecycle_audit_list_v2($1::uuid, 25, $2::timestamptz, NULL::uuid) AS result`,
        [appId, "2026-01-01T00:00:00.000Z"],
      );
      const timestampOnly = timestampOnlyRows[0]?.result ?? { events: [], next_cursor: null };
      assertLifecycleAuditListV2Envelope(timestampOnly);
      expect(timestampOnly.events).toEqual([]);
      expect(timestampOnly.next_cursor).toBeNull();

      const { rows: idOnlyRows } = await client.query<{ result: LifecycleAuditListV2Envelope }>(
        `SELECT public.design_partner_lifecycle_audit_list_v2($1::uuid, 25, NULL::timestamptz, $2::uuid) AS result`,
        [appId, "00000000-0000-4000-8000-000000000001"],
      );
      const idOnly = idOnlyRows[0]?.result ?? { events: [], next_cursor: null };
      assertLifecycleAuditListV2Envelope(idOnly);
      expect(idOnly.events).toEqual([]);
      expect(idOnly.next_cursor).toBeNull();
    });

    it("preserves migration 072 v1 list behavior unchanged", async () => {
      await client.query("BEGIN");
      try {
        const appId = "00000000-0000-4000-8000-0000000000b2";
        await insertApplication(client, { id: appId, status: "submitted" });
        expect((await transition(client, appId, "approved", "admin_authorized_email", null, false)).code).toBe("ok");

        const { rows: v1Rows } = await client.query<{ result: unknown }>(
          `SELECT public.design_partner_lifecycle_audit_list($1::uuid, 25) AS result`,
          [appId],
        );
        const v1 = v1Rows[0]?.result;
        expect(Array.isArray(v1)).toBe(true);
        expect((v1 as unknown[]).length).toBe(1);

        const v2 = await listLifecycleAuditV2(client, appId, 25);
        assertLifecycleAuditListV2Envelope(v2);
        expect(v2.events).toHaveLength(1);
        expect(v2.next_cursor).toBeNull();
        expect(v2.events[0]?.event_type).toBe("admin.design_partner.approved");
      } finally {
        await client.query("ROLLBACK");
      }
    });

    it("paginates valid rows without duplicates, gaps, or false cursors", async () => {
      await client.query("BEGIN");
      try {
        const appId = "00000000-0000-4000-8000-0000000000b3";
        const objectId = appId.toLowerCase();
        const validIds = [
          "10000000-0000-4000-8000-000000000001",
          "10000000-0000-4000-8000-000000000002",
          "10000000-0000-4000-8000-000000000003",
          "10000000-0000-4000-8000-000000000004",
          "10000000-0000-4000-8000-000000000005",
        ] as const;

        await insertRawLifecycleAuditRow(client, {
          id: "20000000-0000-4000-8000-000000000001",
          objectId,
          action: "admin.design_partner.approved",
          fromStatus: "submitted",
          toStatus: "approved",
          createdAt: "2026-06-01T12:00:00.000Z",
          invalid: true,
        });
        for (let index = 0; index < validIds.length; index += 1) {
          await insertRawLifecycleAuditRow(client, {
            id: validIds[index]!,
            objectId,
            action: "admin.design_partner.approved",
            fromStatus: "submitted",
            toStatus: "approved",
            createdAt: `2026-06-0${5 - index}T12:00:00.000Z`,
          });
        }
        await insertRawLifecycleAuditRow(client, {
          id: "20000000-0000-4000-8000-000000000002",
          objectId,
          action: "admin.design_partner.rejected",
          fromStatus: "approved",
          toStatus: "rejected",
          createdAt: "2026-06-01T11:30:00.000Z",
          invalid: true,
        });

        const page1 = await listLifecycleAuditV2(client, appId, 2);
        assertLifecycleAuditListV2Envelope(page1);
        expect(page1.events).toHaveLength(2);
        expect(page1.next_cursor).not.toBeNull();
        expect(page1.events[0]?.occurred_at).toBe("2026-06-05T12:00:00.000Z");
        expect(page1.events[1]?.occurred_at).toBe("2026-06-04T12:00:00.000Z");

        const page2 = await listLifecycleAuditV2(client, appId, 2, page1.next_cursor!);
        assertLifecycleAuditListV2Envelope(page2);
        expect(page2.events).toHaveLength(2);
        expect(page2.next_cursor).not.toBeNull();

        const page3 = await listLifecycleAuditV2(client, appId, 2, page2.next_cursor!);
        assertLifecycleAuditListV2Envelope(page3);
        expect(page3.events).toHaveLength(1);
        expect(page3.next_cursor).toBeNull();

        const seen = new Set<string>();
        for (const page of [page1, page2, page3]) {
          for (const event of page.events) {
            const key = `${event.occurred_at as string}:${event.event_type as string}:${event.from_status as string}:${event.to_status as string}`;
            expect(seen.has(key)).toBe(false);
            seen.add(key);
          }
        }
        expect(seen.size).toBe(5);
      } finally {
        await client.query("ROLLBACK");
      }
    });

    it("defaults to 25 events and clamps oversized limits defensively", async () => {
      await client.query("BEGIN");
      try {
        const appId = "00000000-0000-4000-8000-0000000000b4";
        const objectId = appId.toLowerCase();
        for (let index = 0; index < 30; index += 1) {
          await insertRawLifecycleAuditRow(client, {
            id: `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
            objectId,
            action: "admin.design_partner.approved",
            fromStatus: "submitted",
            toStatus: "approved",
            createdAt: `2026-07-${String(30 - index).padStart(2, "0")}T12:00:00.000Z`,
          });
        }

        const defaultPage = await listLifecycleAuditV2(client, appId, null);
        assertLifecycleAuditListV2Envelope(defaultPage);
        expect(defaultPage.events).toHaveLength(25);
        expect(defaultPage.next_cursor).not.toBeNull();

        const clampedPage = await listLifecycleAuditV2(client, appId, 100);
        assertLifecycleAuditListV2Envelope(clampedPage);
        expect(clampedPage.events).toHaveLength(25);
        expect(clampedPage.next_cursor).not.toBeNull();
      } finally {
        await client.query("ROLLBACK");
      }
    });

    it("does not change audit row count when listing lifecycle events", async () => {
      const before = await auditCount(client);
      await listLifecycleAuditV2(client, "00000000-0000-4000-8000-0000000000b5", 25);
      await listLifecycleAuditV2(client, null, 25);
      expect(await auditCount(client)).toBe(before);
    });
  });
});
