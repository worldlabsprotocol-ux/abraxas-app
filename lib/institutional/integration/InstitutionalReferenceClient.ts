// Provider-neutral server-side reference client — public HTTP surfaces only.

import { randomBytes } from "node:crypto";
import type { InstitutionalEligibilityDecision } from "@/lib/institutional/eligibilityDecisionContract";
import {
  INSTITUTIONAL_INTEGRATION_CONTRACT_VERSION,
  type InstitutionalIntegrationRequest,
} from "@/lib/institutional/integration/institutionalIntegrationContract";
import { verifyWebhookSignature } from "@/lib/partner/webhooks/webhookSigning";

export type InstitutionalReferenceClientConfig = {
  baseUrl: string;
  apiKey: string;
  partnerId: string;
  applicationId?: string | null;
  fetchFn?: typeof fetch;
};

export type ConsumeEligibilityResponse =
  | { ok: true; decision: InstitutionalEligibilityDecision; narrow_result: unknown }
  | { ok: false; status: number; error: string; decision?: InstitutionalEligibilityDecision };

export type ReceiptStatusResponse = {
  receipt_id: string;
  trust?: {
    currently_valid?: boolean;
    signature_valid?: boolean;
    invalidation_reasons?: string[];
  };
  validity?: Record<string, unknown>;
};

export class InstitutionalReferenceClient {
  readonly contractVersion = INSTITUTIONAL_INTEGRATION_CONTRACT_VERSION;

  constructor(private readonly config: InstitutionalReferenceClientConfig) {}

  createReplayNonce(bytes = 24): string {
    return randomBytes(bytes).toString("base64url").slice(0, 32);
  }

  private fetchApi(path: string, init?: RequestInit): Promise<Response> {
    const fn = this.config.fetchFn ?? fetch;
    const url = `${this.config.baseUrl.replace(/\/$/, "")}${path}`;
    return fn(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  }

  async consumeEligibility(input: Omit<InstitutionalIntegrationRequest, "replay_nonce"> & {
    replay_nonce?: string;
  }): Promise<ConsumeEligibilityResponse> {
    const body: InstitutionalIntegrationRequest = {
      receipt_id: input.receipt_id,
      policy_id: input.policy_id,
      policy_version: input.policy_version,
      application_id: input.application_id ?? this.config.applicationId ?? undefined,
      purpose: input.purpose,
      action_scope: input.action_scope,
      correlation_id: input.correlation_id,
      replay_nonce: input.replay_nonce ?? this.createReplayNonce(),
    };
    const res = await this.fetchApi("/api/v1/institutional/eligibility/consume", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const payload = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: String(payload.error ?? "consume_failed"),
        decision: payload.decision as InstitutionalEligibilityDecision | undefined,
      };
    }
    return {
      ok: true,
      decision: payload.decision as InstitutionalEligibilityDecision,
      narrow_result: payload.narrow_result,
    };
  }

  async getReceiptStatus(receiptId: string): Promise<ReceiptStatusResponse> {
    const res = await this.fetchApi(`/api/v1/decision-receipts/${encodeURIComponent(receiptId)}/status`);
    if (!res.ok) throw new Error(`receipt_status_http_${res.status}`);
    return res.json() as Promise<ReceiptStatusResponse>;
  }

  verifyWebhook(input: {
    rawBody: string;
    signatureHeader: string;
    secret: string;
    timestamp: string;
  }) {
    return verifyWebhookSignature(input);
  }
}
