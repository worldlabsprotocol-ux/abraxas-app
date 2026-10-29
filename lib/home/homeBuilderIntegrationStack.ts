// FILE: lib/home/homeBuilderIntegrationStack.ts
// Concrete integration stacks for homepage builder intent (Build 901).

import type { HomeBuilderPlatformId } from "@/lib/home/homeBuilderDiscovery";
import type { StarterKitPlatform } from "@/lib/partner/starterKit/contract";

export type HomeBuilderIntegrationStackId = "nextjs" | "wix_velo" | "express" | "universal_https";

export const WEBSITE_INTEGRATION_STACKS: Array<{
  id: HomeBuilderIntegrationStackId;
  label: string;
  detail: string;
}> = [
  { id: "nextjs", label: "Next.js", detail: "App Router or Pages with a server backend" },
  { id: "wix_velo", label: "Wix", detail: "Velo backend on your Wix site" },
  { id: "express", label: "Node server", detail: "Express or similar HTTPS API" },
  { id: "universal_https", label: "Other HTTPS site", detail: "Any stack with a server or serverless function" },
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
