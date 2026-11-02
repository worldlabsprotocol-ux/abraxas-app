import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const legacyMock = vi.hoisted(() => vi.fn(() => { throw new Error("legacy_store_used"); }));

vi.mock("@/lib/persistence/env", () => ({ persistenceUsesDirectPostgres: () => true }));
vi.mock("@/lib/persistence/pgPool", () => ({ queryAbraxasPg: queryMock }));
vi.mock("@/lib/supabase/admin", () => ({ requireSupabaseAdmin: legacyMock }));
vi.mock("@/lib/trust/trustRegistry", () => ({ listTrustedIssuers: legacyMock }));
vi.mock("@/lib/verification/audit", () => ({ appendAuditEvent: legacyMock }));

import { getIssuerById, getTrustRulesForPolicy, isIssuerTrustedForClaim } from "./issuerFramework";

describe("sovereign issuer trust reads", () => {
  beforeEach(() => {
    queryMock.mockReset();
    legacyMock.mockClear();
  });

  it("rejects a missing issuer without falling back to a legacy registry", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    expect(await getIssuerById("issuer-missing")).toBeNull();
    expect(legacyMock).not.toHaveBeenCalled();
  });

  it("enforces partner and policy trust rules from PostgreSQL", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ issuer: {
      id: "issuer-a", issuer_status: "active", trust_status: "active",
      supported_claims: ["identity_verified"], legal_name: "Issuer A",
    } }] }).mockResolvedValueOnce({ rows: [{ trust_rule: {
      id: "rule-a", partner_id: "partner-a", policy_id: "policy-a",
      claim_type: "identity_verified", accepted_issuer_ids: ["issuer-b"],
      status: "active",
    } }] });
    const result = await isIssuerTrustedForClaim({
      partnerId: "partner-a", policyId: "policy-a", claimType: "identity_verified",
      issuerId: "issuer-a", assuranceLevel: "L2", jurisdiction: "US",
      issuedAt: "2026-01-01T00:00:00Z",
    });
    expect(result).toEqual({ ok: false, reason: "issuer_not_in_policy:issuer-a" });
    expect(queryMock.mock.calls[1][1]).toEqual(["partner-a", "policy-a"]);
    expect(legacyMock).not.toHaveBeenCalled();
  });

  it("propagates trust store failure rather than allowing empty rules", async () => {
    queryMock.mockRejectedValue(new Error("database unavailable"));
    await expect(getTrustRulesForPolicy("partner-a", "policy-a"))
      .rejects.toThrow("database unavailable");
    expect(legacyMock).not.toHaveBeenCalled();
  });
});
