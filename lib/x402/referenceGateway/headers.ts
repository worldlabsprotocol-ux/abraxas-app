// FILE: lib/x402/referenceGateway/headers.ts
// x402 v2 header encoding — never log decoded payment payloads.

import { createHash } from "crypto";
import type { PaymentPayload, PaymentRequired, SettlementResponse } from "./types";
import {
  X402_HEADER_PAYMENT_REQUIRED,
  X402_HEADER_PAYMENT_RESPONSE,
  X402_HEADER_PAYMENT_SIGNATURE,
} from "./constants";
import { isPaymentPayload, isPaymentRequired, isSettlementResponse } from "./x402V2Wire";

export function encodeX402Header(
  value: PaymentRequired | PaymentPayload | SettlementResponse,
): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

export function decodePaymentRequiredHeader(raw: string | null | undefined): PaymentRequired | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw.trim(), "base64").toString("utf8")) as unknown;
    return isPaymentRequired(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function decodePaymentSignatureHeader(raw: string | null | undefined): PaymentPayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw.trim(), "base64").toString("utf8")) as unknown;
    return isPaymentPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function decodePaymentResponseHeader(raw: string | null | undefined): SettlementResponse | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw.trim(), "base64").toString("utf8")) as unknown;
    return isSettlementResponse(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const X402_HEADERS = {
  paymentRequired: X402_HEADER_PAYMENT_REQUIRED,
  paymentSignature: X402_HEADER_PAYMENT_SIGNATURE,
  paymentResponse: X402_HEADER_PAYMENT_RESPONSE,
} as const;

export function hashPaymentPayload(payload: PaymentPayload): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
