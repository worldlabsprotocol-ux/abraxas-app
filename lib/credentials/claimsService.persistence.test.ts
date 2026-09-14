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

  it("uses atomic replace_credential_claim_atomic RPC for claim replacement", async () => {
    const rpc = vi.fn(async () => ({
      data: { ok: true, claim_id: "claim-new" },
      error: null,
    }));
    mockRequireSupabaseAdmin.mockReturnValue({ rpc });

    const claim = walletBindingClaim({ subjectId: SUBJECT, walletAddress: SUBJECT });
    await upsertClaims([{ ...claim, issuer_id: CLAIM_ISSUERS.abraxas }]);

    expect(rpc).toHaveBeenCalledWith("replace_credential_claim_atomic", expect.objectContaining({
      p_subject_id: SUBJECT,
      p_claim_type: "wallet_binding_confirmed",
    }));
    expect(mockAppendAuditEvent).toHaveBeenCalled();
  });

  it("throws on RPC rejection without recording audit success", async () => {
    mockRequireSupabaseAdmin.mockReturnValue({
      rpc: vi.fn(async () => ({
        data: { ok: false, code: "database_error" },
        error: null,
      })),
    });

    const claim = walletBindingClaim({ subjectId: SUBJECT, walletAddress: SUBJECT });
    await expect(upsertClaims([{ ...claim, issuer_id: CLAIM_ISSUERS.abraxas }]))
      .rejects
      .toBeInstanceOf(WalletPersistenceError);
    expect(mockAppendAuditEvent).not.toHaveBeenCalled();
  });

  it("throws on RPC transport failure without recording audit success", async () => {
    mockRequireSupabaseAdmin.mockReturnValue({
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: "connection reset" },
      })),
    });

    const claim = walletBindingClaim({ subjectId: SUBJECT, walletAddress: SUBJECT });
    await expect(upsertClaims([{ ...claim, issuer_id: CLAIM_ISSUERS.abraxas }]))
      .rejects
      .toMatchObject({ code: "rpc_failed" });
    expect(mockAppendAuditEvent).not.toHaveBeenCalled();
  });
});
