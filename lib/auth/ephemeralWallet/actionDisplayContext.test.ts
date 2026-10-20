// FILE: lib/auth/ephemeralWallet/actionDisplayContext.test.ts

import { describe, expect, it } from "vitest";
import {
  buildWalletActionChallengeDisplay,
  resolveWalletActionHumanContext,
} from "./actionDisplayContext";

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
    expect(human.authorizationSummary).toMatch(/Wallet Control/);
    expect(human.recipient).toMatch(/sandbox/i);
    expect(human.consequenceLine).toBeTruthy();
  });

  it("builds server-bound scoped display for UI", () => {
    const display = buildWalletActionChallengeDisplay({
      operation: "sandbox:verification:test",
      policyId: "wallet_control",
      walletAddress: "Abcd1234WalletAddressExample111111111111",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      challengeId: "ewac_ui_test",
    });
    expect(display.kind).toBe("scoped_authorization");
    expect(display.authorization_summary).toMatch(/Wallet Control/);
    expect(display.financial_safety_lines.length).toBe(1);
    expect(display.consequence_line.length).toBeGreaterThan(20);
  });
});
