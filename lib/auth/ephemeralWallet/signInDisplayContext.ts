// FILE: lib/auth/ephemeralWallet/signInDisplayContext.ts

import { WALLET_MESSAGE_ONLY_FUNDS_LINES } from "./walletMessageSafetyCopy";

export type WalletSignInChallengeDisplay = {
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
    action_title: "Abraxas wallet sign-in",
    summary: "Verify control of your wallet",
    funds_lines: WALLET_MESSAGE_ONLY_FUNDS_LINES,
    requested_by: input.domain,
    wallet_address: input.walletAddress,
    expires_at: input.expiresAt,
    challenge_id: input.challengeId,
  };
}
