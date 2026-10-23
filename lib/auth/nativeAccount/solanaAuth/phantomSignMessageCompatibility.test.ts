// FILE: lib/auth/nativeAccount/solanaAuth/phantomSignMessageCompatibility.test.ts

import { describe, expect, it } from "vitest";
import { parseSignInMessageText } from "@solana/wallet-standard-util";
import { WALLET_SIGN_IN_MESSAGE_HEADER } from "@/lib/auth/ephemeralWallet/protocolEnvelope";
import { buildEphemeralWalletSignInMessage } from "@/lib/auth/ephemeralWallet/message";
import {
  ACCOUNT_SOL_AUTH_INTENT,
  NATIVE_ACCOUNT_SIGN_IN_RESOURCE,
  NATIVE_ACCOUNT_WALLET_AUDIENCE,
} from "./contract";
import { buildAccountSolanaSignInMessage, encodeAccountSolanaSignInMessage } from "./message";

const fixture = {
  domain: "demo.abraxasworld.xyz",
  walletAddress: "11111111111111111111111111111112",
  uri: "https://demo.abraxasworld.xyz/account/applications",
  solanaNetwork: "devnet",
  nonce: "aB3xY9zQ1",
  issuedAt: "2026-10-23T13:43:00.000Z",
  expiresAt: "2026-10-23T13:48:00.000Z",
  requestId: "asac_test_request",
  origin: "https://demo.abraxasworld.xyz",
};

describe("native account sign-in message (Phantom signMessage boundary)", () => {
  it("does not use SIWS header that triggers Phantom strict SIWS validation", () => {
    const native = buildAccountSolanaSignInMessage(fixture);
    expect(native).not.toContain("wants you to sign in with your Solana account");
    expect(parseSignInMessageText(native)).toBeNull();
    expect(native.startsWith(WALLET_SIGN_IN_MESSAGE_HEADER)).toBe(true);
  });

  it("matches ephemeral Abraxas envelope shape (known-good with Phantom plain signMessage)", () => {
    const native = buildAccountSolanaSignInMessage(fixture);
    const ephemeral = buildEphemeralWalletSignInMessage({
      ...fixture,
      challengeId: fixture.requestId,
    });
    expect(parseSignInMessageText(ephemeral)).toBeNull();
    expect(native).toContain(`Audience: ${NATIVE_ACCOUNT_WALLET_AUDIENCE}`);
    expect(native).toContain(`Operation: ${ACCOUNT_SOL_AUTH_INTENT}`);
    expect(native).toContain(`Resource: ${NATIVE_ACCOUNT_SIGN_IN_RESOURCE}`);
    expect(ephemeral).toContain("abraxas_ephemeral_wallet");
  });

  it("encodes stable UTF-8 bytes for server verification", () => {
    const message = buildAccountSolanaSignInMessage(fixture);
    const bytes = encodeAccountSolanaSignInMessage(message);
    expect(bytes).toEqual(new TextEncoder().encode(message));
    expect(new TextDecoder().decode(bytes)).toBe(message);
  });
});
