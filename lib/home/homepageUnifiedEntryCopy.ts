// FILE: lib/home/homepageUnifiedEntryCopy.ts

export const HOMEPAGE_UNIFIED_EYEBROW = "Integrate Abraxas";

export const HOMEPAGE_UNIFIED_LEAD =
  "Start a sandbox application, follow the protocol flow, and inspect a signed result. No sign in is required to explore the developer entry points.";

export type HomeUnifiedEntryPanel = "workspace" | "how" | "evidence" | "build";

export const HOMEPAGE_UNIFIED_PANELS: ReadonlyArray<{
  id: HomeUnifiedEntryPanel;
  label: string;
  description: string;
}> = [
  {
    id: "workspace",
    label: "Application",
    description: "Create or continue your sandbox application.",
  },
  {
    id: "how",
    label: "How it works",
    description: "See how holder-controlled verification flows to partners.",
  },
  {
    id: "evidence",
    label: "Inspect results",
    description: "Check a signed decision receipt structure.",
  },
  {
    id: "build",
    label: "Go deeper",
    description: "Launchpad, docs, and institutional entry points.",
  },
];
