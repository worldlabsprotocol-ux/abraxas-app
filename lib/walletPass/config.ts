// FILE: lib/walletPass/config.ts
// Apple Wallet Pass configuration — requires Apple Developer certs in production.

export interface WalletPassPayload {
  suiAddress: string;
  verificationLevel?: string;
  assetName?: string;
  lastVerified?: string;
  refreshDue?: string;
  credentialId?: string;
}

export function isWalletPassConfigured(): boolean {
  return Boolean(
    process.env.APPLE_PASS_TYPE_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_PASS_CERT_PEM &&
    process.env.APPLE_PASS_KEY_PEM,
  );
}

export function getWalletPassWebServiceUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://abraxas-app.vercel.app";
  return `${base.replace(/\/$/, "")}/api/apple-wallet`;
}

export function buildPassJson(payload: WalletPassPayload) {
  const serial = payload.credentialId ?? `ABX-${payload.suiAddress.slice(-8)}`;
  const verifyUrl = payload.credentialId
    ? `https://abraxas-app.vercel.app/verify/${encodeURIComponent(payload.credentialId)}`
    : `https://abraxas-app.vercel.app/verify?wallet=${encodeURIComponent(payload.suiAddress)}`;

  return {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID ?? "pass.app.abraxas.verified",
    serialNumber: serial,
    teamIdentifier: process.env.APPLE_TEAM_ID ?? "TEAM_ID",
    organizationName: "Abraxas",
    description: "Abraxas Verified Passport",
    logoText: "Abraxas",
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: "rgb(20, 20, 35)",
    labelColor: "rgb(180, 180, 200)",
    webServiceURL: getWalletPassWebServiceUrl(),
    authenticationToken: serial,
    generic: {
      headerFields: [
        {
          key: "verificationLevel",
          label: "VERIFIED",
          value: payload.verificationLevel ?? "Identity",
          textAlignment: "PKTextAlignmentRight",
        },
      ],
      primaryFields: [
        {
          key: "holder",
          label: "PASSPORT",
          value: payload.assetName ?? "Abraxas Verified",
        },
      ],
      auxiliaryFields: [
        ...(payload.lastVerified
          ? [{ key: "lastVerified", label: "LAST VERIFIED", value: payload.lastVerified }]
          : []),
        ...(payload.refreshDue
          ? [{ key: "refreshDue", label: "REFRESH DUE", value: payload.refreshDue }]
          : []),
      ],
      backFields: [
        {
          key: "details",
          label: "Verification Details",
          value: `Your verified Abraxas Passport.\n\nVerify: ${verifyUrl}`,
        },
      ],
    },
    barcode: {
      format: "PKBarcodeFormatQR",
      message: verifyUrl,
      messageEncoding: "iso-8859-1",
    },
  };
}
