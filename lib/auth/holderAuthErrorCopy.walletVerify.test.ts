// FILE: lib/auth/holderAuthErrorCopy.walletVerify.test.ts

import { describe, expect, it } from "vitest";
import { describeWalletVerifyRecoveryCode } from "./holderAuthErrorCopy";

describe("describeWalletVerifyRecoveryCode", () => {
  it("maps session context mismatch to retry guidance", () => {
    expect(describeWalletVerifyRecoveryCode("session_context_mismatch")).toContain("Try signing again");
  });

  it("maps wallet interruption codes without requiring refresh", () => {
    expect(describeWalletVerifyRecoveryCode("aborted")).toContain("without refreshing");
    expect(describeWalletVerifyRecoveryCode("timeout")).toContain("did not respond");
  });

  it("maps verify failures separately from connection failures", () => {
    expect(describeWalletVerifyRecoveryCode("verify_failed", "verify")).toContain("verify");
    expect(describeWalletVerifyRecoveryCode("connect_succeeded_without_public_key", "connect")).toContain("address");
  });
});
