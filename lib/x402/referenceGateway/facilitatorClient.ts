// FILE: lib/x402/referenceGateway/facilitatorClient.ts
// External x402 facilitator client — verify + settle (no Abraxas custody).

import type { PaymentPayloadV2, PaymentRequiredV2 } from "./types";

export type FacilitatorSettleStatus = "settled" | "failed" | "ambiguous";

export interface FacilitatorVerifyResult {
  ok: boolean;
  error?: string;
}

export interface FacilitatorSettleResult {
  status: FacilitatorSettleStatus;
  settlementRef?: string;
  error?: string;
}

export interface FacilitatorClient {
  verify(
    payment: PaymentPayloadV2,
    requirements: PaymentRequiredV2,
  ): Promise<FacilitatorVerifyResult>;
  settle(
    payment: PaymentPayloadV2,
    requirements: PaymentRequiredV2,
  ): Promise<FacilitatorSettleResult>;
}

export interface HttpFacilitatorClientOptions {
  baseUrl: string;
  fetchFn?: typeof fetch;
  /** Operator-supplied auth header name/value — never logged by gateway. */
  authHeader?: { name: string; value: string };
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
    payment: PaymentPayloadV2,
    requirements: PaymentRequiredV2,
  ): Promise<FacilitatorVerifyResult> {
    try {
      const res = await this.fetchFn(`${this.baseUrl}/verify`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ payment, requirements }),
      });
      if (!res.ok) {
        return { ok: false, error: "facilitator_verify_rejected" };
      }
      const data = (await res.json()) as { valid?: boolean };
      return data.valid === true
        ? { ok: true }
        : { ok: false, error: "facilitator_verify_invalid" };
    } catch {
      return { ok: false, error: "facilitator_unreachable" };
    }
  }

  async settle(
    payment: PaymentPayloadV2,
    requirements: PaymentRequiredV2,
  ): Promise<FacilitatorSettleResult> {
    try {
      const res = await this.fetchFn(`${this.baseUrl}/settle`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ payment, requirements }),
      });
      if (res.status === 202 || res.status === 504) {
        return { status: "ambiguous", error: "facilitator_settle_timeout" };
      }
      if (!res.ok) {
        return { status: "failed", error: "facilitator_settle_rejected" };
      }
      const data = (await res.json()) as { settlementRef?: string; success?: boolean };
      if (data.success === true && data.settlementRef) {
        return { status: "settled", settlementRef: data.settlementRef };
      }
      return { status: "failed", error: "facilitator_settle_incomplete" };
    } catch {
      return { status: "ambiguous", error: "facilitator_settle_unreachable" };
    }
  }
}
