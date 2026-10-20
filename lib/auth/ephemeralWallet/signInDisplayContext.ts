// FILE: lib/auth/ephemeralWallet/signInDisplayContext.ts

import { WALLET_SIGN_IN_FUNDS_LINES } from "./walletMessageSafetyCopy";

export type WalletSignInChallengeDisplay = {
  kind: "wallet_sign_in";
  action_title: string;
  summary: string;
  funds_lines: readonly string[];
  requested_by: string;
  wallet_address: string;
  expires_at: string;
  challenge_id: string;
};

export function buildWalletSignInChallengeDisplay(input: {
  domain: string;
  walletAddress: string;
  expiresAt: string;
  challengeId: string;
}): WalletSignInChallengeDisplay {
  return {
    kind: "wallet_sign_in",
    action_title: "Abraxas wallet sign-in",
    summary: "Verify control of your wallet to sign in to Abraxas.",
    funds_lines: WALLET_SIGN_IN_FUNDS_LINES,
    requested_by: input.domain,
    wallet_address: input.walletAddress,
    expires_at: input.expiresAt,
    challenge_id: input.challengeId,
  };
}
