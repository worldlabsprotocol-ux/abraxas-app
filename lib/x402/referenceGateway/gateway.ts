// FILE: lib/x402/referenceGateway/gateway.ts
// Reference partner gateway: Abraxas receipt + x402 v2 payment before protected resource.

import { REFERENCE_GATEWAY_LABEL } from "./constants";
import type { FacilitatorClient } from "./facilitatorClient";
import {
  isGrantActive,
  isTerminalFailureStatus,
  type FulfillmentStore,
} from "./fulfillmentStore";
import { encodeX402Header, hashPaymentPayload } from "./headers";
import { buildFulfillmentIdempotencyKey } from "./idempotency";
import { buildPaymentRequired } from "./paymentRequired";
import { validateAbraxasEligibilityReceipt } from "./receiptValidation";
import type {
  GatewayResponseBody,
  GatewayResult,
  PaymentPayload,
  ReferenceGatewayConfig,
  SettleResponse,
} from "./types";
import {
  buildFailedSettlementResponse,
  buildSuccessSettlementResponse,
} from "./x402Sdk";
import type { x402ResourceServer } from "@x402/core/server";

export interface GatewayDependencies {
  fulfillmentStore: FulfillmentStore;
  facilitator: FacilitatorClient;
  resourceServer?: x402ResourceServer;
  fetchReceipt?: typeof fetch;
  now?: () => Date;
}

export interface GatewayRequestInput {
  receiptId: string;
  paymentSignatureHeader: string | null;
  decodePaymentSignature: (raw: string | null) => PaymentPayload | null;
  config: ReferenceGatewayConfig;
  deps: GatewayDependencies;
  /** When false, PAYMENT-SIGNATURE requests fail closed (no verify/settle). */
  settlementEnabled: boolean;
}

function demoBody(overrides: Partial<GatewayResponseBody> = {}): GatewayResponseBody {
  return { demo_label: REFERENCE_GATEWAY_LABEL, ...overrides };
}

function withHeaders(
  status: number,
  body: GatewayResponseBody,
  extra: Record<string, string> = {},
): GatewayResult {
  return {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Abraxas-Gateway-Demo": "testnet-only",
      ...extra,
    },
    body,
  };
}

function paymentResponseHeader(response: SettleResponse): Record<string, string> {
  return { "PAYMENT-RESPONSE": encodeX402Header(response) };
}

