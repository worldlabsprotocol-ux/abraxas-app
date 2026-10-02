import { Suspense } from "react";
import { RedesignHome } from "@/components/redesign/RedesignHome";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Abraxas | Reusable verification for multi-app platforms",
  description:
    "Stop re-verifying the same customer across every app. Keep your KYC provider — Abraxas turns trusted verification into reusable, application-specific answers.",
  path: "/",
});

export default function HomePage() {
  return (
    <Suspense fallback={<RedesignPageLoading label="Loading home…" />}>
      <RedesignHome />
    </Suspense>
  );
}
