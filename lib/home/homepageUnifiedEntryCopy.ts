// FILE: lib/home/homepageUnifiedEntryCopy.ts

export const HOMEPAGE_UNIFIED_EYEBROW = "Start with Abraxas";

export const HOMEPAGE_UNIFIED_LEAD =
  "Build or resume an application, understand how verification works, and inspect a legitimate result — without leaving one continuous workspace.";

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
