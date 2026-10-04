// FILE: lib/partner/holderExperience/presentation.test.ts

import { describe, expect, it } from "vitest";
import { buildHolderRequestBrief } from "./brief";
import {
  buildHolderVerificationPresentation,
  humanizeCurrentValidity,
  humanizeHolderResult,
  humanizeInvalidityReason,
  primarySurfaceFreeOfJargon,
} from "./presentation";
import { holderCopyLeaks } from "./recovery";

describe("holder verification presentation", () => {
  it("humanizes wallet_control and age_eligible_21 result families", () => {
    expect(humanizeHolderResult("wallet_control_confirmed")).toBe("Wallet control confirmed");
    expect(humanizeHolderResult("age_eligible_21")).toBe("Age requirement met");
    expect(humanizeHolderResult("unknown_custom_result")).toBe("Unknown Custom Result");
  });

  it("humanizes current validity states", () => {
    expect(humanizeCurrentValidity(true)).toBe("Current");
    expect(humanizeCurrentValidity(false)).toBe("No longer valid");
    expect(humanizeInvalidityReason("receipt_revoked")).toBe("Proof was revoked");
  });

  it("builds wallet_control holder presentation with privacy boundary", () => {
    const brief = buildHolderRequestBrief({
      partnerName: "Post-Revocation Wallet Control Proof",
      partnerId: "ref-wc-postrev-5ffe",
      policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
      environment: "sandbox",
    });
    const view = buildHolderVerificationPresentation({
      partnerName: "Post-Revocation Wallet Control Proof",
      policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
      brief,
    });

    expect(view.theyReceive).toBe("Wallet control confirmed");
    expect(view.primaryQuestion.toLowerCase()).toContain("wallet");
    expect(view.staysPrivate.join(" ").toLowerCase()).toContain("wallet address");
    expect(view.staysPrivate.join(" ").toLowerCase()).toContain("other connected wallets");
    expect(view.proofSource?.toLowerCase()).toContain("wallet");
    expect(view.isSandbox).toBe(true);
    expect(view.technical.resultFamily).toBe("wallet_control_confirmed");
  });

  it("builds age_21 holder presentation without wallet privacy overclaims", () => {
    const brief = buildHolderRequestBrief({
      partnerId: "acme-sandbox",
      policyId: "acme-age_21_retail-v1",
      purpose: "purchase",
      environment: "sandbox",
    });
    const view = buildHolderVerificationPresentation({
      partnerName: "Acme Shop",
      policyId: "acme-age_21_retail-v1",
      brief,
      purpose: "purchase",
    });

    expect(view.theyReceive).toBe("Age requirement met");
    expect(view.staysPrivate.join(" ").toLowerCase()).toContain("date of birth");
    expect(view.staysPrivate.join(" ").toLowerCase()).not.toContain("wallet address");
    expect(view.staysPrivate.join(" ").toLowerCase()).not.toContain("other connected");
  });

  it("keeps primary surface free of protocol jargon", () => {
    const brief = buildHolderRequestBrief({
      partnerId: "ref-wc-postrev-5ffe",
      policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
      environment: "sandbox",
    });
    const view = buildHolderVerificationPresentation({
      partnerName: "Demo Partner",
      policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
      brief,
    });
    const primary = [
      view.requesterName,
      view.primaryQuestion,
      view.theyReceive,
      ...view.staysPrivate,
      view.proofSource ?? "",
      view.sandboxDetail,
    ].join(" ");

    expect(primarySurfaceFreeOfJargon(primary)).toBe(true);
    expect(holderCopyLeaks(primary)).toEqual([]);
  });
});
