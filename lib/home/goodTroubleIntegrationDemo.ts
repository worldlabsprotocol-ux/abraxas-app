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
  eyebrow: "LIVE INTEGRATION",
  headline: "See private eligibility work in a real customer journey",
  body:
    "Good Trouble uses Abraxas to confirm age eligibility without collecting or exposing a customer's birth date. The customer completes one private check, receives a reusable proof, and returns to the experience with only the required result shared.",
  primaryCta: "Watch the integration",
  secondaryCta: "Try the live experience",
  secondaryHref: GOOD_TROUBLE_INTEGRATION_PATH,
  videoTitle: "Good Trouble integration powered by Abraxas",
  proofSteps: [
    { step: 1, label: "Confirm privately" },
    { step: 2, label: "Receive a reusable proof" },
    { step: 3, label: "Share only the required result" },
  ],
} as const;
