// FILE: lib/persistence/holderIdentityIdvLookup.test.ts

import { describe, expect, it } from "vitest";
import { buildIdentityVerificationCountSql } from "./holderIdentityIdvLookup";

describe("Build #579 identity_verifications count SQL", () => {
  it("legacy schema SQL never references holder_subject_id", () => {
    const sql = buildIdentityVerificationCountSql(false);
    expect(sql).toMatch(/wallet_address/i);
    expect(sql).toMatch(/sui_address/i);
    expect(sql).not.toMatch(/holder_subject_id/i);
  });

  it("migrated schema SQL includes holder_subject_id", () => {
    const sql = buildIdentityVerificationCountSql(true);
    expect(sql).toMatch(/holder_subject_id/i);
  });
});
