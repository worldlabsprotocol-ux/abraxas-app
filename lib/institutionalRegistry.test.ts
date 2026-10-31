// FILE: lib/institutionalRegistry.test.ts

import { describe, expect, it } from "vitest";
import { REGISTRY_INSTITUTIONAL_BODY } from "./institutionalRegistry";

describe("institutionalRegistry", () => {
  it("clarifies registry is not auto-public listing", () => {
    expect(REGISTRY_INSTITUTIONAL_BODY.toLowerCase()).toContain("do not auto-publish");
  });
});
