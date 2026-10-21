// FILE: lib/partner/holderExperience/opening.walletControl.test.ts

import { describe, expect, it } from "vitest";
import { buildHolderRequestBrief } from "./brief";
import { buildHolderOpeningPresentation } from "./opening";

describe("wallet_control holder opening", () => {
  it("uses concise wallet-control copy without passport onboarding noise", () => {
    const brief = buildHolderRequestBrief({
      partnerName: "Demo App",
      policyId: "demo-wallet_control-v1",
    });
    const opening = buildHolderOpeningPresentation({
      partnerName: "Demo App",
      policyId: "demo-wallet_control-v1",
      brief,
    });
    expect(opening.headline).toBe("Verify wallet control");
    expect(opening.requestReason).toContain("control the wallet");
    expect(opening.footerNotes.join(" ")).not.toMatch(/Google|liveness|Passport/i);
    expect(opening.footerNotes[0]).toContain("message signature");
  });
});
