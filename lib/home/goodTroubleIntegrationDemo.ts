// FILE: lib/home/goodTroubleIntegrationDemo.ts
// Homepage Good Trouble production demo copy and native video constants.

import { GOOD_TROUBLE_INTEGRATION_PATH } from "@/lib/goodTrouble/constants";

export const GOOD_TROUBLE_PRODUCTION_DEMO_VIDEO_SRC = "/videos/gtdemoofficial.mp4" as const;

/** Display dimensions after rotation metadata (portrait screen recording). */
export const GOOD_TROUBLE_PRODUCTION_DEMO_DISPLAY_WIDTH = 976;
export const GOOD_TROUBLE_PRODUCTION_DEMO_DISPLAY_HEIGHT = 2074;

export const GOOD_TROUBLE_PRODUCTION_DEMO_ASPECT_RATIO =
  `${GOOD_TROUBLE_PRODUCTION_DEMO_DISPLAY_WIDTH} / ${GOOD_TROUBLE_PRODUCTION_DEMO_DISPLAY_HEIGHT}` as const;

export const GOOD_TROUBLE_PRODUCTION_DEMO_METADATA = {
  src: GOOD_TROUBLE_PRODUCTION_DEMO_VIDEO_SRC,
  durationSeconds: 42,
  codecVideo: "h264",
  codecAudio: "aac",
  fileSizeBytes: 39_361_452,
  fileSizeLabel: "38 MB",
  preload: "metadata" as const,
} as const;

export const HOME_GOOD_TROUBLE_INTEGRATION = {
  sectionId: "good-trouble-integration",
  eyebrow: "ABRAXAS × GOOD TROUBLE",
  headline: "Private eligibility in production.",
  body:
    "This production demo shows a private 21+ age eligibility flow. Good Trouble receives the narrow eligibility result, not the holder's birth date. The relying application owns the customer experience. Abraxas owns the proof interaction.",
  primaryCta: "Try the sandbox example",
  secondaryCta: "Watch the production demo",
  secondaryHref: GOOD_TROUBLE_INTEGRATION_PATH,
  videoTitle: "Abraxas and Good Trouble private eligibility production demo",
  proofSteps: [
    { step: 1, label: "Customer intent in Good Trouble" },
    { step: 2, label: "Proof only when necessary" },
    { step: 3, label: "Narrow 21+ answer returned" },
    { step: 4, label: "Customer resumes native experience" },
  ],
  mediaFootnote:
    "L0 age eligibility demonstration. Not government ID verification or a substitute for legally required ID checks.",
  videoCaption:
    "Screen recording of the production Good Trouble purchase flow showing private 21+ eligibility with Abraxas.",
} as const;
