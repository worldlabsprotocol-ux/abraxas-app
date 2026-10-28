"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { IntegrationStudioClient } from "@/app/developers/integration-studio/IntegrationStudioClient";
import { IntegrationStudioOperationalProvider } from "@/components/developers/integrationStudioOperationalContext";
import { IntegrationStudioWorkspace } from "@/components/developers/IntegrationStudioWorkspace";
import { UnifiedWorkspaceEmbedProvider } from "@/lib/developers/unifiedWorkspaceEmbedContext";
import { isUnifiedWorkspaceIntegrationSearch } from "@/lib/developers/unifiedWorkspaceContinuity";
import { mergeUnifiedWorkspacePreservedQuery } from "@/lib/developers/unifiedWorkspacePreservedQuery";

export function EmbeddedIntegrationStudioPanel({
  authoritativePolicyId = null,
  walletProofRecorded = false,
  serverPolicyLocked = false,
  homepageEmbed = false,
}: {
  authoritativePolicyId?: string | null;
  walletProofRecorded?: boolean;
  serverPolicyLocked?: boolean;
  homepageEmbed?: boolean;
}) {
  const searchParams = useSearchParams();
  const preservedQuery = useMemo(() => {
    const out: Record<string, string> = {};
    if (!isUnifiedWorkspaceIntegrationSearch(searchParams)) {
      out.integration = "1";
      out.source = "developer-workspace";
    } else {
      searchParams.forEach((value, key) => {
        out[key] = value;
      });
    }
    return mergeUnifiedWorkspacePreservedQuery({
      existing: out,
      authoritativePolicyId,
      walletProofRecorded,
    });
  }, [authoritativePolicyId, searchParams, walletProofRecorded]);

  return (
    <UnifiedWorkspaceEmbedProvider
      embeddedInDeveloperWorkspace
      workspaceBasePathOverride={homepageEmbed ? "/" : null}
      preservedQuery={preservedQuery}
      authoritativePolicyId={authoritativePolicyId}
      walletProofRecorded={walletProofRecorded}
      serverPolicyLocked={serverPolicyLocked}
    >
      <IntegrationStudioOperationalProvider>
        <IntegrationStudioWorkspace>
          <IntegrationStudioClient variant="embedded_workspace" />
        </IntegrationStudioWorkspace>
      </IntegrationStudioOperationalProvider>
    </UnifiedWorkspaceEmbedProvider>
  );
}
