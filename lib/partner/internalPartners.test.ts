// FILE: lib/partner/internalPartners.test.ts

import { describe, expect, it } from "vitest";
import { isExternalProductionPartner } from "./internalPartners";
import { SANDBOX_PARTNER_ID } from "./sandboxPartner";

describe("isExternalProductionPartner", () => {
  it("excludes sandbox partner", () => {
    expect(isExternalProductionPartner(SANDBOX_PARTNER_ID)).toBe(false);
  });

  it("includes unaffiliated partner ids", () => {
    expect(isExternalProductionPartner("acme-lending-corp")).toBe(true);
  });

  it("excludes abraxas internal prefixes", () => {
    expect(isExternalProductionPartner("abraxas-pilot")).toBe(false);
  });
});
