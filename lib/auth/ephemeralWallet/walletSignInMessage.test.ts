// FILE: lib/auth/ephemeralWallet/walletSignInMessage.test.ts

import { describe, expect, it } from "vitest";
import { buildEphemeralWalletSignInMessage } from "./message";
import { WALLET_SIGN_IN_MESSAGE_HEADER } from "./protocolEnvelope";

describe("buildEphemeralWalletSignInMessage", () => {
  const base = {
    domain: "abraxasworld.xyz",
    walletAddress: "Abcd1234WalletAddressExample111111111111",
    uri: "https://abraxasworld.xyz/account/applications",
    solanaNetwork: "devnet",
    nonce: "nonce123",
    issuedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-01T00:05:00.000Z",
    challengeId: "ewch_test_challenge",
    origin: "https://abraxasworld.xyz",
  };

  it("places human reassurance before the authorization record", () => {
    const message = buildEphemeralWalletSignInMessage(base);
    const lines = message.split("\n");
    expect(lines[0]).toBe(WALLET_SIGN_IN_MESSAGE_HEADER);
    expect(message.indexOf("No funds will move.")).toBeLessThan(message.indexOf("Authorization record"));
    expect(message.indexOf("No spending permission is requested.")).toBeLessThan(
      message.indexOf("Protocol ID:"),
    );
    expect(message).toContain("Verify control of your wallet to sign in to Abraxas.");
    expect(message).toContain("Requested by: abraxasworld.xyz");
    expect(message).toContain("abraxas_wallet_sign_in_v1");
    expect(message).toContain(`Request ID: ${base.challengeId}`);
  });
});
