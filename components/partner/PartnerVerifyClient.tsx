"use client";
// FILE: components/partner/PartnerVerifyClient.tsx
// Generic partner verification hub — authenticate, evaluate credential, route to Passport or partner.

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { SuiSignInNavButton } from "@/components/sui/SuiSignInNavButton";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

interface FlowResult {
  next: string;
  redirect_url?: string;
  passport_url?: string;
  reason_codes?: string[];
  error?: string;
}

export function PartnerVerifyClient() {
  const searchParams = useSearchParams();
  const { suiAddress, isLoading: authLoading } = useSuiAuth();
  const [status, setStatus] = useState("Preparing verification…");
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const partnerId = searchParams.get("partner_id") ?? "";
  const policyId = searchParams.get("policy_id") ?? "";
  const returnUrl = searchParams.get("return_url") ?? "";

  const evaluate = useCallback(async () => {
    if (!partnerId || !policyId || !returnUrl) {
      setError("Missing partner_id, policy_id, or return_url.");
      return;
    }
    if (!suiAddress) return;

    setEvaluating(true);
    setError(null);
    setStatus("Checking your credential…");

    try {
      const res = await fetch("/api/v1/partner-flow/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          partner_id: partnerId,
          policy_id: policyId,
          return_url: returnUrl,
        }),
      });
      const data = await res.json() as FlowResult;
      if (!res.ok) throw new Error(data.error ?? "Evaluation failed");

      if (data.next === "enter" && data.redirect_url) {
        setStatus("Verified — returning to partner…");
        window.location.href = data.redirect_url;
        return;
      }
      if (data.next === "passport" && data.passport_url) {
        setStatus("Passport verification required…");
        window.location.href = data.passport_url;
        return;
      }
      if (data.next === "pending_review") {
        setStatus("Your verification is under manual review. Check back after approval.");
        return;
      }
      if (data.next === "denied") {
        setError(`Access denied${data.reason_codes?.length ? `: ${data.reason_codes.join(", ")}` : "."}`);
        return;
      }
      setStatus(`Next step: ${data.next}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setEvaluating(false);
    }
  }, [partnerId, policyId, returnUrl, suiAddress]);

  useEffect(() => {
    if (authLoading) return;
    if (!partnerId || !policyId || !returnUrl) {
      setError("Invalid partner verification link. partner_id, policy_id, and return_url are required.");
      return;
    }
    if (suiAddress) {
      void evaluate();
    } else {
      setStatus("Sign in to continue with Abraxas.");
    }
  }, [authLoading, suiAddress, partnerId, policyId, returnUrl, evaluate]);

  return (
    <div style={{
      maxWidth: 520, margin: "3rem auto", padding: "1.5rem",
      fontFamily: FONT, color: "var(--text-primary)",
      background: "var(--surface-raised)", borderRadius: 16,
      border: "1px solid var(--border-strong)",
    }}>
      <div style={{ fontSize: "0.7rem", color: "#a78bfa", letterSpacing: "0.1em", marginBottom: 8 }}>
        ABRAXAS PARTNER VERIFY
      </div>
      <h1 style={{ fontSize: "1.15rem", margin: "0 0 0.75rem", fontWeight: 800 }}>
        Continue with Abraxas
      </h1>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 1rem" }}>
        Partner <strong>{partnerId}</strong> · Policy <strong>{policyId}</strong>
      </p>

      {!suiAddress && !authLoading && (
        <div style={{ marginBottom: "1rem" }}>
          <SuiSignInNavButton prominent />
        </div>
      )}

      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{status}</p>
      {error && <p style={{ fontSize: "0.82rem", color: "#EF4444", marginTop: "0.5rem" }}>{error}</p>}

      {suiAddress && error && (
        <div style={{ marginTop: "1rem" }}>
          <Btn onClick={() => void evaluate()} disabled={evaluating} size="sm">
            {evaluating ? "Retrying…" : "Try again"}
          </Btn>
        </div>
      )}
    </div>
  );
}
