// FILE: lib/product/userFacingTerminology.test.ts

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { TERM_CHECK_PROOF, TERM_CREATE_TEST_APP, TERM_TEST_WORKSPACE } from "./userFacingTerminology";

const ROOT = resolve(__dirname, "../..");

describe("user-facing terminology (Build 882)", () => {
  it("uses approved action labels", () => {
    expect(TERM_TEST_WORKSPACE).toBe("Test workspace");
    expect(TERM_CREATE_TEST_APP).toBe("Create your test app");
    expect(TERM_CHECK_PROOF).toBe("Check your proof");
  });

  it("avoids ephemeral sandbox in public workspace eyebrow copy", () => {
    const copy = readFileSync(resolve(ROOT, "lib/developers/ephemeralWorkspaceCopy.ts"), "utf8");
    expect(copy).toContain("TERM_TEST_WORKSPACE");
    expect(copy).not.toMatch(/EPHEMERAL_WORKSPACE_PAGE_EYEBROW = "Sandbox"/);
  });
});
