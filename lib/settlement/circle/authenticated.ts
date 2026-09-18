// FILE: lib/settlement/circle/authenticated.ts
// Official Circle transaction-state mapping. Sealing lives in authenticated.server.ts.

import {
  CIRCLE_OFFICIAL_TRANSACTION_STATES,
  CIRCLE_TERMINAL_TRANSACTION_STATES,
  type CircleIntentState,
  type CircleProviderState,
} from "@/lib/settlement/circle/constants";

export type { CircleProviderState };

export interface CircleSafeTransfer {
  providerRequestRef: string;
  circleTransactionId: string | null;
  network: "ARC-TESTNET";
  currency: "USDC";
  amountMinor: number;
  providerState: CircleProviderState;
  occurredAt: string;
}

export function parseOfficialProviderState(value: unknown): CircleProviderState | null {
  if (typeof value !== "string") return null;
  const upper = value.toUpperCase();
  return (CIRCLE_OFFICIAL_TRANSACTION_STATES as readonly string[]).includes(upper)
    ? upper as CircleProviderState
    : null;
}

export function isTerminalProviderState(
  state: CircleProviderState,
): state is (typeof CIRCLE_TERMINAL_TRANSACTION_STATES)[number] {
  return (CIRCLE_TERMINAL_TRANSACTION_STATES as readonly string[]).includes(state);
}

/**
 * COMPLETE is the only official final successful state.
 * FAILED / DENIED → failed. CANCELLED → cancelled.
 * Non-final official states stay submitted (retrying).
 */
export function mapOfficialProviderStateToIntent(
  providerState: CircleProviderState,
): CircleIntentState {
  if (providerState === "COMPLETE") return "settled";
  if (providerState === "CANCELLED") return "cancelled";
  if (providerState === "FAILED" || providerState === "DENIED") return "failed";
  return "submitted";
}
