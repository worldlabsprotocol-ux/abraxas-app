"use client";

import { useEffect } from "react";
import {
  useIntegrationStudioOperational,
  type IntegrationStudioNextActionSummary,
} from "@/components/developers/integrationStudioOperationalContext";
import type { ModeCCommandRailItem } from "@/components/product/ModeCCommandRail";

export function IntegrationStudioOperationalBridge({
  applicationId,
  signedIn,
  returnUrl,
  operationsRail,
  nextAction,
}: {
  applicationId: string | null;
  signedIn: boolean;
  returnUrl: string;
  operationsRail: ModeCCommandRailItem[];
  nextAction: IntegrationStudioNextActionSummary;
}) {
  const { setApplicationContext, setOperationsPanel } = useIntegrationStudioOperational();

  useEffect(() => {
    setApplicationContext({ applicationId, signedIn, returnUrl });
  }, [applicationId, signedIn, returnUrl, setApplicationContext]);

  useEffect(() => {
    setOperationsPanel({ operationsRail, nextAction });
  }, [operationsRail, nextAction, setOperationsPanel]);

  return null;
}
