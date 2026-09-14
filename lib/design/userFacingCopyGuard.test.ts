// FILE: lib/design/userFacingCopyGuard.test.ts

import { describe, expect, it } from "vitest";
import { scanUserFacingCopy } from "./userFacingCopyGuard";

describe("userFacingCopyGuard", () => {
  it("has no forbidden dash punctuation in customer journey copy", () => {
    const violations = scanUserFacingCopy();
    if (violations.length > 0) {
      const sample = violations
        .slice(0, 12)
        .map((v) => `${v.file}:${v.line} [${v.reason}] ${v.text.slice(0, 80)}`)
        .join("\n");
      expect.fail(`Found ${violations.length} copy violations:\n${sample}`);
    }
    expect(violations).toEqual([]);
  });
});
