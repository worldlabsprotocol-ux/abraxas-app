// FILE: lib/home/homeBuilderIntegrationStack.ts
// Concrete integration stacks for homepage builder intent (Build 901).

import type { HomeBuilderPlatformId } from "@/lib/home/homeBuilderDiscovery";
import type { StarterKitPlatform } from "@/lib/partner/starterKit/contract";

export type HomeBuilderIntegrationStackId = "nextjs" | "wix_velo" | "express" | "universal_https";

export const WEBSITE_INTEGRATION_STACKS: Array<{
  id: HomeBuilderIntegrationStackId;
  label: string;
}> = [
  { id: "nextjs", label: "Next.js" },
  { id: "wix_velo", label: "Wix" },
  { id: "express", label: "Node" },
  { id: "universal_https", label: "Other" },
];

export function resolveStarterKitPlatform(input: {
  platform: HomeBuilderPlatformId;
  integrationStack?: HomeBuilderIntegrationStackId | null;
}): StarterKitPlatform | null {
  switch (input.platform) {
    case "website":
      return input.integrationStack ?? null;
    case "application":
      return "nextjs";
    case "api":
      return "express";
    case "exploring":
      return "universal_https";
  }
}

export function integrationStackLabel(stack: HomeBuilderIntegrationStackId): string {
  return WEBSITE_INTEGRATION_STACKS.find((row) => row.id === stack)?.label ?? stack;
}
