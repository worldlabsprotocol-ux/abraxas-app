import { Suspense } from "react";
import { RedesignHome } from "@/components/redesign/RedesignHome";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Abraxas | Independent trust & eligibility infrastructure",
  description:
    "Policy-specific authorization without shared identity databases. Signed decision receipts, independent verification, and reusable holder evidence.",
  path: "/",
});

export default function HomePage() {
  return (
    <Suspense fallback={<RedesignPageLoading label="Loading home…" />}>
      <RedesignHome />
    </Suspense>
  );
}
