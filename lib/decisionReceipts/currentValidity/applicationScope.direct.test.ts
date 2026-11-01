import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());
vi.mock("@/lib/persistence/env", () => ({ persistenceUsesDirectPostgres: () => true }));
vi.mock("@/lib/persistence/pgPool", () => ({ queryAbraxasPg: query }));
vi.mock("@/lib/persistence/boundary/sovereignStagingPg", () => ({
  getSovereignStagingPgPool: () => { throw new Error("staging_store_used"); },
}));
vi.mock("@/lib/partner/launchpad/launchpadPersistence", () => ({
  launchpadUsesSovereignPostgres: () => { throw new Error("legacy_store_used"); },
}));

import { evaluateOperationalApplicationScope } from "./applicationScope.server";

const applicationId = "00000000-0000-4000-8000-000000000002";
const receiptId = "dr_bound";

describe("direct PostgreSQL application scope", () => {
  beforeEach(() => query.mockReset());

  it("accepts only the authoritative receipt-to-request application binding", async () => {
    query.mockResolvedValue({ rows: [{ application_partner_id: "partner-a",
      application_status: "active", binding_application_id: applicationId,
      binding_partner_id: "partner-a", binding_revoked_at: null }] });
    const result = await evaluateOperationalApplicationScope({
      receiptId, partnerId: "partner-a", applicationId,
    });
    expect(result).toMatchObject({ store_available: true, application_scope_satisfied: true });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("public.verification_decisions"),
      [receiptId], expect.any(Object));
  });

  it("rejects a cross-tenant application", async () => {
    query.mockResolvedValue({ rows: [{ application_partner_id: "partner-b",
      application_status: "active", binding_application_id: applicationId,
      binding_partner_id: "partner-b", binding_revoked_at: null }] });
    const result = await evaluateOperationalApplicationScope({
      receiptId, partnerId: "partner-a", applicationId,
    });
    expect(result.application_scope_satisfied).toBe(false);
    expect(result.reasons).toContain("application_mismatch");
  });

  it("fails closed when current binding is missing", async () => {
    query.mockResolvedValue({ rows: [] });
    const result = await evaluateOperationalApplicationScope({
      receiptId, partnerId: "partner-a", applicationId,
    });
    expect(result).toMatchObject({ store_available: true, application_scope_satisfied: false });
  });
});
