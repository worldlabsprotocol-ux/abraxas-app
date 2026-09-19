// FILE: lib/settlement/circle/authenticated.server.ts
import "server-only";
// Only the Circle adapter may seal a provider result. Not exported from the public module.

import { CIRCLE_CURRENCY, CIRCLE_NETWORK } from "@/lib/settlement/circle/constants";
import type { CircleSafeTransfer } from "@/lib/settlement/circle/authenticated";

const CIRCLE_AUTHENTICATED = Symbol.for("abraxas.circle.authenticated");

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
