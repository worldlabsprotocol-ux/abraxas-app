// FILE: lib/settlement/usdcAmount.ts
// Strict USDC ERC20 amount parsing. Integer micro units only.

export const USDC_ERC20_DECIMALS = 6;
const MICRO = BigInt(1_000_000);
const MAX_MICRO = BigInt("1000000000000000");

export type UsdcParseResult =
  | { ok: true; amountMicroUsdc: bigint }
  | { ok: false; code: string };

export function parseUsdcAmountMicro(input: string | number | bigint): UsdcParseResult {
  if (typeof input === "bigint") {
    if (input <= BigInt(0) || input > MAX_MICRO) {
      return { ok: false, code: "settlement_invalid_amount" };
    }
    return { ok: true, amountMicroUsdc: input };
  }

  if (typeof input === "number") {
    if (!Number.isFinite(input) || !Number.isInteger(input) || input <= 0) {
      return { ok: false, code: "settlement_invalid_amount" };
    }
    return parseUsdcAmountMicro(String(input));
  }

  const raw = input.trim();
  if (!raw || input !== raw.trim() || /\s/.test(raw) || /e/i.test(raw)) {
    return { ok: false, code: "settlement_invalid_amount" };
  }
  if (raw.startsWith("-")) {
    return { ok: false, code: "settlement_invalid_amount" };
  }

  if (/^\d+$/.test(raw)) {
    try {
      const value = BigInt(raw);
      if (value <= BigInt(0) || value > MAX_MICRO) {
        return { ok: false, code: "settlement_invalid_amount" };
      }
      return { ok: true, amountMicroUsdc: value };
    } catch {
      return { ok: false, code: "settlement_invalid_amount" };
    }
  }

  if (!/^\d+(\.\d+)?$/.test(raw)) {
    return { ok: false, code: "settlement_invalid_amount" };
  }

  const [whole, fraction = ""] = raw.split(".");
  if (fraction.length > USDC_ERC20_DECIMALS) {
    return { ok: false, code: "settlement_invalid_amount" };
  }

  const fractionPadded = fraction.padEnd(USDC_ERC20_DECIMALS, "0");
  try {
    const value = BigInt(whole) * MICRO + BigInt(fractionPadded || "0");
    if (value <= BigInt(0) || value > MAX_MICRO) {
      return { ok: false, code: "settlement_invalid_amount" };
    }
    return { ok: true, amountMicroUsdc: value };
  } catch {
    return { ok: false, code: "settlement_invalid_amount" };
  }
}

export function formatUsdcAmountMicro(amountMicroUsdc: bigint): string {
  const whole = amountMicroUsdc / MICRO;
  const fraction = amountMicroUsdc % MICRO;
  const fractionStr = fraction.toString().padStart(USDC_ERC20_DECIMALS, "0").replace(/0+$/, "");
  return fractionStr.length > 0 ? `${whole}.${fractionStr}` : whole.toString();
}
