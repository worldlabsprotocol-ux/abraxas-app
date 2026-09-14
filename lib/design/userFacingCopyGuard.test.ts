// FILE: lib/design/userFacingCopyGuard.test.ts

import { describe, expect, it } from "vitest";
import { scanStringForCopyViolations, scanUserFacingCopy, scannedFileCount } from "./userFacingCopyGuard";

describe("userFacingCopyGuard", () => {
  it("scans a broad set of user facing source files", () => {
    expect(scannedFileCount()).toBeGreaterThan(80);
  });

  it("flags em dash prose", () => {
    expect(scanStringForCopyViolations("This is premium copy — not acceptable.")).toBe("em_dash");
  });

  it("flags en dash prose", () => {
    expect(scanStringForCopyViolations("Available in beta – contact support.")).toBe("en_dash");
  });

  it("flags sentence punctuation dash", () => {
    expect(scanStringForCopyViolations("Partner Flow is live - read the docs.")).toBe("sentence_hyphen");
  });

  it("flags unnecessary marketing hyphen phrases", () => {
    expect(scanStringForCopyViolations("Private eligibility verification for an age-gated retail experience.")).toBe("sentence_hyphen");
  });

  it("ignores technical identifiers and URLs", () => {
    expect(scanStringForCopyViolations("/docs/partner-flow-api")).toBeNull();
    expect(scanStringForCopyViolations("zkLogin")).toBeNull();
    expect(scanStringForCopyViolations("GET /api/receipts/{receiptId}/public")).toBeNull();
    expect(scanStringForCopyViolations("abraxas_browser_session")).toBeNull();
  });

  it("has no forbidden dash punctuation in sitewide user facing copy", () => {
    const violations = scanUserFacingCopy();
    if (violations.length > 0) {
      const sample = violations
        .slice(0, 20)
        .map((v) => `${v.file}:${v.line} [${v.reason}] ${v.text.slice(0, 80)}`)
        .join("\n");
      expect.fail(`Found ${violations.length} copy violations:\n${sample}`);
    }
    expect(violations).toEqual([]);
  });
});
