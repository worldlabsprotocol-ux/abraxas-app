import { Suspense } from "react";
import { DeFiCinematicHomeHero } from "@/components/home/defi/DeFiCinematicHomeHero";
import { RedesignHome } from "@/components/redesign/RedesignHome";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Abraxas | Holder-controlled trust & verification protocol",
  description:
    "Abraxas Passport, portable credentials, and cryptographically verifiable partner decisions, without sharing underlying identity documents or Abraxas identity databases at authorization time.",
  path: "/",
});

export default function HomePage() {
  return (
    <Suspense fallback={<RedesignPageLoading label="Loading home…" />}>
      <RedesignHome hero={<DeFiCinematicHomeHero />} />
    </Suspense>
  );
}
