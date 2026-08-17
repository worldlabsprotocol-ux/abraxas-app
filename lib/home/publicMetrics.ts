// FILE: lib/home/publicMetrics.ts
// Map /api/metrics/public payload to homepage stat cards.

export interface PublicMetricsSources {
  catalog?: string;
  database?: string;
  on_chain?: string;
}

export interface PublicMetrics {
  verified_assets?: number;
  active_credentials?: number;
  zklogin_wallets?: number;
  phase?: string;
  verification_network?: {
    manual_idv_pending?: number;
    manual_idv_approved?: number;
    credentials_issued_30d?: number;
    presentations_30d?: number;
  };
}

export interface PublicMetricsPayload {
  metrics?: PublicMetrics | null;
  sources?: PublicMetricsSources;
  updatedAt?: string;
}

export interface HomeStatCard {
  key: string;
  label: string;
  value: string;
  numeric: number;
  definition: string;
  window?: string;
}

export interface HomepageMetricsView {
  cards: HomeStatCard[];
  phase?: string;
  updatedAt?: string;
  databaseSource?: string;
}

export type HomeMetricsStatus = "loading" | "ready" | "empty" | "error";

/** Hide low-volume counts on the public homepage to avoid credibility noise. */
export const HOMEPAGE_METRIC_MIN_VOLUME = 10;

interface MetricSpec {
  key: string;
  label: string;
  definition: string;
  window?: string;
  read: (metrics: PublicMetrics) => number | null | undefined;
}

const HOMEPAGE_METRIC_SPECS: MetricSpec[] = [
  {
    key: "zklogin_wallets",
    label: "Passport wallets (beta)",
    definition: "zkLogin-linked wallets recorded in Abraxas.",
    read: (m) => m.zklogin_wallets,
  },
  {
    key: "active_credentials",
    label: "Active credentials (beta)",
    definition: "Non-revoked credentials in the Abraxas credential store.",
    read: (m) => m.active_credentials,
  },
  {
    key: "credentials_30d",
    label: "Credentials issued (30d)",
    definition: "Credentials issued in the last 30 days.",
    window: "30d",
    read: (m) => m.verification_network?.credentials_issued_30d,
  },
  {
    key: "presentations_30d",
    label: "Presentations (30d)",
    definition: "Credential presentations recorded in the last 30 days.",
    window: "30d",
    read: (m) => m.verification_network?.presentations_30d,
  },
  {
    key: "idv_approved",
    label: "Approved identity reviews (beta)",
    definition: "Manual identity document reviews marked accepted.",
    read: (m) => m.verification_network?.manual_idv_approved,
  },
];

function isQualifyingCount(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= HOMEPAGE_METRIC_MIN_VOLUME;
}

export function formatMetricValue(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return value.toLocaleString();
}

/** Build qualifying homepage stat cards from API metrics. Omits sub-threshold and missing values. */
export function buildHomepageStatCards(metrics: PublicMetrics | null | undefined): HomeStatCard[] {
  if (!metrics) return [];

  const cards: HomeStatCard[] = [];
  for (const spec of HOMEPAGE_METRIC_SPECS) {
    const numeric = spec.read(metrics);
    if (!isQualifyingCount(numeric)) continue;
    cards.push({
      key: spec.key,
      label: spec.label,
      value: formatMetricValue(numeric),
      numeric,
      definition: spec.definition,
      window: spec.window,
    });
  }
  return cards;
}

export function buildHomepageMetricsView(payload: PublicMetricsPayload | null | undefined): HomepageMetricsView {
  const metrics = payload?.metrics ?? null;
  return {
    cards: buildHomepageStatCards(metrics),
    phase: metrics?.phase ?? undefined,
    updatedAt: payload?.updatedAt,
    databaseSource: payload?.sources?.database,
  };
}

/** @deprecated Use buildHomepageStatCards — kept for tests migrating from Batch 1. */
export function buildHomeStatCards(metrics: PublicMetrics | null | undefined): HomeStatCard[] {
  return buildHomepageStatCards(metrics);
}
