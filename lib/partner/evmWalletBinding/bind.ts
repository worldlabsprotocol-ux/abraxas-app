// FILE: lib/partner/evmWalletBinding/bind.ts
// Consume a challenge and issue an opaque tenant-scoped binding ref.

import type { EvmWalletBindView, EvmWalletSafeReason } from "@/lib/partner/evmWalletBinding/contract";
import { EvmWalletStoreUnavailableError } from "@/lib/partner/evmWalletBinding/errors";
import {
  createEvmWalletBindingRef,
  hashEvmAction,
  hashEvmActionContractNonce,
  hashEvmChallengeMessage,
  hashEvmNetwork,
  hashEvmOrigin,
  hashEvmPolicy,
  hashEvmAddress,
} from "@/lib/partner/evmWalletBinding/hashes";
import {
  consumeEvmWalletChallenge,
  getEvmWalletChallenge,
  getEvmWalletChallengeById,
  insertEvmWalletBinding,
} from "@/lib/partner/evmWalletBinding/store";
import { recoverEvmSignedAddress } from "@/lib/partner/evmWalletBinding/verify";

export async function bindEvmWalletControl(input: {
  challengeId: string;
  origin: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  actionType: string;
  actionScope: string;
  networkId: string;
  actionContractNonce: string;
  message: string;
  signature: string;
  now?: Date;
}): Promise<EvmWalletBindView> {
  const fail = (status: EvmWalletSafeReason): EvmWalletBindView => ({
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

    const scoped = await getEvmWalletChallenge(input.challengeId, partnerId);
    if (!scoped) {
      const other = await getEvmWalletChallengeById(input.challengeId);
      if (other) return fail("cross_partner");
      return fail("invalid");
    }

    if (scoped.origin_hash !== hashEvmOrigin(origin)) return fail("wrong_origin");
    if (scoped.action_contract_nonce_hash !== hashEvmActionContractNonce(partnerId, actionContractNonce)) {
      return fail("mismatched");
    }
    if (scoped.policy_hash !== hashEvmPolicy(partnerId, input.policyId, input.policyVersion)) {
      return fail("mismatched");
    }
    if (scoped.action_hash !== hashEvmAction(partnerId, input.actionType, input.actionScope)) {
      return fail("mismatched");
    }
    if (scoped.network_hash !== hashEvmNetwork(partnerId, input.networkId)) {
      return fail("mismatched");
    }
    if (scoped.message_hash !== hashEvmChallengeMessage(message)) return fail("invalid");
    const now = input.now ?? new Date();
    if (Date.parse(scoped.expires_at) <= now.getTime()) return fail("expired");
    if (scoped.revoked_at) return fail("invalid");
    if (scoped.consumed_at) return fail("replayed");

    const recovered = await recoverEvmSignedAddress({
      message,
      signature: input.signature,
    });
    if (!recovered) return fail("invalid_signature");

    const consumed = await consumeEvmWalletChallenge(scoped.challenge_id, partnerId);
    if (!consumed.ok) {
      if (consumed.code === "replayed" || consumed.code === "expired" || consumed.code === "revoked") {
        return fail(consumed.code);
      }
      return fail("invalid");
    }

    const addressHash = hashEvmAddress(partnerId, recovered);
    const bindingRef = createEvmWalletBindingRef();
    await insertEvmWalletBinding({
      binding_ref: bindingRef,
      partner_id: partnerId,
      address_hash: addressHash,
      origin_hash: consumed.origin_hash,
      policy_hash: consumed.policy_hash,
      action_hash: consumed.action_hash,
      network_hash: consumed.network_hash,
      action_contract_nonce_hash: consumed.action_contract_nonce_hash,
      expires_at: consumed.expires_at,
      reason_class: "bound",
    });

    return {
      ok: true,
      status: "bound",
      binding_ref: bindingRef,
      expires_at: consumed.expires_at,
    };
  } catch (error) {
    if (error instanceof EvmWalletStoreUnavailableError) {
      return fail("store_unavailable");
    }
    throw error;
  }
}