export async function handleProtectedResourceRequest(
  input: GatewayRequestInput,
): Promise<GatewayResult> {
  const now = input.deps.now?.() ?? new Date();
  const config = input.config;

  const receiptResult = await validateAbraxasEligibilityReceipt({
    receiptId: input.receiptId,
    partnerId: config.partnerId,
    policyId: config.policyId,
    allowSandbox: config.allowSandbox,
    abraxasPublicReceiptBaseUrl: config.abraxasPublicReceiptBaseUrl,
    now,
    fetchFn: input.deps.fetchReceipt,
  });

  if (!receiptResult.ok) {
    return withHeaders(403, demoBody({
      code: receiptResult.code,
      message: "Eligibility receipt validation failed.",
      receipt_id: input.receiptId,
    }));
  }

  const paymentRequired = await buildPaymentRequired(config, input.deps.resourceServer);
  const paymentPayload = input.decodePaymentSignature(input.paymentSignatureHeader);

  if (!paymentPayload) {
    return withHeaders(402, demoBody({
      code: "payment_required",
      message: "Payment required before accessing this TESTNET demo resource.",
      receipt_id: input.receiptId,
    }), {
      "PAYMENT-REQUIRED": encodeX402Header(paymentRequired),
    });
  }

  if (!input.settlementEnabled) {
    return withHeaders(503, demoBody({
      code: "settlement_unavailable",
      message: "Payment settlement requires a durable fulfillment store adapter. Not available in this runtime.",
      receipt_id: input.receiptId,
    }));
  }

  if (paymentPayload.accepted.network !== config.network) {
    return withHeaders(402, demoBody({
      code: "payment_network_mismatch",
      message: "Payment network must be Base Sepolia testnet only.",
      receipt_id: input.receiptId,
    }), paymentResponseHeader(buildFailedSettlementResponse("network_mismatch")));
  }

  const paymentPayloadHash = hashPaymentPayload(paymentPayload);
  const idempotencyKey = buildFulfillmentIdempotencyKey({
    partnerId: config.partnerId,
    resourceId: config.resourceId,
    receiptId: input.receiptId,
    paymentPayloadHash,
  });

  const existing = await input.deps.fulfillmentStore.getByIdempotencyKey(idempotencyKey);
  if (existing) {
    if (isGrantActive(existing, now)) {
      return withHeaders(200, demoBody({
        resource_id: config.resourceId,
        receipt_id: input.receiptId,
        message: "Synthetic protected resource (idempotent replay).",
      }), paymentResponseHeader(existing.payment_response));
    }
    if (isTerminalFailureStatus(existing.status)) {
      return withHeaders(409, demoBody({
        code: `fulfillment_${existing.status}`,
        message: "Prior payment attempt cannot be retried safely. Start a new eligibility flow.",
        receipt_id: input.receiptId,
      }), paymentResponseHeader(existing.payment_response));
    }
  }

  const accessGrantExpiresAt = new Date(
    now.getTime() + config.accessGrantTtlSec * 1000,
  ).toISOString();

  if (!existing) {
    const pendingResponse = buildFailedSettlementResponse("pending");
    const inserted = await input.deps.fulfillmentStore.insertPending({
      idempotency_key: idempotencyKey,
      receipt_id: input.receiptId,
      payment_payload_hash: paymentPayloadHash,
      settlement_ref: null,
      status: "pending",
      access_grant_expires_at: accessGrantExpiresAt,
      created_at: now.toISOString(),
      payment_response: pendingResponse,
    });
    if (inserted === "conflict") {
      const replay = await input.deps.fulfillmentStore.getByIdempotencyKey(idempotencyKey);
      if (replay && isGrantActive(replay, now)) {
        return withHeaders(200, demoBody({
          resource_id: config.resourceId,
          receipt_id: input.receiptId,
          message: "Synthetic protected resource (idempotent replay).",
        }), paymentResponseHeader(replay.payment_response));
      }
    }
  }

  const verify = await input.deps.facilitator.verify(paymentPayload, paymentRequired);
  if (!verify.ok) {
    const failureResponse = buildFailedSettlementResponse(verify.error ?? "verify_failed");
    await input.deps.fulfillmentStore.markFailed(idempotencyKey, failureResponse);
    return withHeaders(402, demoBody({
      code: "payment_verify_failed",
      message: "Payment verification failed.",
      receipt_id: input.receiptId,
    }), {
      ...paymentResponseHeader(failureResponse),
      "PAYMENT-REQUIRED": encodeX402Header(paymentRequired),
    });
  }

  const settle = await input.deps.facilitator.settle(paymentPayload, paymentRequired);
  if (settle.status === "ambiguous") {
    const ambiguousResponse = buildFailedSettlementResponse(settle.error ?? "settlement_ambiguous");
    await input.deps.fulfillmentStore.markAmbiguous(idempotencyKey, ambiguousResponse);
    return withHeaders(409, demoBody({
      code: "settlement_ambiguous",
      message: "Payment settlement is ambiguous. Do not fulfill — reconcile with facilitator first.",
      receipt_id: input.receiptId,
    }), paymentResponseHeader(ambiguousResponse));
  }

  if (settle.status === "failed" || !settle.transaction) {
    const failureResponse = buildFailedSettlementResponse(settle.error ?? "settlement_failed");
    await input.deps.fulfillmentStore.markFailed(idempotencyKey, failureResponse);
    return withHeaders(402, demoBody({
      code: "payment_settlement_failed",
      message: "Payment settlement failed.",
      receipt_id: input.receiptId,
    }), {
      ...paymentResponseHeader(failureResponse),
      "PAYMENT-REQUIRED": encodeX402Header(paymentRequired),
    });
  }

  const successResponse = buildSuccessSettlementResponse(settle.transaction, settle.payer);

  const marked = await input.deps.fulfillmentStore.markSettled(idempotencyKey, {
    settlement_ref: settle.transaction,
    payment_response: successResponse,
    access_grant_expires_at: accessGrantExpiresAt,
  });

  if (marked === "missing") {
    return withHeaders(503, demoBody({
      code: "fulfillment_store_error",
      message: "Could not record fulfillment. Retry with the same payment signature.",
      receipt_id: input.receiptId,
    }));
  }

  if (marked === "conflict") {
    const replay = await input.deps.fulfillmentStore.getByIdempotencyKey(idempotencyKey);
    if (replay && isGrantActive(replay, now)) {
      return withHeaders(200, demoBody({
        resource_id: config.resourceId,
        receipt_id: input.receiptId,
        message: "Synthetic protected resource (idempotent replay).",
      }), paymentResponseHeader(replay.payment_response));
    }
  }

  return withHeaders(200, demoBody({
    resource_id: config.resourceId,
    receipt_id: input.receiptId,
    message: "Synthetic protected resource delivered after eligibility + payment.",
  }), paymentResponseHeader(successResponse));
}
