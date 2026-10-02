// FILE: lib/partner/narrowPartnerResult/build.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildNarrowPartnerResultForReceipt } from "./build";

const getReceiptById = vi.fn();
const requireSupabaseAdmin = vi.fn();

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptById: (...args: unknown[]) => getReceiptById(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => requireSupabaseAdmin(),
}));

vi.mock("@/lib/decisionReceipts/views", () => ({
  verifyRecordSignature: () => true,
}));

describe("narrow partner result build", () => {
  beforeEach(() => {
    getReceiptById.mockReset();
    requireSupabaseAdmin.mockReset();
  });

  it("returns provenance facts without artifact_id or content_hash", async () => {
    getReceiptById.mockResolvedValue({
      id: "dr_prov",
      verification_decision_id: "dec_1",
      partner_id: "sandbox-content-publisher",
      policy_id: "sandbox-content-publisher-content_origin_disclosure-v1",
      policy_version: 1,
      decision_result: "approved",
      schema_version: "1.0.0",
      payload_hash: "abc",
      signature: "sig",
      signing_key_id: "key",
    });

    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              decision: "approved",
              claims_json: {
                creator_attested: true,
                ai_assistance_disclosed: "none_declared",
                source_integrity_verified: true,
                assertion_classes: {
                  creator_attested: "attestation",
                  ai_assistance_disclosed: "disclosure",
                  source_integrity_verified: "integrity",
                },
                artifact_id: "art_hidden",
                content_hash: "a".repeat(64),
              },
            },
          }),
        }),
      }),
    });
    requireSupabaseAdmin.mockReturnValue({ from });

    const result = await buildNarrowPartnerResultForReceipt("dr_prov");
    expect(result?.provenance?.ai_assistance_disclosed).toBe("none_declared");
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("artifact_id");
    expect(serialized).not.toContain("content_hash");
    expect(serialized).not.toContain("claim_value");
  });

  it("returns null when receipt is missing", async () => {
    getReceiptById.mockResolvedValue(null);
    const result = await buildNarrowPartnerResultForReceipt("dr_missing");
    expect(result).toBeNull();
  });
});
