// FILE: lib/x402/referenceGateway/facilitatorClient.ts
// Payment verify/settle via official @x402/core x402ResourceServer (no Abraxas custody).

import type { x402ResourceServer } from "@x402/core/server";
import type { PaymentPayload, PaymentRequired } from "@x402/core/types";
import {
  findMatchingPaymentRequirements,
  getHttpX402ResourceServer,
} from "./x402Sdk";

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

/** SDK-backed verify/settle using x402ResourceServer — no hand-rolled facilitator wire format. */
export class SdkX402PaymentClient implements FacilitatorClient {
  constructor(private readonly resourceServer: x402ResourceServer) {}

  getResourceServer(): x402ResourceServer {
    return this.resourceServer;
  }

  async verify(
    payment: PaymentPayload,
    requirements: PaymentRequired,
  ): Promise<FacilitatorVerifyResult> {
    const matched = findMatchingPaymentRequirements(this.resourceServer, requirements, payment);
    if (!matched) {
      return { ok: false, error: "requirements_mismatch" };
    }

    try {
      const result = await this.resourceServer.verifyPayment(payment, matched);
      return result.isValid
        ? { ok: true, payer: result.payer }
        : { ok: false, error: result.invalidReason ?? "facilitator_verify_invalid", payer: result.payer };
    } catch {
      return { ok: false, error: "facilitator_unreachable" };
    }
  }

  async settle(
    payment: PaymentPayload,
    requirements: PaymentRequired,
  ): Promise<FacilitatorSettleResult> {
    const matched = findMatchingPaymentRequirements(this.resourceServer, requirements, payment);
    if (!matched) {
      return { status: "failed", error: "requirements_mismatch" };
    }

    try {
      const result = await this.resourceServer.settlePayment(payment, matched);
      if (result.success && result.transaction) {
        return { status: "settled", transaction: result.transaction, payer: result.payer };
      }
      return {
        status: "failed",
        error: result.errorReason ?? "facilitator_settle_incomplete",
        payer: result.payer,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "facilitator_settle_unreachable";
      if (message.includes("timeout") || message.includes("ambiguous")) {
        return { status: "ambiguous", error: message };
      }
      return { status: "ambiguous", error: "facilitator_settle_unreachable" };
    }
  }
}

export interface HttpFacilitatorClientOptions {
  baseUrl: string;
}

/** Factory for route handlers — initializes official SDK resource server once per facilitator URL. */
export async function createSdkX402PaymentClient(
  options: HttpFacilitatorClientOptions,
): Promise<SdkX402PaymentClient> {
  const resourceServer = await getHttpX402ResourceServer(options.baseUrl);
  return new SdkX402PaymentClient(resourceServer);
}

/** @deprecated Use SdkX402PaymentClient via createSdkX402PaymentClient */
export { SdkX402PaymentClient as HttpFacilitatorClient };
