// FILE: components/partner/useLaunchpadVerifyResolution.ts
// Client hook to resolve hosted verification links that use ?app= slug.

"use client";

import { useEffect, useState } from "react";

export interface LaunchpadVerifyResolution {
  partnerId: string;
  policyId: string;
  returnUrl: string;
  displayName: string;
  userExplanation: string;
  disclosedResult: string;
  environment: string;
}

export function useLaunchpadVerifyResolution(
  appSlug: string | null,
  returnUrl: string | null,
): {
  loading: boolean;
  error: string | null;
  resolved: LaunchpadVerifyResolution | null;
} {
  const [loading, setLoading] = useState(Boolean(appSlug));
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<LaunchpadVerifyResolution | null>(null);

  useEffect(() => {
    if (!appSlug) {
      setLoading(false);
      setError(null);
      setResolved(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ app: appSlug });
    if (returnUrl) params.set("return_url", returnUrl);

    void fetch(`/api/launchpad/public/verify-config?${params}`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Verification link is invalid.");
          setResolved(null);
          return;
        }
        const config = data.config as {
          partner_id: string;
          policy_id: string;
          return_url: string;
          display_name: string;
          user_explanation: string;
          disclosed_result: string;
          environment: string;
        };
        setResolved({
          partnerId: config.partner_id,
          policyId: config.policy_id,
          returnUrl: config.return_url,
          displayName: config.display_name,
          userExplanation: config.user_explanation,
          disclosedResult: config.disclosed_result,
          environment: config.environment,
        });
      })
      .catch(() => {
        if (!cancelled) setError("Could not load verification configuration.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appSlug, returnUrl]);

  return { loading, error, resolved };
}
