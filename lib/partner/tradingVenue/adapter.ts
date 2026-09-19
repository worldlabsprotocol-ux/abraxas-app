// FILE: lib/partner/tradingVenue/adapter.ts
// Server-side venue preflight. Reuses the Partner Integration Kit. No execution.

import {
  AbraxasPartnerKit,
  permitProtocolAction,
  type AbraxasPartnerKitOptions,
  type PartnerKitSafeResult,
} from "@/lib/partner/integrationKit";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  TRADING_VENUE_ACTION_TYPES,
  TRADING_VENUE_ALLOWED_SCOPES,
  TRADING_VENUE_NO_FUNDS_BOUNDARY,
  TRADING_VENUE_NOT_A_MARKET,
  TRADING_VENUE_SANDBOX_SCOPE,
  TRADING_VENUE_WALLET_BINDING_FUTURE,
  TRADING_VENUE_WALLET_BINDING_MODES,
  type TradingVenueActionContract,
  type TradingVenueActionScope,
  type TradingVenueActionType,
  type TradingVenueWalletBindingMode,
} from "@/lib/partner/tradingVenue/contract";
import { resolveWalletBindingForAction } from "@/lib/partner/walletStandard/resolve";
import {
  deniedVenueResult,
  permittedVenueResult,
  reasonFromOutcome,
  type TradingVenueClientVisibleResult,
} from "@/lib/partner/tradingVenue/clientVisible";
import { consumeTradingVenueNonce } from "@/lib/partner/tradingVenue/nonceStore";

const DEFAULT_TTL_MS = 15 * 60 * 1000;

export interface AbraxasTradingVenueAdapterOptions extends AbraxasPartnerKitOptions {}

export interface TradingVenuePreflightInput {
  result: PartnerKitSafeResult;
  contract: TradingVenueActionContract;
  action_type?: string;
  action_scope?: string;
  binding_ref?: string | null;
}

export class AbraxasTradingVenueAdapter {
  readonly kit: AbraxasPartnerKit;
  readonly fundsMovement = false as const;
  readonly createsTransactions = false as const;
  readonly createsTrades = false as const;
  readonly connectsWallet = false as const;
  readonly boundary = TRADING_VENUE_NO_FUNDS_BOUNDARY;
  readonly productBoundary = TRADING_VENUE_NOT_A_MARKET;

  constructor(options: AbraxasTradingVenueAdapterOptions) {
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
    wallet_binding?: string;
    ttlMs?: number;
    now?: Date;
  }): TradingVenueActionContract | { ok: false; reason: "action_mismatch" } {
    const actionType = (input?.action_type ?? "enable_market_access") as string;
    const actionScope = (input?.action_scope ?? TRADING_VENUE_SANDBOX_SCOPE) as string;
    const walletBinding = (input?.wallet_binding ?? TRADING_VENUE_WALLET_BINDING_FUTURE.status) as string;
    if (!isVenueActionType(actionType) || !isVenueActionScope(actionScope) || !isVenueWalletBindingMode(walletBinding)) {
      return { ok: false, reason: "action_mismatch" };
    }
    const now = input?.now ?? new Date();
    const ttl = Math.min(Math.max(input?.ttlMs ?? DEFAULT_TTL_MS, 30_000), 60 * 60 * 1000);
    return {
      partner_id: this.kit.options.partnerId,
      policy_id: this.kit.options.policyId,
      policy_version: this.kit.options.policyVersion ?? 1,
      action_type: actionType,
      action_scope: actionScope,
      expires_at: new Date(now.getTime() + ttl).toISOString(),
      nonce: createVenueNonce(),
      wallet_binding: walletBinding,
    };
  }

  preflight(input: TradingVenuePreflightInput): TradingVenueClientVisibleResult {
    const requestedType = input.action_type ?? input.contract.action_type;
    const requestedScope = input.action_scope ?? input.contract.action_scope;
    if (!isVenueActionType(requestedType) || !isVenueActionScope(requestedScope)) {
      return deniedVenueResult("action_mismatch", "rejected", String(requestedScope), "rejected");
    }
    if (
      input.contract.partner_id !== this.kit.options.partnerId
      || input.contract.policy_id !== this.kit.options.policyId
      || input.contract.policy_version !== (this.kit.options.policyVersion ?? 1)
    ) {
      return deniedVenueResult("partner_mismatch", requestedType, requestedScope, "rejected", input.contract.expires_at);
    }
    if (input.contract.action_type !== requestedType || input.contract.action_scope !== requestedScope) {
      return deniedVenueResult("action_mismatch", requestedType, requestedScope, "rejected", input.contract.expires_at);
    }
    if (Date.parse(input.contract.expires_at) <= Date.now()) {
      return deniedVenueResult("action_expired", requestedType, requestedScope, "rejected", input.contract.expires_at);
    }
    if (!permitProtocolAction(input.result)) {
      return deniedVenueResult(
        reasonFromOutcome(input.result.outcome),
        requestedType,
        requestedScope,
        "rejected",
        input.contract.expires_at,
      );
    }

    const wallet = resolveWalletBindingForAction({
      mode: input.contract.wallet_binding,
      bindingRef: input.binding_ref,
      partnerId: this.kit.options.partnerId,
      actionContractNonce: input.contract.nonce,
      consume: false,
    });
    if (!wallet.ok) {
      const reason =
        wallet.status === "missing" ? "wallet_binding_missing"
        : wallet.status === "expired" ? "wallet_binding_expired"
        : wallet.status === "mismatched" ? "wallet_binding_mismatch"
        : wallet.status === "replayed" ? "wallet_binding_replayed"
        : wallet.status === "cross_partner" ? "wallet_binding_cross_partner"
        : "invalid";
      return deniedVenueResult(
        reason,
        requestedType,
        requestedScope,
        "rejected",
        input.contract.expires_at,
        wallet.status === "cross_partner" ? "cross_partner" : wallet.status === "replayed" ? "replayed" : wallet.status === "expired" ? "expired" : wallet.status === "mismatched" ? "mismatched" : "missing",
      );
    }

    const nonceState = consumeTradingVenueNonce(this.kit.options.partnerId, input.contract.nonce);
    if (nonceState === "replayed") {
      return deniedVenueResult("replayed", requestedType, requestedScope, "replayed", input.contract.expires_at);
    }
    if (nonceState === "invalid") {
      return deniedVenueResult("invalid", requestedType, requestedScope, "rejected", input.contract.expires_at);
    }
    if (wallet.status === "bound") {
      resolveWalletBindingForAction({
        mode: input.contract.wallet_binding,
        bindingRef: input.binding_ref,
        partnerId: this.kit.options.partnerId,
        actionContractNonce: input.contract.nonce,
        consume: true,
      });
    }
    const walletState = wallet.status === "bound"
      ? "bound"
      : wallet.status === "optional_unused"
        ? "optional"
        : "not_attached";
    return permittedVenueResult(requestedType, requestedScope, input.contract.expires_at, walletState);
  }
}

export function isVenueActionType(value: string): value is TradingVenueActionType {
  return (TRADING_VENUE_ACTION_TYPES as readonly string[]).includes(value);
}

export function isVenueActionScope(value: string): value is TradingVenueActionScope {
  return (TRADING_VENUE_ALLOWED_SCOPES as readonly string[]).includes(value);
}

export function isVenueWalletBindingMode(value: string): value is TradingVenueWalletBindingMode {
  return (TRADING_VENUE_WALLET_BINDING_MODES as readonly string[]).includes(value);
}

function createVenueNonce(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `vn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
