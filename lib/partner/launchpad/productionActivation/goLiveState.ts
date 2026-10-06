// FILE: lib/partner/launchpad/productionActivation/goLiveState.ts
// Explicit go-live state model for relying-party onboarding.

import type { LaunchpadApplicationRow, ProductionAccessRequestStatus } from "@/lib/partner/launchpad/types";
import type { ProductionActivationLifecycle } from "./contract";

export interface ProductionActivationStateInput {
  application: Pick<
    LaunchpadApplicationRow,
    "environment" | "status" | "production_activated_at" | "production_api_key_id"
  >;
  requestStatus: ProductionAccessRequestStatus | null;
  productionKeyRevoked?: boolean;
}

export function resolveProductionActivationLifecycle(
  input: ProductionActivationStateInput,
): ProductionActivationLifecycle {
  const { application, requestStatus, productionKeyRevoked } = input;

  if (application.production_activated_at && application.environment === "production") {
    if (productionKeyRevoked) return "production_approved";
    return "production_active";
  }

  if (requestStatus === "approved") return "production_approved";
  if (requestStatus === "pending") return "production_review";
  if (requestStatus === "rejected") return "sandbox";

  return application.environment === "production" ? "production_active" : "sandbox";
}

export function productionLifecycleImpliesLive(lifecycle: ProductionActivationLifecycle): boolean {
  return lifecycle === "production_active";
}
