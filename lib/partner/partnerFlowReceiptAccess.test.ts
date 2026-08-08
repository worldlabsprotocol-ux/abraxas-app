import { describe, expect, it } from "vitest";
import {
  isPartnerFlowRevocationReason,
  partnerFlowReceiptAccessBlocked,
  partnerFlowRevocationDeniedFields,
} from "@/lib/partner/partnerFlowReceiptAccess";

describe("partner flow receipt access", () => {
  it("blocks access when receipt is revoked", () => {
    expect(partnerFlowReceiptAccessBlocked({
      currently_valid: false,
      invalidation_reasons: ["receipt_revoked"],
    })).toBe(true);
  });

  it("blocks access when underlying claim is revoked", () => {
    expect(isPartnerFlowRevocationReason("claim_revoked")).toBe(true);
    expect(partnerFlowReceiptAccessBlocked({
      currently_valid: false,
      invalidation_reasons: ["claim_revoked"],
    })).toBe(true);
  });

  it("does not block access for expiry-only invalidation", () => {
    expect(partnerFlowReceiptAccessBlocked({
      currently_valid: false,
      invalidation_reasons: ["receipt_expired"],
    })).toBe(false);
  });

  it("returns denied partner flow fields without pii", () => {
    const denied = partnerFlowRevocationDeniedFields({
      currently_valid: false,
      validity: "invalidated",
      invalidation_reasons: ["receipt_revoked"],
    });
    expect(denied.next).toBe("denied");
    expect(denied.currently_valid).toBe(false);
    expect(denied.reason_codes).toEqual(["access_revoked"]);
    expect(JSON.stringify(denied)).not.toContain("@");
    expect(JSON.stringify(denied)).not.toContain("reviewer");
  });
});
