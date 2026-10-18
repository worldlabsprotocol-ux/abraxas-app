// FILE: lib/auth/ephemeralWallet/challengeRecord.ts

import type { WalletAuthorizationPurpose } from "./protocolEnvelope";

export type EphemeralWalletChallengeRecord = {
  challenge_id: string;
  wallet_address: string;
  solana_network: string;
  origin: string;
  uri: string;
  session_context_hash: string;
  nonce: string;
  message: string;
  expires_at: string;
  purpose?: WalletAuthorizationPurpose;
  operation?: string;
  resource?: string;
  policy_id?: string | null;
};
