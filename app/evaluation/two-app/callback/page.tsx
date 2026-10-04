// FILE: app/evaluation/two-app/callback/page.tsx
// Holder callback continuation for two-app sandbox evaluation.

import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo/metadata";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { TwoAppEvaluationCallbackClient } from "@/app/evaluation/two-app/callback/TwoAppEvaluationCallbackClient";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Two-app evaluation callback — Abraxas",
  description:
    "Holder returned from verification. Server-side receipt verification is required before granting access.",
  path: "/evaluation/two-app/callback",
});

export default function TwoAppEvaluationCallbackPage() {
  return (
    <RedesignPage accent="developer" maxWidth={880}>
      <PageHeader
        eyebrow="Sandbox evaluation"
        title="Holder returned — verify server-side"
        subtitle="This continuation page does not authorize access. Return to your evaluation checklist after your server verifies the signed receipt."
      />
      <Suspense fallback={<RedesignPageLoading label="Loading callback continuation…" />}>
        <TwoAppEvaluationCallbackClient />
      </Suspense>
    </RedesignPage>
  );
}
