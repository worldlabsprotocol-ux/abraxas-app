"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ModeCCommandRailItem } from "@/components/product/ModeCCommandRail";

export type IntegrationStudioNextActionSummary = {
  action: string;
  detail: string;
  href?: string;
  buttonLabel: string;
};

export type IntegrationStudioInspectorFocus =
  | "overview"
  | "policy"
  | "sandbox"
  | "request"
  | "response"
  | "receipt"
  | "webhook"
  | "production";

type IntegrationStudioOperationalState = {
  applicationId: string | null;
  signedIn: boolean;
  returnUrl: string;
  inspectorFocus: IntegrationStudioInspectorFocus;
  lastHttpTrace: { request: unknown; response: unknown; at: string } | null;
  operationsRail: ModeCCommandRailItem[];
  nextAction: IntegrationStudioNextActionSummary | null;
  setApplicationContext: (input: { applicationId: string | null; signedIn: boolean; returnUrl?: string }) => void;
  setOperationsPanel: (input: {
    operationsRail: ModeCCommandRailItem[];
    nextAction: IntegrationStudioNextActionSummary;
  }) => void;
  setInspectorFocus: (focus: IntegrationStudioInspectorFocus) => void;
  recordHttpTrace: (request: unknown, response: unknown) => void;
};

const IntegrationStudioOperationalContext = createContext<IntegrationStudioOperationalState | null>(null);

export function IntegrationStudioOperationalProvider({ children }: { children: ReactNode }) {
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [returnUrl, setReturnUrl] = useState("http://localhost:3000/callback");
  const [inspectorFocus, setInspectorFocus] = useState<IntegrationStudioInspectorFocus>("overview");
  const [lastHttpTrace, setLastHttpTrace] = useState<IntegrationStudioOperationalState["lastHttpTrace"]>(null);
  const [operationsRail, setOperationsRail] = useState<ModeCCommandRailItem[]>([]);
  const [nextAction, setNextAction] = useState<IntegrationStudioNextActionSummary | null>(null);

  const setApplicationContext = useCallback(
    (input: { applicationId: string | null; signedIn: boolean; returnUrl?: string }) => {
      setApplicationId(input.applicationId);
      setSignedIn(input.signedIn);
      if (input.returnUrl) setReturnUrl(input.returnUrl);
    },
    [],
  );

  const recordHttpTrace = useCallback((request: unknown, response: unknown) => {
    setLastHttpTrace({ request, response, at: new Date().toISOString() });
    setInspectorFocus("response");
  }, []);

  const setOperationsPanel = useCallback(
    (input: { operationsRail: ModeCCommandRailItem[]; nextAction: IntegrationStudioNextActionSummary }) => {
      setOperationsRail(input.operationsRail);
      setNextAction(input.nextAction);
    },
    [],
  );

  const value = useMemo(
    () => ({
      applicationId,
      signedIn,
      returnUrl,
      inspectorFocus,
      lastHttpTrace,
      operationsRail,
      nextAction,
      setApplicationContext,
      setOperationsPanel,
      setInspectorFocus,
      recordHttpTrace,
    }),
    [
      applicationId,
      signedIn,
      returnUrl,
      inspectorFocus,
      lastHttpTrace,
      operationsRail,
      nextAction,
      setApplicationContext,
      setOperationsPanel,
      recordHttpTrace,
    ],
  );

  return (
    <IntegrationStudioOperationalContext.Provider value={value}>
      {children}
    </IntegrationStudioOperationalContext.Provider>
  );
}

export function useIntegrationStudioOperational() {
  const ctx = useContext(IntegrationStudioOperationalContext);
  if (!ctx) {
    throw new Error("useIntegrationStudioOperational must be used within IntegrationStudioOperationalProvider");
  }
  return ctx;
}
