import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const legacyMock = vi.hoisted(() => vi.fn(() => { throw new Error("legacy_store_used"); }));

vi.mock("@/lib/persistence/env", () => ({ persistenceUsesDirectPostgres: () => true }));
vi.mock("@/lib/persistence/pgPool", () => ({ queryAbraxasPg: queryMock }));
vi.mock("@/lib/supabase/admin", () => ({ requireSupabaseAdmin: legacyMock }));
vi.mock("@/lib/decisionReceipts/views", () => ({ toPublicView: vi.fn() }));
vi.mock("@/lib/decisionReceipts/trustEvaluation", () => ({ evaluatePublicReceiptTrust: vi.fn() }));
vi.mock("@/lib/decisionReceipts/currentValidity", () => ({ evaluateReceiptCurrentValidity: vi.fn() }));

import { resolveLiveClaimStatuses } from "./publicReceiptLiveTrust";

describe("sovereign public receipt claim status", () => {
  beforeEach(() => {
    queryMock.mockReset();
    legacyMock.mockClear();
  });

  it("reads current revocation status from PostgreSQL", async () => {
    queryMock.mockResolvedValue({ rows: [{
      id: "00000000-0000-4000-8000-0000000000aa", status: "revoked", expires_at: null,
    }] });
    const statuses = await resolveLiveClaimStatuses(["00000000-0000-4000-8000-0000000000aa"]);
    expect(statuses.get("00000000-0000-4000-8000-0000000000aa")).toBe("revoked");
    expect(legacyMock).not.toHaveBeenCalled();
  });

  it("fails closed when a signed claim no longer exists", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await expect(resolveLiveClaimStatuses(["00000000-0000-4000-8000-0000000000aa"]))
      .rejects.toThrow("receipt_claim_status_unavailable");
    expect(legacyMock).not.toHaveBeenCalled();
  });
});
