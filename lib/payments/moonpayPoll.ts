"use client";
// FILE: lib/payments/moonpayPoll.ts
// Client-side MoonPay transaction polling (webhooks coming soon per MoonPay docs).

import type { Client } from "@moonpay/platform-sdk-web";

const TERMINAL = new Set(["completed", "failed"]);

export async function pollMoonPayTransaction(
  client: Client,
  transactionId: string,
  maxAttempts = 40,
  intervalMs = 3000,
): Promise<{ status: string; ok: boolean }> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await client.getTransaction(transactionId);
    if (res.ok) {
      const status = res.value.data.status ?? "unknown";
      if (TERMINAL.has(status)) {
        return { status, ok: status === "completed" };
      }
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return { status: "pending", ok: false };
}
