"use client";

import { useSyncExternalStore } from "react";

export type IntegrationStudioStageId = "policy" | "sandbox" | "configuration" | "request";

export const INTEGRATION_STUDIO_STAGE_ORDER: IntegrationStudioStageId[] = [
  "policy",
  "sandbox",
  "configuration",
  "request",
];

export function integrationStudioStageFromHash(hash: string): IntegrationStudioStageId {
  if (hash === "#sandbox") return "sandbox";
  if (hash === "#configuration") return "configuration";
  if (hash === "#request") return "request";
  return "policy";
}

export function integrationStudioStageHref(stage: IntegrationStudioStageId): string {
  if (stage === "policy") return "/developers/integration-studio";
  return `/developers/integration-studio#${stage}`;
}

function subscribeIntegrationStudioHash(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("hashchange", onStoreChange);
  window.addEventListener("popstate", onStoreChange);
  return () => {
    window.removeEventListener("hashchange", onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
  };
}

function readIntegrationStudioHashStage(): IntegrationStudioStageId {
  if (typeof window === "undefined") return "policy";
  return integrationStudioStageFromHash(window.location.hash);
}

/** Prefer {@link useIntegrationStudioStageFromContext} under Integration Studio workspace. */
export function useIntegrationStudioStage(): IntegrationStudioStageId {
  return useSyncExternalStore(
    subscribeIntegrationStudioHash,
    readIntegrationStudioHashStage,
    () => "policy",
  );
}
