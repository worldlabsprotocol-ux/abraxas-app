// FILE: lib/idv/idvProvider.ts
// Which identity verification path is active (Abraxas Verify vs legacy Veriff).

export type IdvProvider = "veriff" | "manual";

/**
 * Abraxas Verify is the default. Legacy Veriff runs only when IDV_PROVIDER=veriff
 * is set explicitly (third-party opt-in, not automatic).
 */
export function getIdvProvider(): IdvProvider {
  const forced = process.env.IDV_PROVIDER?.toLowerCase();
  if (forced === "manual" || forced === "veriff") {
    return forced;
  }
  return "manual";
}

export function isVeriffLive(): boolean {
  return getIdvProvider() === "veriff";
}

export function idvProviderLabel(provider: IdvProvider): string {
  return provider === "veriff"
    ? "Legacy automated IDV"
    : "Abraxas Verify";
}

/** True when Abraxas-native capture is the active path (not Veriff). */
export function isAbraxasIndependentIdv(): boolean {
  return getIdvProvider() === "manual";
}
