// FILE: lib/partner/paymentAuthorization/adapter.ts
// Server-side payment preflight. Reuses the Partner Integration Kit. No execution.

import {
  AbraxasPartnerKit,
  permitProtocolAction,
  type AbraxasPartnerKitOptions,
  type PartnerKitSafeResult,
} from "@/lib/partner/integrationKit";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  PAYMENT_AUTHORIZATION_ACTION_TYPES,
  PAYMENT_AUTHORIZATION_ALLOWED_SCOPES,
  PAYMENT_AUTHORIZATION_CHECKOUT_SCOPE,
  PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY,
  PAYMENT_AUTHORIZATION_NOT_A_PROCESSOR,
  PAYMENT_AUTHORIZATION_TYPE_SCOPES,
  type PaymentAuthorizationActionContract,
  type PaymentAuthorizationActionScope,
  type PaymentAuthorizationActionType,
} from "@/lib/partner/paymentAuthorization/contract";
import {
  deniedPaymentResult,
  paymentReasonFromOutcome,
  permittedPaymentResult,
  type PaymentAuthorizationClientVisibleResult,
} from "@/lib/partner/paymentAuthorization/clientVisible";
import { consumeTradingVenueNonce } from "@/lib/partner/tradingVenue/nonceStore";
import { WalletStandardStoreUnavailableError } from "@/lib/partner/walletStandard/errors";

const DEFAULT_TTL_MS = 15 * 60 * 1000;

export interface AbraxasPaymentAuthorizationAdapterOptions extends AbraxasPartnerKitOptions {}

export interface PaymentAuthorizationPreflightInput {
  result: PartnerKitSafeResult;
  contract: PaymentAuthorizationActionContract;
  action_type?: string;
  action_scope?: string;
}

export class AbraxasPaymentAuthorizationAdapter {
  readonly kit: AbraxasPartnerKit;
  readonly fundsMovement = false as const;
  readonly createsPayments = false as const;
  readonly createsTransfers = false as const;
  readonly createsSubscriptions = false as const;
  readonly callsCircle = false as const;
  readonly boundary = PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY;
  readonly productBoundary = PAYMENT_AUTHORIZATION_NOT_A_PROCESSOR;

  constructor(options: AbraxasPaymentAuthorizationAdapterOptions) {
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
  }): PaymentAuthorizationActionContract | { ok: false; reason: "action_mismatch" } {
    const actionType = (input?.action_type ?? "authorize_checkout") as string;
    const defaultScope = isPaymentActionType(actionType)
      ? PAYMENT_AUTHORIZATION_TYPE_SCOPES[actionType]
      : PAYMENT_AUTHORIZATION_CHECKOUT_SCOPE;
    const actionScope = (input?.action_scope ?? defaultScope) as string;
    if (!isPaymentActionType(actionType) || !isPaymentActionScope(actionScope)) {
      return { ok: false, reason: "action_mismatch" };
    }
    if (PAYMENT_AUTHORIZATION_TYPE_SCOPES[actionType] !== actionScope) {
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
      nonce: createPaymentNonce(),
    };
  }

  async preflight(input: PaymentAuthorizationPreflightInput): Promise<PaymentAuthorizationClientVisibleResult> {
    const requestedType = input.action_type ?? input.contract.action_type;
    const requestedScope = input.action_scope ?? input.contract.action_scope;
    if (!isPaymentActionType(requestedType) || !isPaymentActionScope(requestedScope)) {
      return deniedPaymentResult("action_mismatch", "rejected", String(requestedScope), "rejected");
    }
    if (PAYMENT_AUTHORIZATION_TYPE_SCOPES[requestedType] !== requestedScope) {
      return deniedPaymentResult("action_mismatch", requestedType, requestedScope, "rejected", input.contract.expires_at);
    }
    if (
      input.contract.partner_id !== this.kit.options.partnerId
      || input.contract.policy_id !== this.kit.options.policyId
      || input.contract.policy_version !== (this.kit.options.policyVersion ?? 1)
    ) {
      return deniedPaymentResult("partner_mismatch", requestedType, requestedScope, "rejected", input.contract.expires_at);
    }
    if (input.contract.action_type !== requestedType || input.contract.action_scope !== requestedScope) {
      return deniedPaymentResult("action_mismatch", requestedType, requestedScope, "rejected", input.contract.expires_at);
    }
    if (Date.parse(input.contract.expires_at) <= Date.now()) {
      return deniedPaymentResult("action_expired", requestedType, requestedScope, "rejected", input.contract.expires_at);
    }
    if (!permitProtocolAction(input.result)) {
      return deniedPaymentResult(
        paymentReasonFromOutcome(input.result.outcome),
        requestedType,
        requestedScope,
        "rejected",
        input.contract.expires_at,
      );
    }

    let nonceState: "consumed" | "replayed" | "invalid" | "expired";
    try {
      nonceState = await consumeTradingVenueNonce(this.kit.options.partnerId, input.contract.nonce, input.contract.expires_at);
    } catch (error) {
      if (error instanceof WalletStandardStoreUnavailableError) {
        return deniedPaymentResult("store_unavailable", requestedType, requestedScope, "rejected", input.contract.expires_at);
      }
      throw error;
    }
    if (nonceState === "replayed") {
      return deniedPaymentResult("replayed", requestedType, requestedScope, "replayed", input.contract.expires_at);
    }
    if (nonceState === "expired") {
      return deniedPaymentResult("action_expired", requestedType, requestedScope, "rejected", input.contract.expires_at);
    }
    if (nonceState === "invalid") {
      return deniedPaymentResult("invalid", requestedType, requestedScope, "rejected", input.contract.expires_at);
    }
    return permittedPaymentResult(requestedType, requestedScope, input.contract.expires_at);
  }
}

export function isPaymentActionType(value: string): value is PaymentAuthorizationActionType {
  return (PAYMENT_AUTHORIZATION_ACTION_TYPES as readonly string[]).includes(value);
}

export function isPaymentActionScope(value: string): value is PaymentAuthorizationActionScope {
  return (PAYMENT_AUTHORIZATION_ALLOWED_SCOPES as readonly string[]).includes(value);
}

function createPaymentNonce(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `pn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
