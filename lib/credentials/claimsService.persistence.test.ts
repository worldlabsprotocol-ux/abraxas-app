// FILE: lib/credentials/claimsService.persistence.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletPersistenceError } from "@/lib/credentials/walletPersistenceErrors";

const mockRequireSupabaseAdmin = vi.fn();
const mockAppendAuditEvent = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => mockRequireSupabaseAdmin(),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: (...args: unknown[]) => mockAppendAuditEvent(...args),
}));

import { upsertClaims, upsertWalletBinding } from "./claimsService";
import { walletBindingClaim, CLAIM_ISSUERS } from "./claimSchema";

const SUBJECT = "0x" + "b".repeat(64);

describe("claimsService persistence errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendAuditEvent.mockResolvedValue("audit-1");
  });

  it("throws when wallet binding upsert fails", async () => {
    mockRequireSupabaseAdmin.mockReturnValue({
      from: () => ({
        upsert: async () => ({ error: { message: "db down" } }),
      }),
    });

    await expect(upsertWalletBinding(SUBJECT, SUBJECT, "zklogin"))
      .rejects
      .toBeInstanceOf(WalletPersistenceError);
  });

  it("inserts claim before expiring prior active claims", async () => {
    const calls: string[] = [];
    mockRequireSupabaseAdmin.mockReturnValue({
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => {
              calls.push("insert");
              return { data: { id: "claim-new" }, error: null };
            },
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                neq: async () => {
                  calls.push("expire");
                  return { error: null };
                },
              }),
            }),
          }),
        }),
      }),
    });

    const claim = walletBindingClaim({ subjectId: SUBJECT, walletAddress: SUBJECT });
    await upsertClaims([{ ...claim, issuer_id: CLAIM_ISSUERS.abraxas }]);
    expect(calls).toEqual(["insert", "expire"]);
  });
});
