"use client";
// FILE: components/partner/PartnerFlowReturnHandler.tsx
// After Passport approval, complete partner flow and redirect back to relying party.

import { useEffect, useRef } from "react";

interface Props {
  suiAddress: string | null;
  identityStatus: string;
  hasCredential: boolean;
  returnPath: string | null;
  partnerId: string | null;
  policyId: string | null;
  verificationRequestId: string | null;
}

export function PartnerFlowReturnHandler({
  suiAddress,
  identityStatus,
  hasCredential,
  returnPath,
  partnerId,
  policyId,
  verificationRequestId,
}: Props) {
  const completed = useRef(false);

  useEffect(() => {
    if (completed.current) return;
    if (!suiAddress || !returnPath || !partnerId || !policyId) return;
    if (identityStatus !== "earned" || !hasCredential) return;

    completed.current = true;
    const returnUrl = decodeURIComponent(returnPath);

    void (async () => {
      try {
        const res = await fetch("/api/v1/partner-flow/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            partner_id: partnerId,
            policy_id: policyId,
            return_url: returnUrl,
            verification_request_id: verificationRequestId ?? undefined,
          }),
        });
        const data = await res.json() as { redirect_url?: string; error?: string };
        if (res.ok && data.redirect_url) {
          window.location.href = data.redirect_url;
        }
      } catch {
        completed.current = false;
      }
    })();
  }, [
    suiAddress,
    identityStatus,
    hasCredential,
    returnPath,
    partnerId,
    policyId,
    verificationRequestId,
  ]);

  return null;
}
