// FILE: lib/auth/ephemeralWallet/actionDisplayContext.test.ts

import { describe, expect, it } from "vitest";
import { resolveWalletActionHumanContext } from "./actionDisplayContext";

describe("resolveWalletActionHumanContext", () => {
  it("maps wallet_control test verification to institutional labels", () => {
    const human = resolveWalletActionHumanContext({
      operation: "sandbox:verification:test",
      policyId: "wallet_control",
    });
    expect(human.actionTitle).toBe("Authorize test verification");
    expect(human.policyLabel).toBe("Wallet Control");
    expect(human.policyId).toBe("wallet_control");
    expect(human.environment).toBe("Sandbox");
  });
});
