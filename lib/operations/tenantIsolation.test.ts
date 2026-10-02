// FILE: lib/operations/tenantIsolation.test.ts
// Tenant boundary tests for public result surfaces and PartnerKit client validation.

import { describe, expect, it, vi } from "vitest";
import { AbraxasPartnerKit } from "@/lib/partner/integrationKit";
import { buildNarrowPartnerResultForReceipt } from "@/lib/partner/narrowPartnerResult/build";

const getReceiptById = vi.fn();
vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptById: (...args: unknown[]) => getReceiptById(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/decisionReceipts/views", () => ({
  verifyRecordSignature: () => true,
}));

describe("tenant isolation", () => {
  it("PartnerKit rejects narrow-result when configured partner does not match receipt partner", async () => {
    const kit = new AbraxasPartnerKit({
      partnerId: "partner-a",
      policyId: "partner-a-age_21_retail-v1",
      environment: "sandbox",
      fetchFn: async () => new Response(JSON.stringify({
        schema_version: "1.0.0",
        receipt_id: "dr_x",
        partner_id: "partner-b",
        policy_id: "partner-b-age_21_retail-v1",
        decision: "approved",
        result_family: "age_eligible_21",
      }), { status: 200 }),
    });
    const result = await kit.fetchNarrowPartnerResult("dr_x");
    expect(result.ok).toBe(false);
  });

  it("PartnerKit rejects narrow-result when configured policy does not match receipt policy", async () => {
    const kit = new AbraxasPartnerKit({
      partnerId: "partner-a",
      policyId: "partner-a-age_21_retail-v1",
      environment: "sandbox",
      fetchFn: async () => new Response(JSON.stringify({
        schema_version: "1.0.0",
        receipt_id: "dr_x",
        partner_id: "partner-a",
        policy_id: "partner-a-other-v1",
        decision: "approved",
        result_family: "policy_result",
      }), { status: 200 }),
    });
    const result = await kit.fetchNarrowPartnerResult("dr_x");
    expect(result.ok).toBe(false);
  });

  it("narrow-result builder does not expose forbidden tenant or artifact fields", async () => {
    getReceiptById.mockResolvedValue({
      id: "dr_iso",
      verification_decision_id: "dec_iso",
      partner_id: "sandbox-content-publisher",
      policy_id: "sandbox-content-publisher-content_origin_disclosure-v1",
      policy_version: 1,
      decision_result: "approved",
      schema_version: "1.0.0",
      payload_hash: "abc",
      signature: "sig",
      signing_key_id: "key",
    });
    const result = await buildNarrowPartnerResultForReceipt("dr_iso");
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("artifact_id");
    expect(serialized).not.toContain("content_hash");
    expect(serialized).not.toContain("claim_value");
    expect(result?.partner_id).toBe("sandbox-content-publisher");
  });

  it("repeated narrow-result reads return stable shape without side effects", async () => {
    getReceiptById.mockResolvedValue({
      id: "dr_repeat",
      verification_decision_id: "dec_repeat",
      partner_id: "partner-a",
      policy_id: "partner-a-age_21_retail-v1",
      policy_version: 1,
      decision_result: "denied",
      schema_version: "1.0.0",
      payload_hash: "abc",
      signature: "sig",
      signing_key_id: "key",
    });
    const first = await buildNarrowPartnerResultForReceipt("dr_repeat");
    const second = await buildNarrowPartnerResultForReceipt("dr_repeat");
    expect(first).toEqual(second);
    expect(getReceiptById.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
