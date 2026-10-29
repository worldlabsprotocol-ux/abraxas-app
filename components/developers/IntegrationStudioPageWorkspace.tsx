"use client";

import { useSearchParams } from "next/navigation";
import { IntegrationStudioClient } from "@/app/developers/integration-studio/IntegrationStudioClient";
import { IntegrationStudioInspectorRail } from "@/components/developers/IntegrationStudioInspectorRail";
import { IntegrationStudioWorkspace } from "@/components/developers/IntegrationStudioWorkspace";

/** Standalone Integration Studio: inspector only when ?advanced=1 (Build 901 beginner surface). */
export function IntegrationStudioPageWorkspace() {
  const searchParams = useSearchParams();
  const advanced = searchParams.get("advanced") === "1";
  return (
    <IntegrationStudioWorkspace
      inspector={advanced ? <IntegrationStudioInspectorRail /> : undefined}
      beginnerSurface={!advanced}
    >
      <IntegrationStudioClient beginnerStandaloneSurface={!advanced} />
    </IntegrationStudioWorkspace>
  );
}
