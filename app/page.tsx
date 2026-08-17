import { Suspense } from "react";
import { RedesignHome } from "@/components/redesign/RedesignHome";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Abraxas | Reusable verification for regulated apps",
  description:
    "Verify once and share only the policy outcome a partner needs. Abraxas Passport is reusable identity and proof infrastructure for partner flows, with optional identity verification when a policy requires it. Also supports tokenized real-world asset (RWA) verification workflows for design partners.",
  path: "/",
});

export default function HomePage() {
  return (
    <Suspense fallback={<RedesignPageLoading label="Loading home…" />}>
      <RedesignHome />
    </Suspense>
  );
}
