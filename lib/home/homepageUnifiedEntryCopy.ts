// FILE: lib/home/homepageUnifiedEntryCopy.ts

export const HOMEPAGE_UNIFIED_EYEBROW = "Integrate Abraxas";

export const HOMEPAGE_UNIFIED_LEAD =
  "Create a sandbox application to run verification against Abraxas policy. Solana wallet sign in is required when you create or continue a workspace. Explore documentation and the public demo without a workspace.";

export const HOMEPAGE_UNIFIED_RESOURCE_LINKS = [
  { label: "Developer documentation", href: "/developers" },
  { label: "Independent verifier", href: "/verification" },
  { label: "Public demo", href: "/try" },
] as const;

/** @deprecated Tab panels removed from homepage — routes remain for deep links elsewhere. */
export type HomeUnifiedEntryPanel = "workspace" | "how" | "evidence" | "build";

export const HOMEPAGE_UNIFIED_PANELS: ReadonlyArray<{
  id: HomeUnifiedEntryPanel;
  label: string;
  description: string;
}> = [];
