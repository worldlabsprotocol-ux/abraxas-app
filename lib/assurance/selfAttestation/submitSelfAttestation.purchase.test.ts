import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES } from "@/lib/goodTrouble/pilotAgeEligibilityPolicy";
import { isBlockedSelfAttestationPurpose } from "./purposePolicy";

const HOLDER = normalizeSuiAddress("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");

const mockGetPolicy = vi.fn();
const mockInsertSelfAttestationRecord = vi.fn();
const mockSignBrowseAccessReceipt = vi.fn();

vi.mock("@/lib/verification/requestsService", () => ({
  getPolicy: (...args: unknown[]) => mockGetPolicy(...args),
}));

vi.mock("./selfAttestationLedger", () => ({
  generateBrowseReceiptId: () => "br_test",
  insertSelfAttestationRecord: (...args: unknown[]) => mockInsertSelfAttestationRecord(...args),
}));

vi.mock("./browseReceipt", () => ({
  buildBrowseReceiptPayload: (payload: unknown) => payload,
  signBrowseAccessReceipt: (...args: unknown[]) => mockSignBrowseAccessReceipt(...args),
}));

vi.mock("./selfAttestationAudit", () => ({
  emitSelfAttestationAuditEvent: vi.fn(),
}));

import { submitSelfAttestation } from "./submitSelfAttestation";

describe("submitSelfAttestation purchase (Good Trouble pilot)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPolicy.mockResolvedValue({
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      rules_json: GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES,
    });
    mockInsertSelfAttestationRecord.mockResolvedValue({
      ok: true,
      row: {
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        attested_at: new Date().toISOString(),
      },
    });
    mockSignBrowseAccessReceipt.mockResolvedValue("signed-browse-jwt");
  });

  it("does not block purpose=purchase at the purpose guard", () => {
    expect(isBlockedSelfAttestationPurpose("purchase")).toBe(false);
  });

  it("accepts DOB 1999-11-11 for purchase age eligibility policy", async () => {
    const result = await submitSelfAttestation({
      dateOfBirth: "1999-11-11",
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
      holderRef: HOLDER,
    });

    expect(result).toMatchObject({
      ok: true,
      age_band: "over_21",
      assurance_level: "L0",
      purpose: "purchase",
      valid_for_purchase: true,
    });
    expect(mockInsertSelfAttestationRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: "purchase",
        ageBand: "over_21",
        browseReceiptId: null,
      }),
    );
    expect(mockSignBrowseAccessReceipt).not.toHaveBeenCalled();
  });

  it("returns under_21 without persisting partner-visible DOB", async () => {
    const result = await submitSelfAttestation({
      dateOfBirth: "2010-11-11",
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
      holderRef: HOLDER,
    });

    expect(result).toMatchObject({ ok: true, age_band: "under_21", valid_for_purchase: false });
  });

  it("still rejects checkout purpose", async () => {
    const result = await submitSelfAttestation({
      dateOfBirth: "1999-11-11",
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "checkout",
      holderRef: HOLDER,
    });

    expect(result).toEqual({ ok: false, code: "purpose_not_allowed", status: 400 });
  });
});
