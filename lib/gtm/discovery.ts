// FILE: lib/gtm/discovery.ts
// Privacy-minimal four-question discovery — session storage only.

import type {
  GtmAppCountBand,
  GtmDiscoveryAnswers,
  GtmHasKycVendor,
  GtmIndustryCategory,
  GtmPrimaryPain,
} from "./contract";
import { GTM_DISCOVERY_STORAGE_KEY } from "./contract";

const INDUSTRY_SET = new Set<GtmIndustryCategory>([
  "fintech_digital_assets",
  "wallet_infrastructure",
  "marketplace",
  "age_restricted_commerce",
  "media_content",
  "other",
]);

const APP_COUNT_SET = new Set<GtmAppCountBand>(["1", "2_3", "4_plus"]);
const KYC_SET = new Set<GtmHasKycVendor>(["yes", "no"]);
const PAIN_SET = new Set<GtmPrimaryPain>([
  "repeat_verification",
  "over_collection",
  "slow_launches",
  "auditability",
  "other",
]);

export function isGtmIndustryCategory(value: string): value is GtmIndustryCategory {
  return INDUSTRY_SET.has(value as GtmIndustryCategory);
}

export function isGtmAppCountBand(value: string): value is GtmAppCountBand {
  return APP_COUNT_SET.has(value as GtmAppCountBand);
}

export function isGtmHasKycVendor(value: string): value is GtmHasKycVendor {
  return KYC_SET.has(value as GtmHasKycVendor);
}

export function isGtmPrimaryPain(value: string): value is GtmPrimaryPain {
  return PAIN_SET.has(value as GtmPrimaryPain);
}

export function parseDiscoveryAnswers(raw: unknown): GtmDiscoveryAnswers | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const industry = record.industry;
  const app_count_band = record.app_count_band;
  const has_kyc_vendor = record.has_kyc_vendor;
  const primary_pain = record.primary_pain;
  if (
    typeof industry !== "string" ||
    typeof app_count_band !== "string" ||
    typeof has_kyc_vendor !== "string" ||
    typeof primary_pain !== "string" ||
    !isGtmIndustryCategory(industry) ||
    !isGtmAppCountBand(app_count_band) ||
    !isGtmHasKycVendor(has_kyc_vendor) ||
    !isGtmPrimaryPain(primary_pain)
  ) {
    return null;
  }
  return {
    industry,
    app_count_band,
    has_kyc_vendor,
    primary_pain,
    completed_at: typeof record.completed_at === "string" ? record.completed_at : undefined,
  };
}

export function serializeDiscoveryAnswers(answers: GtmDiscoveryAnswers): string {
  return JSON.stringify({
    industry: answers.industry,
    app_count_band: answers.app_count_band,
    has_kyc_vendor: answers.has_kyc_vendor,
    primary_pain: answers.primary_pain,
    completed_at: answers.completed_at ?? new Date().toISOString(),
  });
}

export function loadDiscoveryFromSessionStorage(): GtmDiscoveryAnswers | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(GTM_DISCOVERY_STORAGE_KEY);
    if (!raw) return null;
    return parseDiscoveryAnswers(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveDiscoveryToSessionStorage(answers: GtmDiscoveryAnswers): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(GTM_DISCOVERY_STORAGE_KEY, serializeDiscoveryAnswers(answers));
}

export function clearDiscoverySessionStorage(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(GTM_DISCOVERY_STORAGE_KEY);
}

export function discoveryAnswersFromSearchParams(
  params: URLSearchParams,
): GtmDiscoveryAnswers | null {
  const industry = params.get("industry");
  const app_count_band = params.get("app_count_band");
  const has_kyc_vendor = params.get("has_kyc_vendor");
  const primary_pain = params.get("primary_pain");
  if (
    !industry ||
    !app_count_band ||
    !has_kyc_vendor ||
    !primary_pain ||
    !isGtmIndustryCategory(industry) ||
    !isGtmAppCountBand(app_count_band) ||
    !isGtmHasKycVendor(has_kyc_vendor) ||
    !isGtmPrimaryPain(primary_pain)
  ) {
    return null;
  }
  return { industry, app_count_band, has_kyc_vendor, primary_pain };
}
