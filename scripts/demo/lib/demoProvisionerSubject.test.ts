// FILE: scripts/demo/lib/demoProvisionerSubject.test.ts

import { describe, expect, it } from "vitest";
import {
  assertProvisionIdFormat,
  deriveSubjectIdFromProvisionId,
  isValidProvisionId,
} from "./demoProvisionerSubject";

describe("demoProvisionerSubject", () => {
  const provisionId = "11111111-1111-4111-8111-111111111111";

  it("validates UUID v4 format", () => {
    expect(isValidProvisionId(provisionId)).toBe(true);
    expect(isValidProvisionId("not-a-uuid")).toBe(false);
    expect(isValidProvisionId("11111111-1111-3111-8111-111111111111")).toBe(false);
  });

  it("derives a deterministic normalized Sui address", () => {
    const first = deriveSubjectIdFromProvisionId(provisionId);
    const second = deriveSubjectIdFromProvisionId(provisionId);
    expect(first).toBe(second);
    expect(first.startsWith("0x")).toBe(true);
    expect(first.length).toBe(66);
  });

  it("assertProvisionIdFormat lowercases input", () => {
    expect(assertProvisionIdFormat(provisionId.toUpperCase())).toBe(provisionId);
  });
});
