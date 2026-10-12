"use client";

import { useEffect } from "react";
import { useIntegrationStudioOperational } from "@/components/developers/integrationStudioOperationalContext";

export function IntegrationStudioOperationalBridge({
  applicationId,
  signedIn,
  returnUrl,
}: {
  applicationId: string | null;
  signedIn: boolean;
  returnUrl: string;
}) {
  const { setApplicationContext } = useIntegrationStudioOperational();

  useEffect(() => {
    setApplicationContext({ applicationId, signedIn, returnUrl });
  }, [applicationId, signedIn, returnUrl, setApplicationContext]);

  return null;
}
