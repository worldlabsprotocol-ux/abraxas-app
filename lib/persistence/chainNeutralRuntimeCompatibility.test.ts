// FILE: lib/persistence/chainNeutralRuntimeCompatibility.test.ts
// Proves pre-migration Production cannot authorize chain-neutral identity or issue credentials.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { identityVerificationOrFilter } from "@/lib/idv/holderIdentityRef";
import { issueIdentityCredential } from "@/lib/idv/issueIdentityCredential";

const HS = "abx_hs_00000000000000000000000000000001";

vi.mock("@/lib/persistence/chainNeutralSchemaReady", () => ({
  chainNeutralIdentitySchemaReady: vi.fn().mockResolvedValue(false),
}));

describe("chain-neutral runtime without migration 136", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("omits holder_subject_id from PostgREST filters when column unavailable", () => {
    const filter = identityVerificationOrFilter(HS, { includeHolderSubjectColumn: false });
    expect(filter).not.toContain("holder_subject_id");
    expect(filter).toContain(`wallet_address.eq.${HS}`);
  });

  it("refuses credential issuance for chain-neutral holders", async () => {
    const result = await issueIdentityCredential(HS, { id: "decision-1", status: "approved" });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("chain_neutral_schema_unavailable");
  });
});
