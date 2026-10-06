// FILE: app/evaluation/two-app/page.tsx

import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo/metadata";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { TwoAppEvaluationClient } from "@/app/evaluation/two-app/TwoAppEvaluationClient";

export const metadata = pageMetadata({
  title: "Two-app reuse evaluation — Abraxas",
  description:
    "Run a 14-day sandbox evaluation: configure App A, get a verified result, reuse compatible evidence in App B, and review privacy-safe evidence.",
  path: "/evaluation/two-app",
});

export default function TwoAppEvaluationPage() {
  return (
    <RedesignPage accent="developer" maxWidth={880}>
      <PageHeader
        eyebrow="Design partner evaluation"
        title="Prove reuse across two apps"
        subtitle="Configure App A, verify the first result on your server, then reuse the same trusted evidence in App B — without collecting identity again. Progress updates from real integration events."
      />
      <Suspense fallback={<RedesignPageLoading label="Loading evaluation…" />}>
        <TwoAppEvaluationClient />
      </Suspense>
    </RedesignPage>
  );
}
