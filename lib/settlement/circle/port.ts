// FILE: lib/settlement/circle/port.ts
import { CIRCLE_NETWORK } from "@/lib/settlement/circle/constants";
import type { CircleAuthenticatedResult } from "@/lib/settlement/circle/authenticated";

export interface CircleWalletsPort {
  authenticateAgainstArcTestnet(): Promise<{ ok: true; network: typeof CIRCLE_NETWORK } | { ok: false; code: string }>;
  createTestnetUsdcTransfer(input: {
    amountMinor: number;
    idempotencyKey: string;
  }): Promise<{ ok: true; result: CircleAuthenticatedResult } | { ok: false; code: string }>;
  getTransaction(transactionId: string): Promise<{ ok: true; result: CircleAuthenticatedResult } | { ok: false; code: string }>;
}
