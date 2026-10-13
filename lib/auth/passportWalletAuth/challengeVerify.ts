// FILE: lib/auth/passportWalletAuth/challengeVerify.ts

import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { PassportWalletIntendedAction } from "./contract";
import { originsMatch } from "./origin";
import { resolveExpectedSuiNetworkFromEnv } from "./network";
import {
  consumePassportWalletChallenge,
  hashSessionContext,
  PassportWalletAuthStoreUnavailableError,
  type PassportWalletChallengeRow,
} from "./store";
import { verifyPassportWalletPersonalMessage } from "./verifySignature";

function normalizeNetworkKey(network: string): string {
  return network.trim().toLowerCase();
}

export type ConsumedPassportWalletChallenge =
  | { ok: true; row: PassportWalletChallengeRow }
  | { ok: false; code: string };

export async function consumeAndValidatePassportWalletChallenge(input: {
  challengeId: string;
  walletAddress: string;
  suiNetwork: string;
  signature: string;
  sessionContext: string;
  requestOrigin: string;
  expectedIntendedAction?: PassportWalletIntendedAction;
}): Promise<ConsumedPassportWalletChallenge> {
  let wallet: string;
  try {
    wallet = normalizeSuiAddress(input.walletAddress.trim());
  } catch {
    return { ok: false, code: "invalid_input" };
  }

  if (!input.signature?.trim()) {
    return { ok: false, code: "invalid_input" };
  }

  let row;
  try {
    row = await consumePassportWalletChallenge({
      challengeId: input.challengeId.trim(),
      walletAddress: wallet,
      sessionContextHash: hashSessionContext(input.sessionContext),
    });
  } catch (error) {
    if (error instanceof PassportWalletAuthStoreUnavailableError) {
      return { ok: false, code: "store_unavailable" };
    }
    throw error;
  }

  if (!row) {
    return { ok: false, code: "replay" };
  }

  if (new Date(row.expires_at) < new Date()) {
    return { ok: false, code: "expired" };
  }

  if (normalizeSuiAddress(row.wallet_address) !== wallet) {
    return { ok: false, code: "wrong_wallet" };
  }

  if (input.expectedIntendedAction && row.intended_action !== input.expectedIntendedAction) {
    return { ok: false, code: "invalid_input" };
  }

  if (!originsMatch(row.origin, input.requestOrigin)) {
    return { ok: false, code: "wrong_domain" };
  }

  const expectedNetwork = resolveExpectedSuiNetworkFromEnv();
  if (
    normalizeNetworkKey(row.sui_network) !== normalizeNetworkKey(input.suiNetwork)
    && normalizeNetworkKey(row.sui_network) !== normalizeNetworkKey(expectedNetwork)
  ) {
    return { ok: false, code: "wrong_network" };
  }

  const valid = await verifyPassportWalletPersonalMessage({
    message: row.message,
    signature: input.signature,
    walletAddress: wallet,
  });
  if (!valid) {
    return { ok: false, code: "invalid_signature" };
  }

  return { ok: true, row };
}
