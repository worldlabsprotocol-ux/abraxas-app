// FILE: lib/partner/holderExperience/opening.test.ts

import { describe, expect, it } from "vitest";
import { buildHolderRequestBrief } from "@/lib/partner/holderExperience/brief";
import { buildHolderOpeningPresentation } from "@/lib/partner/holderExperience/opening";
import { holderCopyLeaks } from "@/lib/partner/holderExperience/recovery";

describe("buildHolderOpeningPresentation", () => {
  it("builds a plain-language opening without receipt terminology", () => {
    const brief = buildHolderRequestBrief({
      partnerId: "acme-sandbox",
      policyId: "acme-age_21_retail-v1",
      purpose: "purchase",
      environment: "sandbox",
    });
    const opening = buildHolderOpeningPresentation({
      partnerName: "Acme Shop",
      policyId: "acme-age_21_retail-v1",
      brief,
      purpose: "purchase",
    });
    expect(opening.headline).toContain("Acme Shop");
    expect(opening.shared.length).toBeGreaterThan(0);
    expect(opening.withheld.length).toBeGreaterThan(0);
    expect(holderCopyLeaks(JSON.stringify(opening))).toEqual([]);
    expect(JSON.stringify(opening).toLowerCase()).not.toContain("receipt");
  });
});
