// FILE: lib/partner/useHostedHolderBootstrap.ts
// Client hook — bootstrap Abraxas-native holder session for eligible hosted flows.

import { useEffect, useRef, useState } from "react";
import { bootstrapHostedHolderSession } from "@/lib/auth/bootstrapHostedHolderSession";
import { isHostedHolderBootstrapEligible } from "@/lib/auth/hostedHolderEligibility";

export type HostedHolderBootstrapState =
  | "idle"
  | "pending"
  | "ready"
  | "ineligible"
  | "failed";

export function useHostedHolderBootstrap(input: {
  enabled: boolean;
  suiAddress: string | null;
  authLoading: boolean;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  purpose?: string | null;
  verifyRequestId?: string | null;
  onBootstrapped?: (suiAddress: string) => void;
}) {
  const [state, setState] = useState<HostedHolderBootstrapState>("idle");
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  const eligible = isHostedHolderBootstrapEligible({
    partnerId: input.partnerId,
    policyId: input.policyId,
    purpose: input.purpose,
  });

  useEffect(() => {
    if (!input.enabled || input.authLoading || input.suiAddress) {
      if (input.suiAddress) setState("ready");
      return;
    }

    if (!eligible) {
      setState("ineligible");
      return;
    }

    if (attemptedRef.current) return;
    attemptedRef.current = true;
    setState("pending");
    setError(null);

    void bootstrapHostedHolderSession({
      partnerId: input.partnerId,
      policyId: input.policyId,
      returnUrl: input.returnUrl,
      purpose: input.purpose,
      verifyRequestId: input.verifyRequestId,
    }).then((result) => {
      if (result.ok) {
        setState("ready");
        input.onBootstrapped?.(result.suiAddress);
        return;
      }
      if (result.ineligible) {
        setState("ineligible");
        return;
      }
      setState("failed");
      setError(result.error);
      attemptedRef.current = false;
    });
  }, [
    input.enabled,
    input.authLoading,
    input.suiAddress,
    input.partnerId,
    input.policyId,
    input.returnUrl,
    input.purpose,
    input.verifyRequestId,
    input.onBootstrapped,
    eligible,
  ]);

  const retry = () => {
    attemptedRef.current = false;
    setState("idle");
    setError(null);
  };

  return {
    eligible,
    state,
    error,
    retry,
    bootstrapping: state === "pending",
  };
}
