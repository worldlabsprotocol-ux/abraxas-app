// FILE: lib/payments/moonpay.ts
// MoonPay Platform API — headless Apple Pay / card on-ramp.
// Docs: https://dev.moonpay.com/platform/guides/pay-with-apple-pay

const MOONPAY_API = process.env.MOONPAY_API_BASE ?? "https://api.moonpay.com";

export interface MoonPaySessionRequest {
  /** Your user/booking identifier — used for webhooks and reconciliation. */
  externalCustomerId: string;
  deviceIp: string;
  email?: string;
  /** E.164 format — required for guest checkout (e.g. +14155551234). */
  phoneNumber?: string;
  /** ISO 8601 — capture when user accepts MoonPay terms (guest checkout). */
  termsAcceptedAt?: string;
}

export interface MoonPaySessionResponse {
  configured: boolean;
  sessionToken?: string;
  testMode?: boolean;
  destinationAssetCode?: string;
  /** In test mode, quotes may target a testnet asset (SOL) with a test wallet. */
  quoteWalletAddress?: string;
  message?: string;
}

export function isMoonPayConfigured(): boolean {
  return Boolean(process.env.MOONPAY_SECRET_KEY?.trim());
}

export function isMoonPayTestMode(): boolean {
  const key = process.env.MOONPAY_SECRET_KEY ?? "";
  return key.startsWith("sk_test_");
}

/** Production destination asset (live key). Defaults to USDC. */
export function getMoonPayDestinationAsset(): string {
  return process.env.MOONPAY_DESTINATION_ASSET ?? "USDC";
}

/** Test mode assets — MoonPay testnet supports SOL/ETH, not Sui USDC. */
export function getMoonPayTestDestinationAsset(): string {
  return process.env.MOONPAY_TEST_DESTINATION_ASSET ?? "SOL";
}

export function resolveMoonPayQuoteAsset(testMode: boolean): string {
  return testMode ? getMoonPayTestDestinationAsset() : getMoonPayDestinationAsset();
}

/**
 * Wallet address passed to getQuote().
 * In test mode with MOONPAY_TEST_WALLET set, use that (e.g. Solana testnet address for SOL quotes).
 */
export function resolveMoonPayQuoteWallet(suiAddress: string, testMode: boolean): string {
  if (testMode && process.env.MOONPAY_TEST_WALLET?.trim()) {
    return process.env.MOONPAY_TEST_WALLET.trim();
  }
  return suiAddress;
}

/** Create a Platform session token (server-side only — never expose secret key). */
export async function createMoonPaySession(
  req: MoonPaySessionRequest,
): Promise<MoonPaySessionResponse> {
  if (!isMoonPayConfigured()) {
    return {
      configured: false,
      message:
        "Card checkout is being enabled. We'll email you a secure payment link after confirmation.",
    };
  }

  const body: Record<string, string> = {
    externalCustomerId: req.externalCustomerId,
    deviceIp: req.deviceIp,
  };
  if (req.email) body.email = req.email;
  if (req.phoneNumber) body.phoneNumber = req.phoneNumber;
  if (req.termsAcceptedAt) body.termsAcceptedAt = req.termsAcceptedAt;

  const res = await fetch(`${MOONPAY_API}/platform/v1/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": process.env.MOONPAY_SECRET_KEY!,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return {
      configured: true,
      message: `MoonPay session failed (${res.status}). ${errText.slice(0, 120)}`,
    };
  }

  const data = await res.json() as { sessionToken?: string };
  if (!data.sessionToken) {
    return { configured: true, message: "MoonPay did not return a session token." };
  }

  const testMode = isMoonPayTestMode();

  return {
    configured: true,
    sessionToken: data.sessionToken,
    testMode,
    destinationAssetCode: resolveMoonPayQuoteAsset(testMode),
  };
}

/** Poll MoonPay transaction status (server-side). */
export async function getMoonPayTransaction(txnId: string) {
  if (!isMoonPayConfigured()) return null;

  const res = await fetch(`${MOONPAY_API}/platform/v1/transactions/${encodeURIComponent(txnId)}`, {
    headers: { "X-Api-Key": process.env.MOONPAY_SECRET_KEY! },
  });

  if (!res.ok) return null;
  const data = await res.json() as { data?: { status?: string; id?: string } };
  return data.data ?? null;
}

export const MOONPAY_PAYMENT_COPY = {
  title: "Pay with Apple Pay — we handle the rest",
  subtitle: "Pay in your currency. Conversion and delivery happen automatically.",
} as const;

/** NY/WA going-live disclosure — render visibly above Apple Pay frame. */
export const MOONPAY_US_DISCLOSURE_HTML =
  'I agree to MoonPay\'s <a href="https://www.moonpay.com/legal/terms" target="_blank" rel="noopener noreferrer">Terms of Use</a> and understand that, once executed, this transaction cannot be cancelled, recalled, refunded, or otherwise undone. Fraudulent transactions may result in the loss of funds with no recourse.';
