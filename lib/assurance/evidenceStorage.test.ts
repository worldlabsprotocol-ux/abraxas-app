// FILE: lib/assurance/evidenceStorage.test.ts

import { describe, expect, it } from "vitest";
import { isMissingRelationError } from "./evidenceStorage";

describe("evidenceStorage", () => {
  it("detects missing age_evidence_records table errors", () => {
    expect(isMissingRelationError('relation "public.age_evidence_records" does not exist')).toBe(true);
    expect(isMissingRelationError("Could not find the table 'public.age_evidence_records' in the schema cache")).toBe(true);
  });

  it("does not treat unrelated errors as missing table", () => {
    expect(isMissingRelationError("permission denied")).toBe(false);
    expect(isMissingRelationError(undefined)).toBe(false);
  });
});
