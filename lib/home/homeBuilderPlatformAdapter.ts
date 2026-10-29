// FILE: lib/home/homeBuilderPlatformAdapter.ts
// Map homepage builder platform intent to Integration Studio starter-kit targets.

import type { HomeBuilderPlatformId } from "@/lib/home/homeBuilderDiscovery";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import {
  resolveStarterKitPlatform,
  type HomeBuilderIntegrationStackId,
} from "@/lib/home/homeBuilderIntegrationStack";
import type { StarterKitPlatform } from "@/lib/partner/starterKit/contract";

export function homeBuilderPlatformLabel(platform: HomeBuilderPlatformId): string {
  switch (platform) {
    case "website":
      return "Website";
    case "application":
      return "Application";
    case "api":
      return "API or backend";
    case "exploring":
      return "General integration";
  }
}

/** @deprecated Prefer resolveStarterKitPlatform with explicit website stack. */
export function mapHomeBuilderPlatformToStarterKit(
  platform: HomeBuilderPlatformId,
  integrationStack?: HomeBuilderIntegrationStackId | null,
): StarterKitPlatform | null {
  return resolveStarterKitPlatform({ platform, integrationStack });
}

export function defaultStudioPathForHomePlatform(platform: HomeBuilderPlatformId): IntegrationStudioPathId {
  switch (platform) {
    case "api":
      return "server_receipt_verify";
    case "website":
    case "application":
      return "hosted_partner_flow";
    case "exploring":
      return "verify_with_abraxas";
  }
}
