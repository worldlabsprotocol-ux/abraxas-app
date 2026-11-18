import "server-only";

import { PublicKey } from "@solana/web3.js";
import type { NextRequest } from "next/server";
import {
  assertEphemeralWalletAuthOperational,
  mapEphemeralStoreError,
} from "@/lib/auth/ephemeralWallet/apiGate";
import {
  resolvePassportWalletRequestOrigin,
  assertPassportWalletSameOriginRequest,
} from "@/lib/auth/passportWalletAuth/origin";
import {
  requireEphemeralWalletScope,
  type EphemeralWalletSession,
} from "@/lib/auth/ephemeralWallet/walletSession";
import { readWalletSolAuthContextCookie } from "@/lib/auth/ephemeralWallet/service";
import { verifyWalletActionAuthorization } from "@/lib/auth/ephemeralWallet/actionAuth";
import { launchpadError } from "@/lib/partner/launchpad/apiHelpers";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";

export type HolderWalletGateResult =
  | { ok: true; holderWallet: string; session: EphemeralWalletSession }
  | { ok: false; response: ReturnType<typeof launchpadError> };

function normalizeHolderWallet(value: string): string | null {
  try {
    return new PublicKey(value.trim()).toBase58();
  } catch {
    return null;
  }
}

export async function requireBlockchainNativeHolderWallet(
  req: NextRequest,
  input: {
    claimedHolderWallet?: string;
    requireActionAuthorization?: boolean;
    actionChallengeId?: string;
    actionSignature?: string;
    applicationId: string;
    policyId: string;
  },
): Promise<HolderWalletGateResult> {
  const operational = await assertEphemeralWalletAuthOperational();
  if (operational) return { ok: false, response: operational };

  const origin = resolvePassportWalletRequestOrigin(req);
  if (!assertPassportWalletSameOriginRequest(req, origin)) {
    return { ok: false, response: launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 403, "wrong_origin") };
  }

  const auth = await requireEphemeralWalletScope(req, "wallet:session");
  if (!auth.ok) {
    const status = auth.status === 503 ? 503 : auth.status === 403 ? 403 : 401;
    return { ok: false, response: launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, status, auth.error) };
  }

  const sessionWallet = normalizeHolderWallet(auth.session.walletAddress);
  if (!sessionWallet) {
    return { ok: false, response: launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 401, "wallet_session_invalid") };
  }

  if (input.claimedHolderWallet) {
    const claimed = normalizeHolderWallet(input.claimedHolderWallet);
    if (!claimed || claimed !== sessionWallet) {
      return { ok: false, response: launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 403, "holder_wallet_mismatch") };
    }
  }

  if (input.requireActionAuthorization) {
    const sessionContext = readWalletSolAuthContextCookie(req);
    const challengeId = input.actionChallengeId?.trim();
    const signature = input.actionSignature?.trim();
    if (!sessionContext || !challengeId || !signature) {
      return {
        ok: false,
        response: launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 403, "action_authorization_required"),
      };
    }
    const resource = `abraxas:launchpad:${input.applicationId}:blockchain-native`;
    try {
      const authorized = await verifyWalletActionAuthorization({
        challengeId,
        walletAddress: sessionWallet,
        solanaNetwork: auth.session.solanaNetwork,
        signature,
        sessionContext,
        requestOrigin: origin,
        expectedOperation: "sandbox:verification:test",
        expectedResource: resource,
        expectedPolicyId: input.policyId,
      });
      if (!authorized.ok) {
        return { ok: false, response: launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 403, authorized.code) };
      }
    } catch (error) {
      const mapped = mapEphemeralStoreError(error);
      if (mapped) return { ok: false, response: mapped };
      throw error;
    }
  }

  return { ok: true, holderWallet: sessionWallet, session: auth.session };
}