"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

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
  setApplicationContext: (input: { applicationId: string | null; signedIn: boolean; returnUrl?: string }) => void;
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

  const value = useMemo(
    () => ({
      applicationId,
      signedIn,
      returnUrl,
      inspectorFocus,
      lastHttpTrace,
      setApplicationContext,
      setInspectorFocus,
      recordHttpTrace,
    }),
    [
      applicationId,
      signedIn,
      returnUrl,
      inspectorFocus,
      lastHttpTrace,
      setApplicationContext,
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
