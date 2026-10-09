import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  parseSelfAttestationSyntheticClaimId,
  validateSelfAttestationReceiptDependency,
} from "./receiptDependency";
import { SELF_ATTESTATION_CLAIM_TYPE, SELF_ATTESTATION_ISSUER } from "./constants";

const getByIdMock = vi.fn();

vi.mock("./selfAttestationLedger", () => ({
  getSelfAttestationById: (...args: unknown[]) => getByIdMock(...args),
}));

describe("self-attestation receipt dependencies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses synthetic claim ids", () => {
    expect(parseSelfAttestationSyntheticClaimId("self-attest:abc-123")).toBe("abc-123");
    expect(parseSelfAttestationSyntheticClaimId("claim-fixture")).toBeNull();
  });

  it("accepts active ledger evidence", async () => {
    getByIdMock.mockResolvedValue({
      id: "abc-123",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      revoked_at: null,
    });
    const result = await validateSelfAttestationReceiptDependency({
      claimId: "self-attest:abc-123",
      claimType: SELF_ATTESTATION_CLAIM_TYPE,
      issuerId: SELF_ATTESTATION_ISSUER,
    });
    expect(result.ok).toBe(true);
  });

  it("denies missing ledger rows", async () => {
    getByIdMock.mockResolvedValue(null);
    const result = await validateSelfAttestationReceiptDependency({
      claimId: "self-attest:missing",
      claimType: SELF_ATTESTATION_CLAIM_TYPE,
      issuerId: SELF_ATTESTATION_ISSUER,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("missing_claim");
  });
});
