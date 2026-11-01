// FILE: lib/partner/useHostedHolderBootstrap.ts
// Client hook — bootstrap Abraxas-native holder session for eligible hosted flows.

import { useEffect, useRef, useState } from "react";
import { bootstrapHostedHolderSession } from "@/lib/auth/bootstrapHostedHolderSession";
import { isHostedHolderBootstrapEligible } from "@/lib/auth/hostedHolderEligibility";

export type HostedHolderBootstrapState =
  | "idle"
  | "pending"
  | "ready"
  | "sign_in_required"
  | "ineligible"
  | "failed";

export function useHostedHolderBootstrap(input: {
  enabled: boolean;
  holderSubjectId: string | null;
  authLoading: boolean;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  purpose?: string | null;
  verifyRequestId?: string | null;
  onBootstrapped?: (holderSubjectId: string) => void;
}) {
  const [state, setState] = useState<HostedHolderBootstrapState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const onBootstrappedRef = useRef(input.onBootstrapped);
  onBootstrappedRef.current = input.onBootstrapped;

  const eligible = isHostedHolderBootstrapEligible({
    partnerId: input.partnerId,
    policyId: input.policyId,
    purpose: input.purpose,
  });

  useEffect(() => {
    if (!input.enabled || input.authLoading) return;

    if (!eligible) {
      setState("ineligible");
      return;
    }

    if (!input.holderSubjectId) {
      setState("sign_in_required");
      return;
    }

    let cancelled = false;
    setState("pending");
    setError(null);

    void bootstrapHostedHolderSession({
      partnerId: input.partnerId,
      policyId: input.policyId,
      returnUrl: input.returnUrl,
      purpose: input.purpose,
      verifyRequestId: input.verifyRequestId,
    }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        if (result.holderSubjectId !== input.holderSubjectId) {
          setState("failed");
          setError("Signed holder does not match this verification session.");
          return;
        }
        setState("ready");
        onBootstrappedRef.current?.(result.holderSubjectId);
        return;
      }
      if (result.ineligible) {
        setState("ineligible");
        return;
      }
      if (result.signInRequired) {
        setState("sign_in_required");
        return;
      }
      setState("failed");
      setError(result.error);
    });
    return () => { cancelled = true; };
  }, [
    input.enabled,
    input.authLoading,
    input.holderSubjectId,
    input.partnerId,
    input.policyId,
    input.returnUrl,
    input.purpose,
    input.verifyRequestId,
    eligible,
    retryCount,
  ]);

  const retry = () => {
    setState("idle");
    setError(null);
    setRetryCount((value) => value + 1);
  };

  return {
    eligible,
    state,
    error,
    retry,
    bootstrapping: state === "pending",
  };
}
