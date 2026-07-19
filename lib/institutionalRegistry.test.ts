// FILE: lib/institutionalRegistry.test.ts

import { describe, expect, it } from "vitest";
import { REGISTRY_INSTITUTIONAL_BODY, VERIFY_SHOWCASE_BODY } from "./institutionalRegistry";

describe("institutionalRegistry", () => {
  it("clarifies registry is not auto-public listing", () => {
    expect(REGISTRY_INSTITUTIONAL_BODY.toLowerCase()).toContain("do not auto-publish");
  });

  it("frames verify showcase as infrastructure not marketplace", () => {
    expect(VERIFY_SHOWCASE_BODY.toLowerCase()).toContain("not a listing board");
  });
});
