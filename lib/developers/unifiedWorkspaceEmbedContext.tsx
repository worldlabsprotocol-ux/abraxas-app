"use client";

import { createContext, useContext, type ReactNode } from "react";
import { UNIFIED_DEVELOPER_WORKSPACE_PATH } from "@/lib/developers/unifiedWorkspaceContinuity";

export type UnifiedWorkspaceEmbedValue = {
  embeddedInDeveloperWorkspace: boolean;
  workspaceBasePath: string;
  preservedQuery: Record<string, string>;
  /** Server-restored sandbox policy — not an authorization credential. */
  authoritativePolicyId: string | null;
  walletProofRecorded: boolean;
};

const UnifiedWorkspaceEmbedContext = createContext<UnifiedWorkspaceEmbedValue>({
  embeddedInDeveloperWorkspace: false,
  workspaceBasePath: "/developers/integration-studio",
  preservedQuery: {},
  authoritativePolicyId: null,
  walletProofRecorded: false,
});

export function UnifiedWorkspaceEmbedProvider({
  children,
  embeddedInDeveloperWorkspace,
  preservedQuery = {},
  authoritativePolicyId = null,
  walletProofRecorded = false,
}: {
  children: ReactNode;
  embeddedInDeveloperWorkspace: boolean;
  preservedQuery?: Record<string, string>;
  authoritativePolicyId?: string | null;
  walletProofRecorded?: boolean;
}) {
  return (
    <UnifiedWorkspaceEmbedContext.Provider
      value={{
        embeddedInDeveloperWorkspace,
        workspaceBasePath: embeddedInDeveloperWorkspace
          ? UNIFIED_DEVELOPER_WORKSPACE_PATH
          : "/developers/integration-studio",
        preservedQuery,
        authoritativePolicyId,
        walletProofRecorded,
      }}
    >
      {children}
    </UnifiedWorkspaceEmbedContext.Provider>
  );
}

export function useUnifiedWorkspaceEmbed(): UnifiedWorkspaceEmbedValue {
  return useContext(UnifiedWorkspaceEmbedContext);
}
