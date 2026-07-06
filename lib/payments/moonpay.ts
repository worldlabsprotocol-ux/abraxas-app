// FILE: lib/payments/moonpay.ts
// MoonPay Platform API — headless Apple Pay / card on-ramp.

const MOONPAY_API = process.env.MOONPAY_API_BASE ?? "https://api.moonpay.com";

export interface MoonPaySessionRequest {
  externalCustomerId: string;
  deviceIp: string;
  email?: string;
}

export interface MoonPaySessionResponse {
  configured: boolean;
  sessionToken?: string;
  testMode?: boolean;
  destinationAssetCode?: string;
  message?: string;
}

export function isMoonPayConfigured(): boolean {
  return Boolean(process.env.MOONPAY_SECRET_KEY?.trim());
}

export function isMoonPayTestMode(): boolean {
  const key = process.env.MOONPAY_SECRET_KEY ?? "";
  return key.startsWith("sk_test_");
}

export function getMoonPayDestinationAsset(): string {
  return process.env.MOONPAY_DESTINATION_ASSET ?? "USDC";
}

/** Create a Platform session token (server-side only). */
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

  return {
    configured: true,
    sessionToken: data.sessionToken,
    testMode: isMoonPayTestMode(),
    destinationAssetCode: getMoonPayDestinationAsset(),
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
