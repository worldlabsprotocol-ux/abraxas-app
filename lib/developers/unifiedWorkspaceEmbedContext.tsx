"use client";

import { createContext, useContext, type ReactNode } from "react";
import { UNIFIED_DEVELOPER_WORKSPACE_PATH } from "@/lib/developers/unifiedWorkspaceContinuity";

export type UnifiedWorkspaceEmbedValue = {
  embeddedInDeveloperWorkspace: boolean;
  workspaceBasePath: string;
  preservedQuery: Record<string, string>;
  /** Server-restored studio pack — not an authorization credential. */
  authoritativePolicyId: string | null;
  /** Legacy hint; prefer serverPolicyLocked from authoritative_journey. */
  walletProofRecorded: boolean;
  /** From GET sandbox/workspace authoritative_journey.policy_locked (validated server state). */
  serverPolicyLocked: boolean;
};

const UnifiedWorkspaceEmbedContext = createContext<UnifiedWorkspaceEmbedValue>({
  embeddedInDeveloperWorkspace: false,
  workspaceBasePath: "/developers/integration-studio",
  preservedQuery: {},
  authoritativePolicyId: null,
  walletProofRecorded: false,
  serverPolicyLocked: false,
});

export function UnifiedWorkspaceEmbedProvider({
  children,
  embeddedInDeveloperWorkspace,
  preservedQuery = {},
  authoritativePolicyId = null,
  walletProofRecorded = false,
  serverPolicyLocked = false,
}: {
  children: ReactNode;
  embeddedInDeveloperWorkspace: boolean;
  preservedQuery?: Record<string, string>;
  authoritativePolicyId?: string | null;
  walletProofRecorded?: boolean;
  serverPolicyLocked?: boolean;
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
        serverPolicyLocked,
      }}
    >
      {children}
    </UnifiedWorkspaceEmbedContext.Provider>
  );
}

export function useUnifiedWorkspaceEmbed(): UnifiedWorkspaceEmbedValue {
  return useContext(UnifiedWorkspaceEmbedContext);
}
