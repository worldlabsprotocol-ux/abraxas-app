// FILE: lib/partner/paymentAuthorization/adapter.ts
// Server-side payment preflight. Reuses portable action-contract primitives. No execution.

import {
  AbraxasPartnerKit,
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
  permittedPaymentResult,
  type PaymentAuthorizationClientVisibleResult,
} from "@/lib/partner/paymentAuthorization/clientVisible";
import { issuePortableActionContract } from "@/lib/partner/portableActionContract/issue";
import { preflightPortableAction } from "@/lib/partner/portableActionContract/preflight";
import type { PortableActionClientResult } from "@/lib/partner/portableActionContract/contract";

export interface AbraxasPaymentAuthorizationAdapterOptions extends AbraxasPartnerKitOptions {}

export interface PaymentAuthorizationPreflightInput {
  result: PartnerKitSafeResult;
  contract: PaymentAuthorizationActionContract;
  action_type?: string;
  action_scope?: string;
}

function toPaymentClient(result: PortableActionClientResult): PaymentAuthorizationClientVisibleResult {
  if (!result.allowed) {
    const actionType = result.action_binding.action_type === "authorize_checkout"
      || result.action_binding.action_type === "authorize_recurring_payment"
      ? result.action_binding.action_type
      : "rejected";
    return deniedPaymentResult(
      result.reason as PaymentAuthorizationClientVisibleResult["reason"],
      actionType,
      result.action_binding.action_scope,
      result.action_binding.nonce_state,
      result.expires_at,
    );
  }
  return permittedPaymentResult(
    result.action_binding.action_type as PaymentAuthorizationActionType,
    result.action_binding.action_scope as PaymentAuthorizationActionScope,
    result.expires_at as string,
  );
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
    const issued = issuePortableActionContract({
      kit: this.kit,
      action_type: actionType,
      action_scope: actionScope,
      wallet_binding: "not_attached",
      ttlMs: input?.ttlMs,
      now: input?.now,
    });
    if ("ok" in issued) return issued;
    return issued as PaymentAuthorizationActionContract;
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
    const result = await preflightPortableAction({
      kit: this.kit,
      result: input.result,
      contract: {
        ...input.contract,
        wallet_binding: input.contract.wallet_binding ?? "not_attached",
      },
      action_type: requestedType,
      action_scope: requestedScope,
    });
    return toPaymentClient(result);
  }
}

export function isPaymentActionType(value: string): value is PaymentAuthorizationActionType {
  return (PAYMENT_AUTHORIZATION_ACTION_TYPES as readonly string[]).includes(value);
}

export function isPaymentActionScope(value: string): value is PaymentAuthorizationActionScope {
  return (PAYMENT_AUTHORIZATION_ALLOWED_SCOPES as readonly string[]).includes(value);
}
