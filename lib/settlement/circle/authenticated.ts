// FILE: lib/settlement/circle/authenticated.ts
// Only the Circle adapter may seal a provider result. Plain objects cannot settle.

import { CIRCLE_CURRENCY, CIRCLE_NETWORK } from "@/lib/settlement/circle/constants";

const CIRCLE_AUTHENTICATED = Symbol.for("abraxas.circle.authenticated");

export type CircleProviderState =
  | "QUEUED"
  | "PENDING"
  | "INITIATED"
  | "BROADCASTED"
  | "COMPLETE"
  | "FAILED"
  | "CANCELLED"
  | "DENIED";

export interface CircleSafeTransfer {
  providerRequestRef: string;
  circleTransactionId: string | null;
  network: typeof CIRCLE_NETWORK;
  currency: typeof CIRCLE_CURRENCY;
  amountMinor: number;
  providerState: CircleProviderState;
  occurredAt: string;
}

export type CircleAuthenticatedResult = CircleSafeTransfer & {
  readonly [CIRCLE_AUTHENTICATED]: true;
};

export function sealCircleAuthenticatedResult(input: CircleSafeTransfer): CircleAuthenticatedResult {
  if (input.network !== CIRCLE_NETWORK) {
    throw new Error("circle_wrong_network");
  }
  if (input.currency !== CIRCLE_CURRENCY) {
    throw new Error("circle_wrong_currency");
  }
  if (!input.providerRequestRef.trim()) {
    throw new Error("circle_missing_request_ref");
  }
  return {
    ...input,
    [CIRCLE_AUTHENTICATED]: true,
  };
}

export function isCircleAuthenticatedResult(value: unknown): value is CircleAuthenticatedResult {
  return Boolean(
    value
    && typeof value === "object"
    && (value as { [CIRCLE_AUTHENTICATED]?: unknown })[CIRCLE_AUTHENTICATED] === true,
  );
}

export function toSettledState(providerState: CircleProviderState): "submitted" | "settled" | "failed" {
  if (providerState === "COMPLETE") return "settled";
  if (providerState === "FAILED" || providerState === "CANCELLED" || providerState === "DENIED") {
    return "failed";
  }
  return "submitted";
}
