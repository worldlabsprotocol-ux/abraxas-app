"use client";
// FILE: components/registry/CmnRegistryHero.tsx
// Institutional teaser — black backdrop until vault photography ships.

import { CmnPokemonTeaserVisual } from "@/components/registry/CmnPokemonTeaserVisual";

export function CmnRegistryHero({
  alt: _alt,
  height = 220,
}: {
  alt: string;
  height?: number;
  showComingSoon?: boolean;
}) {
  return <CmnPokemonTeaserVisual height={height} />;
}
