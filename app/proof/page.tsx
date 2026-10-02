// FILE: app/proof/page.tsx
// GTM proof pack — discovery + tailored reference evidence.

import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo/metadata";
import { ProofPageClient } from "@/app/proof/ProofPageClient";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";

export const metadata = pageMetadata({
  title: "Abraxas proof — reusable verification across applications",
  description:
    "See reference proof for multi-app reuse and narrow eligibility results. Keep your KYC provider; Abraxas handles what happens after verification.",
  path: "/proof",
});

export default function ProofPage() {
  return (
    <Suspense fallback={<RedesignPageLoading label="Loading proof…" />}>
      <ProofPageClient />
    </Suspense>
  );
}
