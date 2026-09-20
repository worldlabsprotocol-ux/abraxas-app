// FILE: lib/partner/portableActionContract/issue.ts
// Server-issued action contracts. Client never supplies partner, policy, or environment.

import type { AbraxasPartnerKit } from "@/lib/partner/integrationKit";
import {
  PORTABLE_ACTION_RECEIPT_REQUIREMENT,
  PORTABLE_ACTION_TYPE_SCOPES,
  isPortableActionScope,
  isPortableActionType,
  isPortableWalletBindingMode,
  type PortableActionContract,
  type PortableActionWalletBindingMode,
} from "./contract";

const DEFAULT_TTL_MS = 15 * 60 * 1000;

export function createActionNonce(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ac_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function issuePortableActionContract(input: {
  kit: AbraxasPartnerKit;
  action_type: string;
  action_scope?: string;
  wallet_binding?: string;
  ttlMs?: number;
  now?: Date;
}): PortableActionContract | { ok: false; reason: "action_mismatch" } {
  if (!isPortableActionType(input.action_type)) {
    return { ok: false, reason: "action_mismatch" };
  }
  const expectedScope = PORTABLE_ACTION_TYPE_SCOPES[input.action_type];
  const actionScope = input.action_scope ?? expectedScope;
  if (!isPortableActionScope(actionScope) || actionScope !== expectedScope) {
    return { ok: false, reason: "action_mismatch" };
  }
  const walletBinding = (input.wallet_binding ?? "not_attached") as string;
  if (!isPortableWalletBindingMode(walletBinding)) {
    return { ok: false, reason: "action_mismatch" };
  }
  const now = input.now ?? new Date();
  const ttl = Math.min(Math.max(input.ttlMs ?? DEFAULT_TTL_MS, 30_000), 60 * 60 * 1000);
  const issuedAt = now.toISOString();
  return {
    partner_id: input.kit.options.partnerId,
    policy_id: input.kit.options.policyId,
    policy_version: input.kit.options.policyVersion ?? 1,
    action_type: input.action_type,
    action_scope: actionScope,
    receipt_requirement: PORTABLE_ACTION_RECEIPT_REQUIREMENT,
    issued_at: issuedAt,
    expires_at: new Date(now.getTime() + ttl).toISOString(),
    nonce: createActionNonce(),
    wallet_binding: walletBinding as PortableActionWalletBindingMode,
    environment: input.kit.options.environment,
  };
}
