import { describe, expect, it } from "vitest";
import {
  resolveWalletControlPresentationStage,
  mapPartnerVerifyPhaseToPresentationStage,
} from "./holderPresentationStage";

describe("holderPresentationStage", () => {
  it("orders wallet_control stages", () => {
    expect(
      resolveWalletControlPresentationStage({
        methodQualified: false,
        showConsent: false,
        flowComplete: false,
      }),
    ).toBe("wallet");
    expect(
      resolveWalletControlPresentationStage({
        methodQualified: true,
        showConsent: false,
        flowComplete: false,
      }),
    ).toBe("authorization");
    expect(
      resolveWalletControlPresentationStage({
        methodQualified: true,
        showConsent: true,
        flowComplete: false,
      }),
    ).toBe("decision");
    expect(
      resolveWalletControlPresentationStage({
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
