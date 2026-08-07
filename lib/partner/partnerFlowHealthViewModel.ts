// FILE: lib/partner/partnerFlowHealthViewModel.ts
// Plain-language presentation for /admin/partner-flow (no sensitive payloads).

import type { PartnerFlowHealthReport } from "@/lib/partner/partnerFlowHealth";

export const PARTNER_FLOW_RATE_LIMITS_SETUP_URL =
  "https://github.com/worldlabsprotocol-ux/abraxas-app/blob/main/docs/PARTNER_FLOW_RATE_LIMITS.md#distributed-protection-vercel";

export const PARTNER_FLOW_HEALTH_CLI = "npm run partner-flow:health";

type RateLimitInfo = PartnerFlowHealthReport["rate_limit"];

export interface MetricCardView {
  value: number;
  label: string;
  description: string;
}

export interface ProtectionStatusView {
  headline: string;
  subheadline: string;
  showYellowBanner: boolean;
  yellowBannerTitle: string;
  yellowBannerBody: string;
  isCritical: boolean;
  criticalMessage: string | null;
}

export interface NextActionView {
  show: boolean;
  title: string;
  body: string;
  docUrl: string;
  docLinkLabel: string;
}

export interface EndpointActivityRowView {
  friendlyName: string;
  method: string;
  rawEndpoint: string;
  total: number;
  rateLimited: number;
  errorRatePercent: string;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

export interface TechnicalDetailsView {
  rateLimitBackend: string;
  hmacSecretConfigured: boolean;
  trustedIpStrategy: string;
  distributedStoreConfigured: boolean;
  distributedStoreActive: boolean;
  distributedStoreReachable: boolean | null;
  distributedStoreErrorCode: string | null;
  dataSources: string;
  operatorNote: string;
  envVarNames: string[];
  cliCommand: string;
  rawEndpoints: EndpointActivityRowView[];
}

const ENDPOINT_FRIENDLY_NAMES: Record<string, string> = {
  "/api/v1/partner-flow/evaluate": "Policy evaluation",
  "/api/v1/partner-flow/complete": "Flow completion",
  "/api/v1/partner-flow/refresh": "Session refresh",
  "/api/receipts/public": "Public receipt lookup",
  "/api/v1/verification-requests/consent": "Verification consent",
};

export function friendlyEndpointName(endpoint: string): string {
  if (ENDPOINT_FRIENDLY_NAMES[endpoint]) {
    return ENDPOINT_FRIENDLY_NAMES[endpoint];
  }
  if (endpoint.startsWith("/api/receipts/")) {
    return "Public receipt lookup";
  }
  if (endpoint.startsWith("/api/v1/verification-requests/")) {
    return "Verification request";
  }
  return "Partner Flow API";
}

export function buildMetricCards(
  telemetry: PartnerFlowHealthReport["telemetry"],
): MetricCardView[] {
  return [
    {
      value: telemetry.total_requests,
      label: "Total requests",
      description: "Partner Flow API calls in the last 24 hours.",
    },
    {
      value: telemetry.rate_limited_total,
      label: "Slowed-down requests",
      description: "Calls that hit a rate limit and were asked to wait.",
    },
    {
      value: telemetry.error_total,
      label: "Errors",
      description: "Calls that returned an error response.",
    },
    {
      value: telemetry.audit_persistence_failures,
      label: "Audit save issues",
      description: "Times an audit record could not be saved.",
    },
  ];
}

export function buildProtectionStatus(rateLimit: RateLimitInfo): ProtectionStatusView {
  const yellowBannerTitle = "Network-wide protection not enabled";
  const yellowBannerBody =
    "This is not a failure. Rate limits are working on each server, but limits are not yet shared across all Vercel instances. "
    + "A busy partner could still send more traffic than intended until network-wide protection is configured.";

  if (!rateLimit.enabled) {
    return {
      headline: "Protection off",
      subheadline: "Partner Flow rate limits are disabled in this environment.",
      showYellowBanner: false,
      yellowBannerTitle,
      yellowBannerBody,
      isCritical: false,
      criticalMessage: null,
    };
  }

  if (!rateLimit.hmacSecretConfigured) {
    return {
      headline: "Protection incomplete",
      subheadline: "A required server secret is missing. Public receipt protection is blocked until it is set.",
      showYellowBanner: false,
      yellowBannerTitle,
      yellowBannerBody,
      isCritical: true,
      criticalMessage:
        "Set PARTNER_FLOW_RATE_LIMIT_SALT or ABRAXAS_BROWSER_SESSION_SECRET before relying on public receipt rate limits.",
    };
  }

  if (rateLimit.distributedStoreActive) {
    return {
      headline: "Network-wide protection active",
      subheadline: "Limits are shared across all Vercel instances via Upstash Redis.",
      showYellowBanner: false,
      yellowBannerTitle,
      yellowBannerBody,
      isCritical: false,
      criticalMessage: null,
    };
  }

  if (rateLimit.distributedStoreConfigured && rateLimit.distributedStoreReachable === false) {
    return {
      headline: "Network-wide protection unavailable",
      subheadline: "Upstash Redis is configured but unreachable. Public receipt requests fail closed until connectivity is restored.",
      showYellowBanner: true,
      yellowBannerTitle: "Distributed rate limit store unreachable",
      yellowBannerBody:
        `Redis health check failed (${rateLimit.distributedStoreErrorCode ?? "unknown"}). `
        + "Limits are not silently downgraded to per-instance memory while Upstash is configured.",
      isCritical: true,
      criticalMessage: "Restore Upstash connectivity or remove UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to fall back to basic per-instance protection.",
    };
  }

  return {
    headline: "Basic per-instance protection active",
    subheadline: "Limits apply on each server instance separately. Configure Upstash Redis for network-wide protection.",
    showYellowBanner: true,
    yellowBannerTitle,
    yellowBannerBody,
    isCritical: false,
    criticalMessage: null,
  };
}

export function buildNextActionView(rateLimit: RateLimitInfo): NextActionView {
  const protection = buildProtectionStatus(rateLimit);
  const show = protection.showYellowBanner
    && rateLimit.enabled
    && rateLimit.hmacSecretConfigured
    && !rateLimit.distributedStoreActive
    && !(rateLimit.distributedStoreConfigured && rateLimit.distributedStoreReachable === false);

  return {
    show,
    title: "Enable network-wide protection",
    body:
      "To share rate limits across every Vercel server, connect a Redis store. "
      + "Until then, basic per-instance protection stays active — partners are not unprotected, but limits are not coordinated globally.",
    docUrl: PARTNER_FLOW_RATE_LIMITS_SETUP_URL,
    docLinkLabel: "Open setup guide",
  };
}

export function buildActivityEmptyMessage(windowHours: number): string {
  return `No activity yet in the last ${windowHours} hours.`;
}

export function buildEndpointActivityRows(
  report: PartnerFlowHealthReport,
): EndpointActivityRowView[] {
  return report.telemetry.by_endpoint.map(row => ({
    friendlyName: friendlyEndpointName(row.endpoint),
    method: row.method,
    rawEndpoint: row.endpoint,
    total: row.total,
    rateLimited: row.rate_limited,
    errorRatePercent: `${(row.error_rate * 100).toFixed(1)}%`,
    avgLatencyMs: row.avg_latency_ms,
    p95LatencyMs: row.p95_latency_ms,
  }));
}

export function buildTechnicalDetails(report: PartnerFlowHealthReport): TechnicalDetailsView {
  const sources: string[] = [];
  if (report.sources.partner_api_usage) sources.push("partner_api_usage");
  if (report.sources.in_memory_telemetry) sources.push("in_memory_telemetry");

  return {
    rateLimitBackend: report.rate_limit.backend,
    hmacSecretConfigured: report.rate_limit.hmacSecretConfigured,
    trustedIpStrategy: report.rate_limit.trustedIpStrategy,
    distributedStoreConfigured: report.rate_limit.distributedStoreConfigured,
    distributedStoreActive: report.rate_limit.distributedStoreActive,
    distributedStoreReachable: report.rate_limit.distributedStoreReachable,
    distributedStoreErrorCode: report.rate_limit.distributedStoreErrorCode,
    dataSources: sources.length > 0 ? sources.join(", ") : "none",
    operatorNote: report.rate_limit.note,
    envVarNames: [
      "PARTNER_FLOW_RATE_LIMIT_ENABLED",
      "PARTNER_FLOW_RATE_LIMIT_SALT",
      "ABRAXAS_BROWSER_SESSION_SECRET",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ],
    cliCommand: PARTNER_FLOW_HEALTH_CLI,
    rawEndpoints: buildEndpointActivityRows(report),
  };
}

export function hasPartnerFlowActivity(report: PartnerFlowHealthReport): boolean {
  return report.telemetry.by_endpoint.length > 0;
}
