import { Suspense } from "react";
import { RedesignHome } from "@/components/redesign/RedesignHome";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Abraxas | Verify once. Prove what matters.",
  description:
    "Reusable identity and eligibility infrastructure. Verify once with an Abraxas Passport. Approved partners receive signed, independently verifiable eligibility outcomes—designed for minimum necessary disclosure.",
  path: "/",
});

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <RedesignHome />
    </Suspense>
  );
}
