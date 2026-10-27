"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/redesign/RedesignContent";
import {
  EPHEMERAL_WORKSPACE_PAGE_EYEBROW,
  EPHEMERAL_WORKSPACE_PAGE_SUBTITLE,
  EPHEMERAL_WORKSPACE_PAGE_TITLE,
} from "@/lib/developers/ephemeralWorkspaceCopy";
import { isUnifiedWorkspaceIntegrationSearch } from "@/lib/developers/unifiedWorkspaceContinuity";

/** Hide duplicate page chrome when guided integration embed is active (Build 878). */
export function EphemeralSandboxPageHeader() {
  const searchParams = useSearchParams();
  if (isUnifiedWorkspaceIntegrationSearch(searchParams)) {
    return null;
  }
  return (
    <PageHeader
      eyebrow={EPHEMERAL_WORKSPACE_PAGE_EYEBROW}
      title={EPHEMERAL_WORKSPACE_PAGE_TITLE}
      subtitle={EPHEMERAL_WORKSPACE_PAGE_SUBTITLE}
    />
  );
}
