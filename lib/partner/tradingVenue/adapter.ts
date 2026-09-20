// FILE: lib/partner/tradingVenue/adapter.ts
// Server-side venue preflight. Reuses portable action-contract primitives. No execution.

import {
  AbraxasPartnerKit,
  type AbraxasPartnerKitOptions,
  type PartnerKitSafeResult,
} from "@/lib/partner/integrationKit";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  TRADING_VENUE_ACTION_TYPES,
  TRADING_VENUE_ALLOWED_SCOPES,
  TRADING_VENUE_CLIENT_VISIBLE_KEYS,
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
import {
  deniedVenueResult,
  type TradingVenueClientVisibleResult,
} from "@/lib/partner/tradingVenue/clientVisible";
import { issuePortableActionContract } from "@/lib/partner/portableActionContract/issue";
import { preflightPortableAction } from "@/lib/partner/portableActionContract/preflight";
import { pickAllowedKeys } from "@/lib/privacy/selectiveDisclosure";

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
    if (!isVenueActionType(actionType) || !isVenueActionScope(actionScope)) {
      return { ok: false, reason: "action_mismatch" };
    }
    const issued = issuePortableActionContract({
      kit: this.kit,
      action_type: actionType,
      action_scope: actionScope,
      wallet_binding: input?.wallet_binding ?? TRADING_VENUE_WALLET_BINDING_FUTURE.status,
      ttlMs: input?.ttlMs,
      now: input?.now,
    });
    if ("ok" in issued) return issued;
    return issued as TradingVenueActionContract;
  }

  async preflight(input: TradingVenuePreflightInput): Promise<TradingVenueClientVisibleResult> {
    const requestedType = input.action_type ?? input.contract.action_type;
    const requestedScope = input.action_scope ?? input.contract.action_scope;
    if (!isVenueActionType(requestedType) || !isVenueActionScope(requestedScope)) {
      return deniedVenueResult("action_mismatch", "rejected", String(requestedScope), "rejected");
    }
    const result = await preflightPortableAction({
      kit: this.kit,
      result: input.result,
      contract: input.contract,
      action_type: requestedType,
      action_scope: requestedScope,
      binding_ref: input.binding_ref,
    });
    return (pickAllowedKeys(result, TRADING_VENUE_CLIENT_VISIBLE_KEYS) ?? result) as unknown as TradingVenueClientVisibleResult;
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
