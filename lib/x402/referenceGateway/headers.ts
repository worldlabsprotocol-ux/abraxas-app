// FILE: lib/x402/referenceGateway/headers.ts
// x402 v2 header encoding — never log decoded payment payloads.

import { createHash } from "crypto";
import type { PaymentPayloadV2, PaymentRequiredV2, SettlementResponseV2 } from "./types";
import {
  X402_HEADER_PAYMENT_REQUIRED,
  X402_HEADER_PAYMENT_RESPONSE,
  X402_HEADER_PAYMENT_SIGNATURE,
} from "./constants";

export function encodeX402Header(value: PaymentRequiredV2 | PaymentPayloadV2 | SettlementResponseV2): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

export function decodePaymentRequiredHeader(raw: string | null | undefined): PaymentRequiredV2 | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw.trim(), "base64").toString("utf8")) as PaymentRequiredV2;
    if (parsed?.x402Version !== 2 || !Array.isArray(parsed.accepts)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function decodePaymentSignatureHeader(raw: string | null | undefined): PaymentPayloadV2 | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw.trim(), "base64").toString("utf8")) as PaymentPayloadV2;
    if (parsed?.x402Version !== 2 || parsed.scheme !== "exact") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function decodePaymentResponseHeader(raw: string | null | undefined): SettlementResponseV2 | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw.trim(), "base64").toString("utf8")) as SettlementResponseV2;
    if (parsed?.x402Version !== 2) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const X402_HEADERS = {
  paymentRequired: X402_HEADER_PAYMENT_REQUIRED,
  paymentSignature: X402_HEADER_PAYMENT_SIGNATURE,
  paymentResponse: X402_HEADER_PAYMENT_RESPONSE,
} as const;

export function hashPaymentPayload(payload: PaymentPayloadV2): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
