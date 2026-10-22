import { describe, expect, it } from "vitest";
import {
  mapInternalStageToPublicStep,
  resolveWalletControlPresentationStage,
  mapPartnerVerifyPhaseToPresentationStage,
} from "./holderPresentationStage";

describe("holderPresentationStage", () => {
  it("maps internal authorization and decision to public Approve", () => {
    expect(mapInternalStageToPublicStep("authorization")).toBe("approve");
    expect(mapInternalStageToPublicStep("decision")).toBe("approve");
    expect(mapInternalStageToPublicStep("wallet")).toBe("verify_wallet");
  });

  it("orders wallet_control internal stages", () => {
    expect(
      resolveWalletControlPresentationStage({
        reviewAcknowledged: false,
        methodQualified: false,
        showConsent: false,
        flowComplete: false,
      }),
    ).toBe("review");
    expect(
      resolveWalletControlPresentationStage({
        reviewAcknowledged: true,
        methodQualified: false,
        showConsent: false,
        flowComplete: false,
      }),
    ).toBe("wallet");
    expect(
      resolveWalletControlPresentationStage({
        reviewAcknowledged: true,
        methodQualified: true,
        showConsent: true,
        flowComplete: false,
      }),
    ).toBe("decision");
    expect(
      resolveWalletControlPresentationStage({
        reviewAcknowledged: true,
        methodQualified: true,
        showConsent: false,
        flowComplete: true,
      }),
    ).toBe("outcome");
  });

  it("maps verify phases to presentation", () => {
    expect(mapPartnerVerifyPhaseToPresentationStage("sign_in")).toBe("wallet");
    expect(mapPartnerVerifyPhaseToPresentationStage("approved")).toBe("outcome");
  });
});
