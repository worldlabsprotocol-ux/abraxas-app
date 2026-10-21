// FILE: lib/auth/passportSolanaAuth/walletControlPersistErrors.test.ts

import { describe, expect, it } from "vitest";
import { WalletPersistenceError } from "@/lib/credentials/walletPersistenceErrors";
import { mapWalletControlPersistFailure } from "./walletControlPersistErrors";
import { describeWalletVerifyRecoveryCode } from "@/lib/auth/holderAuthErrorCopy";

describe("mapWalletControlPersistFailure", () => {
  it("maps missing claim RPC to store unavailable", () => {
    const code = mapWalletControlPersistFailure(
      new WalletPersistenceError(
        "rpc_failed",
        "Wallet control claim RPC failed",
        "Could not find the function public.upsert_wallet_control_claim_atomic",
      ),
    );
    expect(code).toBe("wallet_control_claim_store_unavailable");
  });

  it("maps binding conflict to wallet_bound_to_other_subject", () => {
    expect(
      mapWalletControlPersistFailure(new Error("Wallet already bound to another Passport subject")),
    ).toBe("wallet_bound_to_other_subject");
  });

  it("uses holder-facing copy for verify-phase persist failures", () => {
    const message = describeWalletVerifyRecoveryCode("wallet_control_persist_failed", "verify");
    expect(message).toContain("signature was received");
    expect(message).not.toMatch(/Continue securely/i);
  });
});
