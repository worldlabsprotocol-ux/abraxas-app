import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import {
  buildBrowseReturnUrl,
  reuseBrowseSelfAttestation,
} from "./reuseBrowseSelfAttestation";

const HOLDER = normalizeSuiAddress("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");
const RETURN_URL = "https://www.goodtroublecanna.com/browse-verification-result";
const TEST_KEY = generateTestSigningKeyPair();

const getActiveMock = vi.fn();
const getPolicyMock = vi.fn();
const allowlistMock = vi.fn();

vi.mock("./selfAttestationLedger", () => ({
  getActiveSelfAttestations: (...args: unknown[]) => getActiveMock(...args),
}));

vi.mock("@/lib/verification/requestsService", () => ({
  getPolicy: (...args: unknown[]) => getPolicyMock(...args),
}));

vi.mock("@/lib/partner/returnUrlAllowlist", () => ({
  isAllowedPartnerReturnUrl: (...args: unknown[]) => allowlistMock(...args),
}));

describe("reuseBrowseSelfAttestation", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    allowlistMock.mockResolvedValue(true);
    getPolicyMock.mockResolvedValue({
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      rules_json: { browse_access_only: true },
    });
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(TEST_KEY.privateKeyJwk);
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.ABRAXAS_SIGNING_KEY;
  });

  it("reissues browse receipt from valid existing proof without DOB", async () => {
    getActiveMock.mockResolvedValue([{
      age_band: "over_21",
      browse_receipt_id: "br_existing",
      attested_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    }]);

    const result = await reuseBrowseSelfAttestation({
      holderRef: HOLDER,
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      returnUrl: RETURN_URL,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.browse_receipt_id).toBe("br_existing");
    expect(result.browse_receipt).toBeTruthy();
    expect(result.browse_receipt).not.toMatch(/date_of_birth|dob/i);
    const logged = JSON.stringify((console.info as ReturnType<typeof vi.fn>).mock.calls);
    expect(logged).not.toMatch(/date_of_birth|"dob"/i);
  });

  it("does not reuse expired or under-21 proofs", async () => {
    getActiveMock.mockResolvedValueOnce([]);
    expect((await reuseBrowseSelfAttestation({
      holderRef: HOLDER,
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      returnUrl: RETURN_URL,
    })).ok).toBe(false);

    getActiveMock.mockResolvedValueOnce([{
      age_band: "under_21",
      browse_receipt_id: "br_under",
      attested_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    }]);
    expect((await reuseBrowseSelfAttestation({
      holderRef: HOLDER,
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      returnUrl: RETURN_URL,
    })).ok).toBe(false);
  });

  it("builds browse callback URL without exposing DOB", () => {
    const url = buildBrowseReturnUrl(RETURN_URL, {
      browseReceipt: "jwt-token",
      browseReceiptId: "br_existing",
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
    });
    expect(url).toContain("browse_receipt=jwt-token");
    expect(url).toContain(`policy_id=${GOOD_TROUBLE_BROWSE_POLICY_ID}`);
    expect(url).not.toMatch(/date_of_birth|dob=/i);
  });
});
