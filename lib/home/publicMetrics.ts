// FILE: lib/home/publicMetrics.ts
// Map /api/metrics/public payload to homepage stat cards.

export interface PublicMetrics {
  verified_assets?: number;
  active_credentials?: number;
  zklogin_wallets?: number;
  verification_network?: {
    manual_idv_pending?: number;
    manual_idv_approved?: number;
    credentials_issued_30d?: number;
  };
}

export interface HomeStatCard {
  key: string;
  label: string;
  value: string;
  numeric: number | null;
}

export type HomeMetricsStatus = "loading" | "ready" | "error";

/** Hide low-volume counts on the public homepage to avoid credibility noise. */
export const HOMEPAGE_METRIC_MIN_VOLUME = 10;

export function formatMetricValue(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "n/a";
  return value.toLocaleString();
}

/** Build homepage stat cards from API metrics. Returns em dash when data is missing. */
export function buildHomeStatCards(metrics: PublicMetrics | null | undefined): HomeStatCard[] {
  const vn = metrics?.verification_network;
  const verifiedIds = vn?.manual_idv_approved;
  const pending = vn?.manual_idv_pending;
  const credentials = metrics?.active_credentials ?? vn?.credentials_issued_30d;
  const assets = metrics?.verified_assets;

  return [
    { key: "verified_ids", label: "Verified identities (beta)", value: formatMetricValue(verifiedIds), numeric: verifiedIds ?? null },
    { key: "verified_assets", label: "Verified assets (beta)", value: formatMetricValue(assets), numeric: assets ?? null },
    { key: "pending_reviews", label: "Pending reviews (beta)", value: formatMetricValue(pending), numeric: pending ?? null },
    { key: "active_credentials", label: "Active credentials (beta)", value: formatMetricValue(credentials), numeric: credentials ?? null },
  ];
}

/** Public homepage: omit low-volume beta metrics that can read as empty traction. */
export function buildHomepageStatCards(metrics: PublicMetrics | null | undefined): HomeStatCard[] {
  return buildHomeStatCards(metrics).filter(
    (card) => card.numeric == null || card.numeric >= HOMEPAGE_METRIC_MIN_VOLUME,
  );
}
