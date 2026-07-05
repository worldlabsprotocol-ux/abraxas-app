// FILE: lib/payments/ramp.ts
// Ramp Network on-ramp scaffold — headless fiat → USDC on Sui.

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
  defaultAsset?: string;
  defaultNetwork?: string;
  message?: string;
}

export function isRampConfigured(): boolean {
  return Boolean(process.env.RAMP_API_KEY && process.env.RAMP_HOST_APP_NAME);
}

/** Build Ramp widget URL when API key is configured. */
export function buildRampSession(req: RampSessionRequest): RampSessionResponse {
  if (!isRampConfigured()) {
    return {
      configured: false,
      message:
        "Fiat on-ramp is not configured yet. Pay with USDC on Sui, or contact the operator to enable Apple Pay / card checkout.",
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
    defaultAsset: "USDC",
    defaultNetwork: "Sui",
  };
}

export const PAYMENT_METHOD_COPY = {
  fiat: {
    title: "Pay with Apple Pay / card",
    subtitle: "Fiat converts to USDC on Sui — effective rate shown before checkout.",
    badge: "Recommended for most guests",
  },
  crypto: {
    title: "Pay with USDC on Sui",
    subtitle: "One-click from your zkLogin wallet, or send manually.",
    badge: "For crypto-native users",
  },
} as const;
