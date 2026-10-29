// FILE: lib/home/homeBuilderDiscovery.ts
// Homepage builder intent — integration discovery before mandatory wallet auth.

import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import { isPolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import type { HomeBuilderIntegrationStackId } from "@/lib/home/homeBuilderIntegrationStack";

export type HomeBuilderPlatformId = "website" | "application" | "api" | "exploring";

export type HomeBuilderDiscoveryIntent = {
  platform: HomeBuilderPlatformId;
  policyPackId: PolicyPackId;
  /** Required for website before starter kit generation (Build 901). */
  integrationStack?: HomeBuilderIntegrationStackId | null;
  updatedAt: string;
};

const INTEGRATION_STACKS: HomeBuilderIntegrationStackId[] = [
  "nextjs",
  "wix_velo",
  "express",
  "universal_https",
];

function isIntegrationStackId(value: unknown): value is HomeBuilderIntegrationStackId {
  return typeof value === "string" && INTEGRATION_STACKS.includes(value as HomeBuilderIntegrationStackId);
}

export const HOME_BUILDER_DISCOVERY_STORAGE_KEY = "abx_home_builder_discovery_v1";

export const HOME_BUILDER_PLATFORMS: Array<{
  id: HomeBuilderPlatformId;
  label: string;
  detail: string;
}> = [
  { id: "website", label: "Website", detail: "Marketing site, member portal, or storefront" },
  { id: "application", label: "Application", detail: "Web or mobile product with signed-in users" },
  { id: "api", label: "API or backend", detail: "Server-side gates, webhooks, or protocol actions" },
  { id: "exploring", label: "Just exploring", detail: "See what Abraxas can verify before committing" },
];

export function readHomeBuilderDiscoveryIntent(): HomeBuilderDiscoveryIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(HOME_BUILDER_DISCOVERY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HomeBuilderDiscoveryIntent>;
    if (!parsed.platform || !parsed.policyPackId || !isPolicyPackId(parsed.policyPackId)) return null;
    return {
      platform: parsed.platform,
      policyPackId: parsed.policyPackId,
      integrationStack: isIntegrationStackId(parsed.integrationStack) ? parsed.integrationStack : null,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeHomeBuilderDiscoveryIntent(intent: Omit<HomeBuilderDiscoveryIntent, "updatedAt">): void {
  if (typeof window === "undefined") return;
  const payload: HomeBuilderDiscoveryIntent = {
    ...intent,
    updatedAt: new Date().toISOString(),
  };
  window.sessionStorage.setItem(HOME_BUILDER_DISCOVERY_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("abraxas:home-builder-intent"));
}

export function isHomeBuilderDiscoveryComplete(): boolean {
  return readHomeBuilderDiscoveryIntent() !== null;
}

export const HOME_BUILDER_CREATE_APP_UNLOCK_KEY = "abx_homepage_create_app_unlocked_v1";

export function readHomepageCreateAppUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(HOME_BUILDER_CREATE_APP_UNLOCK_KEY) === "1";
}

export function writeHomepageCreateAppUnlocked(unlocked: boolean): void {
  if (typeof window === "undefined") return;
  if (unlocked) {
    window.sessionStorage.setItem(HOME_BUILDER_CREATE_APP_UNLOCK_KEY, "1");
  } else {
    window.sessionStorage.removeItem(HOME_BUILDER_CREATE_APP_UNLOCK_KEY);
  }
  window.dispatchEvent(new CustomEvent("abraxas:homepage-create-app-unlock"));
}
