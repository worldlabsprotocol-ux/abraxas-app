// FILE: lib/partner/walletStandard/bind.ts
// Consume a challenge and issue an opaque tenant-scoped binding ref.

import type { WalletStandardBindView, WalletStandardSafeReason } from "@/lib/partner/walletStandard/contract";
import { WalletStandardStoreUnavailableError } from "@/lib/partner/walletStandard/errors";
import {
  hashActionContractNonce,
  hashChallengeMessage,
  hashWalletOrigin,
} from "@/lib/partner/walletStandard/hashes";
import {
  bindingRefFromHash,
  consumeWalletChallenge,
  getWalletChallenge,
  getWalletChallengeById,
  hashWalletPublicKey,
  insertWalletBinding,
} from "@/lib/partner/walletStandard/store";
import { decodeWalletKeyMaterial, verifyWalletStandardSignature } from "@/lib/partner/walletStandard/verify";

export async function bindWalletStandard(input: {
  challengeId: string;
  origin: string;
  partnerId: string;
  actionContractNonce: string;
  message: string;
  signature: string;
  publicKey: string;
  now?: Date;
}): Promise<WalletStandardBindView> {
  const fail = (status: WalletStandardSafeReason): WalletStandardBindView => ({
    ok: false,
    status,
    binding_ref: null,
    expires_at: null,
  });

  try {
    const partnerId = input.partnerId.trim();
    const origin = input.origin.trim();
    const actionContractNonce = input.actionContractNonce.trim();
    const message = input.message;
    if (!partnerId || !actionContractNonce || !input.challengeId.trim() || !message) {
      return fail("invalid");
    }

    const scoped = await getWalletChallenge(input.challengeId, partnerId);
    if (!scoped) {
      const other = await getWalletChallengeById(input.challengeId);
      if (other) return fail("cross_partner");
      return fail("invalid");
    }

    if (scoped.origin_hash !== hashWalletOrigin(origin)) return fail("wrong_origin");
    if (scoped.action_contract_nonce_hash !== hashActionContractNonce(partnerId, actionContractNonce)) {
      return fail("mismatched");
    }
    if (scoped.message_hash !== hashChallengeMessage(message)) return fail("invalid");
    const now = input.now ?? new Date();
    if (Date.parse(scoped.expires_at) <= now.getTime()) return fail("expired");
    if (scoped.revoked_at) return fail("invalid");
    if (scoped.consumed_at) return fail("replayed");

    if (!verifyWalletStandardSignature({
      message,
      signature: input.signature,
      publicKey: input.publicKey,
    })) {
      return fail("invalid_signature");
    }

    const pub = decodeWalletKeyMaterial(input.publicKey);
    if (!pub) return fail("invalid");

    const consumed = await consumeWalletChallenge(scoped.challenge_id, partnerId);
    if (!consumed.ok) {
      if (consumed.code === "replayed" || consumed.code === "expired" || consumed.code === "revoked") {
        return fail(consumed.code);
      }
      return fail("invalid");
    }

    const pubkeyHash = hashWalletPublicKey(partnerId, pub);
    const bindingRef = bindingRefFromHash(pubkeyHash);
    await insertWalletBinding({
      binding_ref: bindingRef,
      partner_id: partnerId,
      action_contract_nonce_hash: consumed.action_contract_nonce_hash,
      pubkey_hash: pubkeyHash,
      origin_hash: consumed.origin_hash,
      expires_at: consumed.expires_at,
    });

    return {
      ok: true,
      status: "bound",
      binding_ref: bindingRef,
      expires_at: consumed.expires_at,
    };
  } catch (error) {
    if (error instanceof WalletStandardStoreUnavailableError) {
      return fail("store_unavailable");
    }
    throw error;
  }
}
