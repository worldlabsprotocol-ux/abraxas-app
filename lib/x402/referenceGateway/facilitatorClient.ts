// FILE: lib/x402/referenceGateway/facilitatorClient.ts
// External x402 facilitator client — verify + settle (no Abraxas custody).
// Request/response shapes follow x402 v2 specification §7.

import { X402_PROTOCOL_VERSION } from "./constants";
import type { PaymentPayload, PaymentRequired, PaymentRequirements } from "./types";
import { primaryPaymentRequirements } from "./x402V2Wire";

export type FacilitatorSettleStatus = "settled" | "failed" | "ambiguous";

export interface FacilitatorVerifyResult {
  ok: boolean;
  error?: string;
  payer?: string;
}

export interface FacilitatorSettleResult {
  status: FacilitatorSettleStatus;
  transaction?: string;
  payer?: string;
  error?: string;
}

export interface FacilitatorClient {
  verify(
    payment: PaymentPayload,
    requirements: PaymentRequired,
  ): Promise<FacilitatorVerifyResult>;
  settle(
    payment: PaymentPayload,
    requirements: PaymentRequired,
  ): Promise<FacilitatorSettleResult>;
}

export interface HttpFacilitatorClientOptions {
  baseUrl: string;
  fetchFn?: typeof fetch;
  /** Operator-supplied auth header name/value — never logged by gateway. */
  authHeader?: { name: string; value: string };
}

interface FacilitatorRequestBody {
  x402Version: typeof X402_PROTOCOL_VERSION;
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
}

function buildFacilitatorBody(
  payment: PaymentPayload,
  requirements: PaymentRequired,
): FacilitatorRequestBody {
  return {
    x402Version: X402_PROTOCOL_VERSION,
    paymentPayload: payment,
    paymentRequirements: primaryPaymentRequirements(requirements),
  };
}

export class HttpFacilitatorClient implements FacilitatorClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly authHeader?: { name: string; value: string };

  constructor(options: HttpFacilitatorClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchFn = options.fetchFn ?? fetch;
    this.authHeader = options.authHeader;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.authHeader?.name && this.authHeader.value) {
      h[this.authHeader.name] = this.authHeader.value;
    }
    return h;
  }

  async verify(
    payment: PaymentPayload,
    requirements: PaymentRequired,
  ): Promise<FacilitatorVerifyResult> {
    try {
      const res = await this.fetchFn(`${this.baseUrl}/verify`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(buildFacilitatorBody(payment, requirements)),
      });
      if (!res.ok) {
        return { ok: false, error: "facilitator_verify_rejected" };
      }
      const data = (await res.json()) as { isValid?: boolean; invalidReason?: string; payer?: string };
      return data.isValid === true
        ? { ok: true, payer: data.payer }
        : { ok: false, error: data.invalidReason ?? "facilitator_verify_invalid", payer: data.payer };
    } catch {
      return { ok: false, error: "facilitator_unreachable" };
    }
  }

  async settle(
    payment: PaymentPayload,
    requirements: PaymentRequired,
  ): Promise<FacilitatorSettleResult> {
    try {
      const res = await this.fetchFn(`${this.baseUrl}/settle`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(buildFacilitatorBody(payment, requirements)),
      });
      if (res.status === 202 || res.status === 504) {
        return { status: "ambiguous", error: "facilitator_settle_timeout" };
      }
      if (!res.ok) {
        return { status: "failed", error: "facilitator_settle_rejected" };
      }
      const data = (await res.json()) as {
        success?: boolean;
        transaction?: string;
        payer?: string;
        errorReason?: string;
      };
      if (data.success === true && data.transaction) {
        return { status: "settled", transaction: data.transaction, payer: data.payer };
      }
      return {
        status: "failed",
        error: data.errorReason ?? "facilitator_settle_incomplete",
        payer: data.payer,
      };
    } catch {
      return { status: "ambiguous", error: "facilitator_settle_unreachable" };
    }
  }
}
