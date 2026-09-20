// FILE: lib/partner/evm/clientVisible.ts
// Strip kit results to allow/deny, reason, action binding, and expiry.

import type { PortableActionClientResult } from "@/lib/partner/portableActionContract/contract";
import {
  type EvmPartnerActionBinding,
  type EvmPartnerActionScope,
  type EvmPartnerActionType,
} from "@/lib/partner/evm/contract";

export interface EvmPartnerClientVisibleResult {
  allowed: boolean;
  reason: PortableActionClientResult["reason"];
  action_binding: EvmPartnerActionBinding;
  expires_at: string | null;
}

export function deniedEvmResult(
  reason: EvmPartnerClientVisibleResult["reason"],
  actionType: EvmPartnerActionType | "rejected",
  actionScope: string,
  nonceState: EvmPartnerActionBinding["nonce_state"],
  expiresAt: string | null = null,
  walletBinding: EvmPartnerActionBinding["wallet_binding"] = "not_attached",
): EvmPartnerClientVisibleResult {
  return {
    allowed: false,
    reason,
    action_binding: {
      action_type: actionType,
      action_scope: actionScope,
      nonce_state: nonceState,
      wallet_binding: walletBinding,
    },
    expires_at: expiresAt,
  };
}

export function permittedEvmResult(
  actionType: EvmPartnerActionType,
  actionScope: EvmPartnerActionScope,
  expiresAt: string,
  walletBinding: EvmPartnerActionBinding["wallet_binding"] = "not_attached",
): EvmPartnerClientVisibleResult {
  return {
    allowed: true,
    reason: "permitted",
    action_binding: {
      action_type: actionType,
      action_scope: actionScope,
      nonce_state: "consumed",
      wallet_binding: walletBinding,
    },
    expires_at: expiresAt,
  };
}

export function toEvmClient(result: PortableActionClientResult): EvmPartnerClientVisibleResult {
  const actionType =
    result.action_binding.action_type === "enable_protocol_access"
    || result.action_binding.action_type === "enable_member_access"
    || result.action_binding.action_type === "enable_redemption_access"
      ? result.action_binding.action_type
      : "rejected";
  if (!result.allowed) {
    return deniedEvmResult(
      result.reason,
      actionType,
      result.action_binding.action_scope,
      result.action_binding.nonce_state,
      result.expires_at,
      result.action_binding.wallet_binding,
    );
  }
  return permittedEvmResult(
    actionType as EvmPartnerActionType,
    result.action_binding.action_scope as EvmPartnerActionScope,
    result.expires_at as string,
    result.action_binding.wallet_binding,
  );
}

export function assertNoSensitiveEvmClientKeys(payload: unknown): string[] {
  const leaks: string[] = [];
  const blob = JSON.stringify(payload ?? null).toLowerCase();
  const needles = [
    "receipt_id",
    "signature_valid",
    "wallet_address",
    "email",
    "legal_name",
    "date_of_birth",
    "dob",
    "profile",
    "claims",
    "evaluated_claim_refs",
    "jwt",
    "id_token",
    "rpc_url",
    "calldata",
    "private_key",
    "infura",
    "alchemy",
    "etherscan",
  ];
  for (const needle of needles) {
    if (needle === "0x") continue;
    if (blob.includes(String(needle).toLowerCase())) leaks.push(String(needle));
  }
  if (/0x[a-f0-9]{20,}/i.test(blob)) leaks.push("hex_address");
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(blob)) leaks.push("email_like");
  return leaks;
}
