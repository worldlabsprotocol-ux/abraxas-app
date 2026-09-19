// FILE: lib/settlement/circle/amount.ts
// Integer USDC amounts only. No floats, no scientific notation.

import { CIRCLE_DEMO_AMOUNT_MINOR, CIRCLE_DEMO_AMOUNT_MINOR_MAX, CIRCLE_USDC_DECIMALS } from "@/lib/settlement/circle/constants";

const INTEGER_AMOUNT = /^[1-9][0-9]*$/;
const USDC_STRING = /^[0-9]+(\.[0-9]{1,6})?$/;

export function parseAmountMinor(value: unknown, fallback = CIRCLE_DEMO_AMOUNT_MINOR): number | null {
  if (value == null || value === "") return fallback;
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value <= 0 || value > CIRCLE_DEMO_AMOUNT_MINOR_MAX) return null;
    return value;
  }
  if (typeof value !== "string" || !INTEGER_AMOUNT.test(value.trim())) return null;
  const parsed = Number(value.trim());
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > CIRCLE_DEMO_AMOUNT_MINOR_MAX) return null;
  return parsed;
}

export function formatUsdcFromMinor(amountMinor: number): string {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("invalid_amount_minor");
  }
  const factor = 10 ** CIRCLE_USDC_DECIMALS;
  const whole = Math.floor(amountMinor / factor);
  const frac = String(amountMinor % factor).padStart(CIRCLE_USDC_DECIMALS, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : String(whole);
}

export function parseUsdcStringToMinor(amount: string): number | null {
  const trimmed = amount.trim();
  if (!USDC_STRING.test(trimmed)) return null;
  const [wholeRaw, fracRaw = ""] = trimmed.split(".");
  const frac = fracRaw.padEnd(CIRCLE_USDC_DECIMALS, "0");
  const minor = Number(wholeRaw) * (10 ** CIRCLE_USDC_DECIMALS) + Number(frac);
  if (!Number.isSafeInteger(minor) || minor <= 0) return null;
  return minor;
}
