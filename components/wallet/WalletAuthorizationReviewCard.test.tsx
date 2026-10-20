// FILE: components/wallet/WalletAuthorizationReviewCard.test.tsx
/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  WalletScopedAuthorizationReviewCard,
  WalletSignInReviewCard,
} from "./WalletAuthorizationReviewCard";
import { buildWalletActionChallengeDisplay } from "@/lib/auth/ephemeralWallet/actionDisplayContext";
import { buildWalletSignInChallengeDisplay } from "@/lib/auth/ephemeralWallet/signInDisplayContext";

describe("WalletAuthorizationReviewCard", () => {
  afterEach(() => cleanup());

  it("shows sign-in funds lines only for wallet sign-in", () => {
    const display = buildWalletSignInChallengeDisplay({
      domain: "abraxasworld.xyz",
      walletAddress: "Abcd1234WalletAddressExample111111111111",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      challengeId: "ewch_test",
    });
    render(<WalletSignInReviewCard display={display} />);
    expect(screen.getByText(/This sign-in message only/i)).toBeTruthy();
    expect(screen.getByText(/No funds will move/i)).toBeTruthy();
    expect(screen.queryByText(/What happens afterward/i)).toBeNull();
  });

  it("shows authorization consequence before scoped financial safety", () => {
    const display = buildWalletActionChallengeDisplay({
      operation: "sandbox:verification:test",
      policyId: "wallet_control",
      walletAddress: "Abcd1234WalletAddressExample111111111111",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      challengeId: "ewac_test",
    });
    render(<WalletScopedAuthorizationReviewCard display={display} />);
    expect(screen.getByText(/What happens afterward/i)).toBeTruthy();
    expect(screen.getByText(/Financial safety \(this message\)/i)).toBeTruthy();
    expect(screen.getByText(/Recipient/i)).toBeTruthy();
    expect(screen.queryByText(/No spending permission is requested/i)).toBeNull();
  });
});
