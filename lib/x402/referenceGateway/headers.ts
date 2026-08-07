// FILE: lib/x402/referenceGateway/headers.ts
// x402 v2 header encoding via official @x402/core/http — never log decoded payloads.

import { createHash } from "crypto";
import type { PaymentPayload, PaymentRequired, SettleResponse } from "@x402/core/types";
import { parsePaymentPayload, parsePaymentRequired } from "@x402/core/schemas";
import {
  X402_HEADER_PAYMENT_REQUIRED,
  X402_HEADER_PAYMENT_RESPONSE,
  X402_HEADER_PAYMENT_SIGNATURE,
} from "./constants";
import {
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
  encodePaymentSignatureHeader,
  safeDecodePaymentRequiredHeader,
  safeDecodePaymentResponseHeader,
  safeDecodePaymentSignatureHeader,
} from "./x402Sdk";

export function encodeX402Header(
  value: PaymentRequired | PaymentPayload | SettleResponse,
): string {
  if ("accepts" in value) return encodePaymentRequiredHeader(value);
  if ("accepted" in value) return encodePaymentSignatureHeader(value);
  return encodePaymentResponseHeader(value);
}

export function decodePaymentSignatureHeader(raw: string | null | undefined): PaymentPayload | null {
  const decoded = safeDecodePaymentSignatureHeader(raw);
  if (!decoded) return null;
  return parsePaymentPayload(decoded).success ? decoded : null;
}

export function decodePaymentRequiredHeader(raw: string | null | undefined): PaymentRequired | null {
  const decoded = safeDecodePaymentRequiredHeader(raw);
  if (!decoded) return null;
  return parsePaymentRequired(decoded).success ? decoded : null;
}

export const decodePaymentResponseHeader = safeDecodePaymentResponseHeader;

export const X402_HEADERS = {
  paymentRequired: X402_HEADER_PAYMENT_REQUIRED,
  paymentSignature: X402_HEADER_PAYMENT_SIGNATURE,
  paymentResponse: X402_HEADER_PAYMENT_RESPONSE,
} as const;

export function hashPaymentPayload(payload: PaymentPayload): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
