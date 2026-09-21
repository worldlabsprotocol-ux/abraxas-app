// FILE: lib/home/goodTroubleIntegrationDemo.ts
// Homepage Good Trouble integration demo copy and video constants.

import { GOOD_TROUBLE_INTEGRATION_PATH } from "@/lib/goodTrouble/constants";

export const GOOD_TROUBLE_INTEGRATION_VIDEO_ID = "GheS92n0i_M" as const;

export const GOOD_TROUBLE_INTEGRATION_EMBED_ORIGIN = "https://www.youtube-nocookie.com" as const;

export function goodTroubleIntegrationEmbedUrl(videoId: string = GOOD_TROUBLE_INTEGRATION_VIDEO_ID): string {
  return `${GOOD_TROUBLE_INTEGRATION_EMBED_ORIGIN}/embed/${videoId}?autoplay=1&rel=0`;
}

export function goodTroubleIntegrationThumbnailUrl(videoId: string = GOOD_TROUBLE_INTEGRATION_VIDEO_ID): string {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

export function goodTroubleIntegrationWatchUrl(videoId: string = GOOD_TROUBLE_INTEGRATION_VIDEO_ID): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export const HOME_GOOD_TROUBLE_INTEGRATION = {
  sectionId: "good-trouble-integration",
  eyebrow: "SANDBOX EXAMPLE",
  headline: "See Abraxas in action",
  body:
    "Prove you are 21+ for a cannabis retail request. The partner receives only an eligibility result. Your ID, date of birth, and documents stay private. This is a sandbox Partner Flow, not a live dispensary checkout.",
  primaryCta: "Try the sandbox example",
  secondaryCta: "Watch how it works",
  secondaryHref: GOOD_TROUBLE_INTEGRATION_PATH,
  videoTitle: "Good Trouble sandbox example powered by Abraxas",
  proofSteps: [
    { step: 1, label: "You prove 21+ eligibility" },
    { step: 2, label: "The partner receives only the result" },
    { step: 3, label: "Your evidence stays private" },
  ],
} as const;
