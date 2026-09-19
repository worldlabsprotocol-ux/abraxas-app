import { describe, expect, it, vi, beforeEach } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

const fromMock = vi.fn();
const listMock = vi.fn();
const gateMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({ from: (...args: unknown[]) => fromMock(...args) }),
}));

vi.mock("@/lib/settlement/circle/store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/settlement/circle/store")>(
    "@/lib/settlement/circle/store",
  );
  return {
    ...actual,
    listIntentsForApplication: (...args: unknown[]) => listMock(...args),
  };
});

vi.mock("@/lib/settlement/circle/receiptGate", () => ({
  gateSettlementReceipt: (...args: unknown[]) => gateMock(...args),
}));

import {
  eligibleReceiptListHasForbiddenMaterial,
  listEligibleSettlementReceipts,
} from "@/lib/settlement/circle/eligibleReceipts";

const app: LaunchpadApplicationRow = {
  id: "app-1",
  public_slug: "acme",
  partner_id: "acme",
  application_name: "Acme",
  display_name: "Acme",
  environment: "sandbox",
  policy_id: "policy-1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: [],
  api_key_id: null,
  production_api_key_id: null,
  production_key_revealed_at: null,
  status: "active",
  idempotency_key: null,
  created_at: "2026-09-18T00:00:00.000Z",
  updated_at: "2026-09-18T00:00:00.000Z",
};

function query(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "gt", "order"]) {
    chain[method] = () => chain;
  }
  chain.limit = () => Promise.resolve({ data: rows, error: null });
  return chain;
}

describe("listEligibleSettlementReceipts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-settlement-selection-secret";
    fromMock.mockReturnValue(query([
      { id: "receipt-ok", evaluated_at: "2026-09-19T09:55:00.000Z", policy_version: 1 },
      { id: "receipt-denied", evaluated_at: "2026-09-19T08:34:00.000Z", policy_version: 1 },
      { id: "receipt-used", evaluated_at: "2026-09-19T07:00:00.000Z", policy_version: 1 },
    ]));
    listMock.mockResolvedValue([{ receipt_id: "receipt-used" }]);
    gateMock.mockImplementation(async (input: { receiptId: string }) => {
      if (input.receiptId === "receipt-ok") {
        return { ok: true, receipt_id: input.receiptId };
      }
      return { ok: false, code: "settlement_receipt_denied", receipt_id: input.receiptId };
    });
  });

  it("includes the eligible receipt and excludes denied, settled, and forbidden material", async () => {
    const listed = await listEligibleSettlementReceipts({
      application: app,
      partnerId: "acme",
      sessionKeyId: "key-1",
    });
    expect(listed).toHaveLength(1);
    expect(listed[0].decision_state).toBe("approved");
    expect(listed[0].environment).toBe("sandbox");
    expect(listed[0].policy_version).toBe(1);
    expect(listed[0].eligibility_summary).toMatch(/Sandbox product eligibility/);
    expect(listed[0].selection_token.length).toBeGreaterThan(20);
    expect(JSON.stringify(listed)).not.toMatch(/receipt-ok|receipt-denied|receipt-used/);
    expect(eligibleReceiptListHasForbiddenMaterial(listed)).toBe(false);
    expect(gateMock).toHaveBeenCalled();
  });
});
