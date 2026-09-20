// FILE: lib/partner/evm/adapter.ts
// Server-side EVM eligibility preflight. Reuses portable action-contract primitives. No execution.

import {
  AbraxasPartnerKit,
  type AbraxasPartnerKitOptions,
  type PartnerKitSafeResult,
} from "@/lib/partner/integrationKit";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  EVM_CLIENT_OVERRIDE_KEYS,
  EVM_NO_EXECUTION_BOUNDARY,
  EVM_NOT_A_CHAIN_PRODUCT,
  EVM_PARTNER_ACTION_TYPES,
  EVM_PARTNER_ALLOWED_SCOPES,
  EVM_PARTNER_CLIENT_VISIBLE_KEYS,
  EVM_PARTNER_TYPE_SCOPES,
  EVM_PROTOCOL_SCOPE,
  type EvmPartnerActionContract,
  type EvmPartnerActionScope,
  type EvmPartnerActionType,
} from "@/lib/partner/evm/contract";
import {
  deniedEvmResult,
  toEvmClient,
  type EvmPartnerClientVisibleResult,
} from "@/lib/partner/evm/clientVisible";
import { issuePortableActionContract } from "@/lib/partner/portableActionContract/issue";
import { preflightPortableAction } from "@/lib/partner/portableActionContract/preflight";
import { pickAllowedKeys } from "@/lib/privacy/selectiveDisclosure";
import { rejectNetworkClientOverride } from "@/lib/partner/networkCapability/clientOverride";

export interface AbraxasEvmPartnerAdapterOptions extends AbraxasPartnerKitOptions {}

export interface EvmPartnerPreflightInput {
  result: PartnerKitSafeResult;
  contract: EvmPartnerActionContract;
  action_type?: string;
  action_scope?: string;
}

export class AbraxasEvmPartnerAdapter {
  readonly kit: AbraxasPartnerKit;
  readonly fundsMovement = false as const;
  readonly createsTransactions = false as const;
  readonly connectsWallet = false as const;
  readonly callsRpc = false as const;
  readonly constructsTransactions = false as const;
  readonly submitsTransactions = false as const;
  readonly boundary = EVM_NO_EXECUTION_BOUNDARY;
  readonly productBoundary = EVM_NOT_A_CHAIN_PRODUCT;

  constructor(options: AbraxasEvmPartnerAdapterOptions) {
    this.kit = new AbraxasPartnerKit(options);
  }

  startPolicyVerification(returnUrl: string): string {
    return this.kit.createHostedVerificationUrl(returnUrl);
  }

  async verifySignedReceipt(receiptId: string): Promise<PartnerKitSafeResult> {
    return this.kit.verifyReceiptId(receiptId);
  }

  evaluateFetchedReceipt(receipt: PartnerFlowPublicReceipt): PartnerKitSafeResult {
    return this.kit.evaluateFetchedReceipt(receipt);
  }

  issueActionContract(input?: {
    action_type?: string;
    action_scope?: string;
    ttlMs?: number;
    now?: Date;
    network_id?: string;
  }): EvmPartnerActionContract | { ok: false; reason: "action_mismatch" } {
    if (input && hasEvmExecutionOverride(input)) {
      return { ok: false, reason: "action_mismatch" };
    }
    const actionType = (input?.action_type ?? "enable_protocol_access") as string;
    const defaultScope = isEvmActionType(actionType)
      ? EVM_PARTNER_TYPE_SCOPES[actionType]
      : EVM_PROTOCOL_SCOPE;
    const actionScope = (input?.action_scope ?? defaultScope) as string;
    if (!isEvmActionType(actionType) || !isEvmActionScope(actionScope)) {
      return { ok: false, reason: "action_mismatch" };
    }
    if (EVM_PARTNER_TYPE_SCOPES[actionType] !== actionScope) {
      return { ok: false, reason: "action_mismatch" };
    }
    const networkId = input?.network_id
      ?? (this.kit.options.environment === "sandbox" ? "evm_sandbox" : "evm_mainnet");
    const issued = issuePortableActionContract({
      kit: this.kit,
      action_type: actionType,
      action_scope: actionScope,
      wallet_binding: "not_attached",
      ttlMs: input?.ttlMs,
      now: input?.now,
      network_id: networkId,
    });
    if ("ok" in issued) return issued;
    return issued as EvmPartnerActionContract;
  }

  async preflight(input: EvmPartnerPreflightInput): Promise<EvmPartnerClientVisibleResult> {
    if (hasEvmExecutionOverride(input)) {
      return deniedEvmResult("invalid", "rejected", String(input.action_scope ?? ""), "rejected");
    }
    const requestedType = input.action_type ?? input.contract.action_type;
    const requestedScope = input.action_scope ?? input.contract.action_scope;
    if (!isEvmActionType(requestedType) || !isEvmActionScope(requestedScope)) {
      return deniedEvmResult("action_mismatch", "rejected", String(requestedScope), "rejected");
    }
    if (EVM_PARTNER_TYPE_SCOPES[requestedType] !== requestedScope) {
      return deniedEvmResult("action_mismatch", requestedType, requestedScope, "rejected", input.contract.expires_at);
    }
    const result = await preflightPortableAction({
      kit: this.kit,
      result: input.result,
      contract: {
        ...input.contract,
        wallet_binding: "not_attached",
      },
      action_type: requestedType,
      action_scope: requestedScope,
    });
    const mapped = toEvmClient(result);
    return (pickAllowedKeys(mapped, EVM_PARTNER_CLIENT_VISIBLE_KEYS) ?? mapped) as unknown as EvmPartnerClientVisibleResult;
  }
}

export function isEvmActionType(value: string): value is EvmPartnerActionType {
  return (EVM_PARTNER_ACTION_TYPES as readonly string[]).includes(value);
}

export function isEvmActionScope(value: string): value is EvmPartnerActionScope {
  return (EVM_PARTNER_ALLOWED_SCOPES as readonly string[]).includes(value);
}

export function hasEvmExecutionOverride(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const keys = Object.keys(body as Record<string, unknown>);
  return keys.some((key) => (EVM_CLIENT_OVERRIDE_KEYS as readonly string[]).includes(key));
}

export function rejectEvmClientOverride(body: unknown): boolean {
  return rejectNetworkClientOverride(body) || hasEvmExecutionOverride(body);
}
