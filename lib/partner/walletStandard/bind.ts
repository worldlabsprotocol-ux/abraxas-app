// FILE: lib/partner/walletStandard/bind.ts
// Consume a challenge and issue an opaque tenant-scoped binding ref.

import { buildWalletStandardMessage } from "@/lib/partner/walletStandard/challenge";
import type { WalletStandardBindView, WalletStandardSafeReason } from "@/lib/partner/walletStandard/contract";
import {
  bindingRefFromHash,
  consumeWalletChallenge,
  getWalletChallenge,
  hashWalletPublicKey,
  putWalletBinding,
} from "@/lib/partner/walletStandard/store";
import { decodeWalletKeyMaterial, verifyWalletStandardSignature } from "@/lib/partner/walletStandard/verify";

export function bindWalletStandard(input: {
  challengeId: string;
  origin: string;
  partnerId: string;
  actionContractNonce: string;
  signature: string;
  publicKey: string;
  now?: Date;
}): WalletStandardBindView {
  const fail = (status: WalletStandardSafeReason): WalletStandardBindView => ({
    ok: false,
    status,
    binding_ref: null,
    expires_at: null,
  });

  const challenge = getWalletChallenge(input.challengeId);
  if (!challenge) return fail("invalid");
  if (challenge.consumed) return fail("replayed");
  if (challenge.partner_id !== input.partnerId.trim()) return fail("cross_partner");
  if (challenge.action_contract_nonce !== input.actionContractNonce.trim()) return fail("mismatched");
  if (challenge.origin !== input.origin.trim()) return fail("wrong_origin");
  const now = input.now ?? new Date();
  if (Date.parse(challenge.expires_at) <= now.getTime()) return fail("expired");

  const message = buildWalletStandardMessage({
    origin: challenge.origin,
    partnerId: challenge.partner_id,
    actionContractNonce: challenge.action_contract_nonce,
    nonce: challenge.nonce,
    expiresAt: challenge.expires_at,
  });
  if (!verifyWalletStandardSignature({
    message,
    signature: input.signature,
    publicKey: input.publicKey,
  })) {
    return fail("invalid_signature");
  }

  const pub = decodeWalletKeyMaterial(input.publicKey);
  if (!pub) return fail("invalid");

  const consumed = consumeWalletChallenge(challenge.challenge_id);
  if (!consumed) return fail("replayed");

  const pubkeyHash = hashWalletPublicKey(challenge.partner_id, pub);
  const bindingRef = bindingRefFromHash(pubkeyHash);
  putWalletBinding({
    binding_ref: bindingRef,
    partner_id: challenge.partner_id,
    action_contract_nonce: challenge.action_contract_nonce,
    pubkey_hash: pubkeyHash,
    origin: challenge.origin,
    expires_at: challenge.expires_at,
    consumed: false,
  });

  return {
    ok: true,
    status: "bound",
    binding_ref: bindingRef,
    expires_at: challenge.expires_at,
  };
}
