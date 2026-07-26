// FILE: lib/idv/idvProvider.ts
// Which identity verification path is active (Veriff vs manual pilot review).

export type IdvProvider = "veriff" | "manual";

export function getIdvProvider(): IdvProvider {
  const forced = process.env.IDV_PROVIDER?.toLowerCase();
  if (forced === "manual" || forced === "veriff") {
    return forced;
  }
  if (process.env.VERIFF_DISABLED === "true" || process.env.VERIFF_DISABLED === "1") {
    return "manual";
  }
  if (!process.env.VERIFF_API_KEY?.trim()) {
    return "manual";
  }
  return "veriff";
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
