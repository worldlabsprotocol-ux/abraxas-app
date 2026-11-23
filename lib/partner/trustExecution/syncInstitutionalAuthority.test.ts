import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InstitutionalAuthorityRecord } from "./institutionalAuthorityBinding";

let existing: Record<string, unknown> | null = null;
let writes = 0;

vi.mock("@/lib/persistence/boundary/sovereignStagingPg.runtime", () => ({
  withSovereignStagingPgTransaction: async (run: (client: { query: typeof query }) => Promise<unknown>) =>
    ({ ok: true, value: await run({ query }) }),
  querySovereignStagingPg: async () => ({ rows: existing ? [existing] : [] }),
}));

async function query(sql: string, values: unknown[]) {
  if (sql.includes("insert into public.partner_launchpad_applications")) {
    if (!existing) {
      existing = {
        id: values[0], partner_id: values[1], policy_id: values[2],
        policy_version: values[3], status: values[4], authority_source_revision: values[5],
      };
      writes++;
    }
    return { rows: [] };
  }
  if (sql.includes("for update")) return { rows: existing ? [existing] : [] };
  if (sql.includes("update public.partner_launchpad_applications")) {
    existing = { ...existing, authority_source_revision: values[1] };
    writes++;
  }
  return { rows: [] };
}

import { readInstitutionalAuthorityBinding, syncInstitutionalAuthority } from "./syncInstitutionalAuthority.server";

const source: InstitutionalAuthorityRecord = {
  applicationId: "00000000-0000-4000-8000-000000000001",
  partnerId: "tenant-one",
  policyId: "policy-one",
  policyVersion: 1,
  status: "active",
  sourceRevision: "2026-11-22T20:00:00.000Z",
  environment: "sandbox",
};

beforeEach(() => { existing = null; writes = 0; });

describe("sandbox authority provisioning", () => {
  it("reads a cross-tenant row for the operator comparison without writing", async () => {
    existing = {
      id: "00000000-0000-4000-8000-000000000001",
      partner_id: "other-tenant", policy_id: "policy-one", policy_version: 1,
      status: "active", authority_source_revision: null,
    };
    expect(await readInstitutionalAuthorityBinding(source.applicationId))
      .toMatchObject({ partnerId: "other-tenant" });
    expect(writes).toBe(0);
  });

  it("binds a new application exactly once and accepts an idempotent replay", async () => {
    expect(await syncInstitutionalAuthority({ authorizedApplicationId: source.applicationId, source })).toEqual({ ok: true });
    expect(await syncInstitutionalAuthority({ authorizedApplicationId: source.applicationId, source })).toEqual({ ok: true });
    expect(writes).toBe(1);
  });

  it("repairs only a matching existing row with a missing revision", async () => {
    existing = {
      id: source.applicationId, partner_id: source.partnerId, policy_id: source.policyId,
      policy_version: 1, status: "active", authority_source_revision: null,
    };
    expect(await syncInstitutionalAuthority({ authorizedApplicationId: source.applicationId, source })).toEqual({ ok: true });
    expect(existing).toMatchObject({ authority_source_revision: source.sourceRevision });
    expect(writes).toBe(1);
  });

  it.each([
    [{ partner_id: "other-tenant" }, "institutional_authority_conflict"],
    [{ policy_id: "other-policy" }, "institutional_authority_conflict"],
    [{ policy_version: 2 }, "institutional_authority_stale"],
    [{ status: "suspended" }, "institutional_authority_mismatch"],
    [{ authority_source_revision: "2026-11-21T20:00:00.000Z" }, "institutional_authority_stale"],
  ])("rejects conflicting authority without writing", async (change, code) => {
    existing = {
      id: source.applicationId, partner_id: source.partnerId, policy_id: source.policyId,
      policy_version: 1, status: "active", authority_source_revision: null, ...change,
    };
    expect(await syncInstitutionalAuthority({ authorizedApplicationId: source.applicationId, source }))
      .toMatchObject({ ok: false, code });
    expect(writes).toBe(0);
  });

  it("rejects an unauthorized application or inactive source before database access", async () => {
    expect(await syncInstitutionalAuthority({ authorizedApplicationId: "another", source }))
      .toMatchObject({ ok: false, code: "institutional_authority_mismatch" });
    expect(await syncInstitutionalAuthority({ authorizedApplicationId: source.applicationId,
      source: { ...source, status: "suspended" } }))
      .toMatchObject({ ok: false, code: "institutional_authority_mismatch" });
    expect(writes).toBe(0);
  });
});
