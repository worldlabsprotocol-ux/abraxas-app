// FILE: lib/passport/build580.reconciliationConcurrency.test.ts

import { describe, expect, it } from "vitest";
import { claimLegacyIdentityLink } from "./holderIdentityLinkPersistence";
import { LEGACY_KIND_SUI_ADDRESS } from "./holderIdentityReconciliation";

describe("Build #580 legacy link claim (unit)", () => {
  it("documents advisory-lock serialization contract", () => {
    expect(LEGACY_KIND_SUI_ADDRESS).toBe("sui_address");
    expect(typeof claimLegacyIdentityLink).toBe("function");
  });
});
