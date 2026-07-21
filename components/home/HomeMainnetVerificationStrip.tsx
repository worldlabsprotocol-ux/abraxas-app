"use client";
// FILE: components/home/HomeMainnetVerificationStrip.tsx
// Re-exports compact mainnet teaser — full scoreboard lives at /mainnet.

import { MainnetScoreboard } from "@/components/mainnet/MainnetScoreboard";

export function HomeMainnetVerificationStrip() {
  return <MainnetScoreboard variant="compact" />;
}
