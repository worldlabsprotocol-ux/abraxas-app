// FILE: lib/home/homeBuilderPlatformAdapter.ts
// Map homepage builder platform intent to Integration Studio starter-kit targets.

import type { HomeBuilderPlatformId } from "@/lib/home/homeBuilderDiscovery";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
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

export function mapHomeBuilderPlatformToStarterKit(platform: HomeBuilderPlatformId): StarterKitPlatform {
  switch (platform) {
    case "website":
      return "nextjs";
    case "application":
      return "nextjs";
    case "api":
      return "express";
    case "exploring":
      return "universal_https";
  }
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
