import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";

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

describe("submitSelfAttestation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPolicy.mockResolvedValue({
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      rules_json: { minimum_age: 21, browse_access_only: true },
    });
    mockInsertSelfAttestationRecord.mockResolvedValue({
      ok: true,
      row: {
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        attested_at: new Date().toISOString(),
      },
    });
  });

  it("fails closed when browse receipt signing is unavailable", async () => {
    mockSignBrowseAccessReceipt.mockResolvedValue(null);

    const result = await submitSelfAttestation({
      dateOfBirth: "1990-01-01",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
      holderRef: HOLDER,
    });

    expect(result).toEqual({
      ok: false,
      code: "receipt_signing_failed",
      status: 503,
    });
  });
});
