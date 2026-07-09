// FILE: lib/payments/provider.ts
// Fiat on-ramp provider selection — MoonPay preferred, Ramp fallback.

import { isMoonPayConfigured } from "@/lib/payments/moonpay";
import { isRampConfigured } from "@/lib/payments/ramp";

export type FiatOnRampProvider = "moonpay" | "ramp" | "none";

export function getFiatOnRampProvider(): FiatOnRampProvider {
  if (isMoonPayConfigured()) return "moonpay";
  if (isRampConfigured()) return "ramp";
  return "none";
}

export function isFiatOnRampConfigured(): boolean {
  return getFiatOnRampProvider() !== "none";
}
