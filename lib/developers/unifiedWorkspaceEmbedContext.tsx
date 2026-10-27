"use client";

import { createContext, useContext, type ReactNode } from "react";
import { UNIFIED_DEVELOPER_WORKSPACE_PATH } from "@/lib/developers/unifiedWorkspaceContinuity";

export type UnifiedWorkspaceEmbedValue = {
  embeddedInDeveloperWorkspace: boolean;
  workspaceBasePath: string;
  preservedQuery: Record<string, string>;
};

const UnifiedWorkspaceEmbedContext = createContext<UnifiedWorkspaceEmbedValue>({
  embeddedInDeveloperWorkspace: false,
  workspaceBasePath: "/developers/integration-studio",
  preservedQuery: {},
});

export function UnifiedWorkspaceEmbedProvider({
  children,
  embeddedInDeveloperWorkspace,
  preservedQuery = {},
}: {
  children: ReactNode;
  embeddedInDeveloperWorkspace: boolean;
  preservedQuery?: Record<string, string>;
}) {
  return (
    <UnifiedWorkspaceEmbedContext.Provider
      value={{
        embeddedInDeveloperWorkspace,
        workspaceBasePath: embeddedInDeveloperWorkspace
          ? UNIFIED_DEVELOPER_WORKSPACE_PATH
          : "/developers/integration-studio",
        preservedQuery,
      }}
    >
      {children}
    </UnifiedWorkspaceEmbedContext.Provider>
  );
}

export function useUnifiedWorkspaceEmbed(): UnifiedWorkspaceEmbedValue {
  return useContext(UnifiedWorkspaceEmbedContext);
}
