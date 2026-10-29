"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { IntegrationStudioOperationalProvider } from "@/components/developers/integrationStudioOperationalContext";
import { IntegrationStudioPageWorkspace } from "@/components/developers/IntegrationStudioPageWorkspace";
import { ACCOUNT_ACCESS_FIRST_PAINT } from "@/lib/product/publicOrigin";

function IntegrationStudioPublicPageInner() {
  const searchParams = useSearchParams();
  const advanced = searchParams.get("advanced") === "1";

  return (
    <>
      {advanced ? (
        <PageHeader
          eyebrow="Developers · Integration Studio"
          title="Your first integration"
          subtitle={`${ACCOUNT_ACCESS_FIRST_PAINT} Define policy, create a test app, run a holder step, receive a signed decision, and verify it independently before your app enforces permit, deny, or indeterminate.`}
        />
      ) : (
        <PageHeader eyebrow="Developers" title="Integration Studio" subtitle="" />
      )}
      <IntegrationStudioOperationalProvider>
        <IntegrationStudioPageWorkspace />
      </IntegrationStudioOperationalProvider>
    </>
  );
}

export function IntegrationStudioPublicPage() {
  return (
    <Suspense
      fallback={
        <PageHeader eyebrow="Developers" title="Integration Studio" subtitle="" />
      }
    >
      <IntegrationStudioPublicPageInner />
    </Suspense>
  );
}
