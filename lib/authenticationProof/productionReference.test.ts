// FILE: lib/authenticationProof/productionReference.test.ts

import { describe, expect, it } from "vitest";
import {
  isProductionReferenceAsset,
  PRODUCTION_REFERENCE_ASSETS,
} from "./productionReference";

describe("productionReference", () => {
  it("allows Cielo and Chickasaw only", () => {
    expect(isProductionReferenceAsset(PRODUCTION_REFERENCE_ASSETS.cielo.abxId)).toBe(true);
    expect(isProductionReferenceAsset(PRODUCTION_REFERENCE_ASSETS.chickasaw.abxId)).toBe(true);
    expect(isProductionReferenceAsset("ABX-RE-RES-002")).toBe(false);
  });
});
