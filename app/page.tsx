import { Suspense } from "react";
import { RedesignHome } from "@/components/redesign/RedesignHome";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Abraxas | Verify what matters. Reveal nothing else.",
  description:
    "Abraxas lets applications verify eligibility without collecting underlying identity data. Holders reuse Passport evidence with consent; partners receive signed policy answers only.",
  path: "/",
});

export default function HomePage() {
  return (
    <Suspense fallback={<RedesignPageLoading label="Loading home…" />}>
      <RedesignHome />
    </Suspense>
  );
}
