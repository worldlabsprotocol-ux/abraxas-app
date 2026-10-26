import { Suspense } from "react";
import { PremiumHomeHeroCarousel } from "@/components/home/premium/PremiumHomeHeroCarousel";
import { RedesignHome } from "@/components/redesign/RedesignHome";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Abraxas | Independent trust and verification infrastructure",
  description:
    "Evidence backed trust decisions with cryptographic receipts that relying parties verify independently, with privacy minimizing disclosure.",
  path: "/",
});

export default function HomePage() {
  return (
    <Suspense fallback={<RedesignPageLoading label="Loading home…" />}>
      <RedesignHome hero={<PremiumHomeHeroCarousel />} />
    </Suspense>
  );
}
