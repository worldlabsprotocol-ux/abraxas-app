"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { IntegrationStudioStageId } from "@/lib/developers/useIntegrationStudioStage";

export type { IntegrationStudioStageId };

const IntegrationStudioStageContext = createContext<IntegrationStudioStageId>("policy");

export function IntegrationStudioStageProvider({
  stage,
  children,
}: {
  stage: IntegrationStudioStageId;
  children: ReactNode;
}) {
  return (
    <IntegrationStudioStageContext.Provider value={stage}>
      {children}
    </IntegrationStudioStageContext.Provider>
  );
}

export function useIntegrationStudioStageFromContext(): IntegrationStudioStageId {
  return useContext(IntegrationStudioStageContext);
}
