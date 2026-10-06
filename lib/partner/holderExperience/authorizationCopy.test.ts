import { describe, expect, it } from "vitest";
import { buildHolderRequestBrief } from "./brief";
import { buildHolderAuthorizationCopy } from "./authorizationCopy";
import { holderCopyLeaks } from "./recovery";
import { primarySurfaceFreeOfJargon } from "./presentation";

describe("buildHolderAuthorizationCopy", () => {
  it("builds concise wallet_control primary copy", () => {
    const brief = buildHolderRequestBrief({
      partnerName: "Post-Revocation Wallet Control Proof",
      partnerId: "ref-wc-postrev-5ffe",
      policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
      environment: "sandbox",
    });
    const copy = buildHolderAuthorizationCopy({
      partnerName: "Post-Revocation Wallet Control Proof",
      policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
      brief,
      proofSource: "Using your existing verified wallet",
    });

    expect(copy.headline).toContain("control a verified wallet");
    expect(copy.supporting.toLowerCase()).toContain("yes or no");
    expect(copy.confirmLabel).toBe("Confirm");
    expect(copy.reuseLine?.toLowerCase()).toContain("existing verified wallet");
    expect(copy.checkingLine.toLowerCase()).toContain("checking your verified wallet");
    expect(copy.successTitle).toBe("Confirmed");
    expect(copy.successSharedLabel).toBe("Wallet control");
    expect(copy.disclosureWithheld.join(" ").toLowerCase()).toContain("wallet address");
    expect(holderCopyLeaks(JSON.stringify(copy))).toEqual([]);
    expect(primarySurfaceFreeOfJargon([
      copy.headline,
      copy.supporting,
      copy.reuseLine ?? "",
      copy.checkingLine,
      copy.successTitle,
    ].join(" "))).toBe(true);
  });

  it("does not expose wallet address in primary copy", () => {
    const brief = buildHolderRequestBrief({
      partnerId: "ref-wc-postrev-5ffe",
      policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
      environment: "sandbox",
    });
    const copy = buildHolderAuthorizationCopy({
      partnerName: "Demo Partner",
      policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
      brief,
    });
    expect(JSON.stringify(copy).toLowerCase()).not.toMatch(/0x[a-f0-9]{6,}/);
    expect(copy.headline.toLowerCase()).not.toContain("wallet_control_confirmed");
  });
});
