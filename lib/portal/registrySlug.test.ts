// FILE: lib/portal/registrySlug.test.ts

import { describe, expect, it } from "vitest";
import { generateOwnerRegistrySlug, registrySlugPrefix } from "./registrySlug";

describe("registrySlug", () => {
  it("uses class-specific prefix", () => {
    expect(registrySlugPrefix("REAL_ESTATE_LAND")).toBe("LAND");
    expect(registrySlugPrefix("BUSINESS_ENTITY")).toBe("BIZ");
  });

  it("generates stable ABX slug from application id", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(generateOwnerRegistrySlug("REAL_ESTATE_LAND", id)).toBe("ABX-LAND-A1B2C3D4");
    expect(generateOwnerRegistrySlug("BUSINESS_ENTITY", id)).toBe("ABX-BIZ-A1B2C3D4");
  });
});
