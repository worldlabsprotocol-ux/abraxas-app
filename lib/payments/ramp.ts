// FILE: lib/payments/ramp.ts
// Ramp Network on-ramp — fiat checkout for normal users (rails hidden).

export interface RampSessionRequest {
  suiAddress: string;
  amountUsd: number;
  bookingId?: string;
  memo?: string;
}

export interface RampSessionResponse {
  configured: boolean;
  sessionUrl?: string;
  hostAppName?: string;
  message?: string;
}

export function isRampConfigured(): boolean {
  return Boolean(process.env.RAMP_API_KEY && process.env.RAMP_HOST_APP_NAME);
}

export function buildRampSession(req: RampSessionRequest): RampSessionResponse {
  if (!isRampConfigured()) {
    return {
      configured: false,
      message:
        "Card checkout is being enabled for this property. We'll email you a secure payment link after confirmation.",
    };
  }

  const hostAppName = process.env.RAMP_HOST_APP_NAME!;
  const params = new URLSearchParams({
    hostAppName,
    hostLogoUrl: "https://abraxas-app.vercel.app/icon-48.png",
    swapAsset: process.env.RAMP_SWAP_ASSET ?? "SUI_USDC",
    userAddress: req.suiAddress,
    fiatValue: String(Math.max(1, Math.ceil(req.amountUsd))),
    fiatCurrency: "USD",
  });

  if (req.bookingId) params.set("offrampMemo", req.bookingId);
  if (req.memo) params.set("offrampMemo", req.memo);

  const base = process.env.RAMP_WIDGET_URL ?? "https://app.ramp.network";
  return {
    configured: true,
    sessionUrl: `${base}/?${params.toString()}`,
    hostAppName,
  };
}

export const PAYMENT_METHOD_COPY = {
  fiat: {
    title: "Pay with Apple Pay or card",
    subtitle: "Pay in your local currency — we convert automatically. No wallet setup needed.",
    badge: "Recommended",
  },
  crypto: {
    title: "Pay with crypto instead",
    subtitle: "For users who already hold stablecoins in their Abraxas wallet.",
    badge: "Advanced",
  },
} as const;
