"use client";
// FILE: components/partner/PartnerVerifyClient.tsx
// Abraxas Verify entry — lazy Passport creation, permission or policy routing.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { SuiSignInNavButton } from "@/components/sui/SuiSignInNavButton";
import { Btn } from "@/components/redesign/ui";
import { getPermissionDefinition } from "@/lib/verify/permissions";

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

  const relyingPartyId = searchParams.get("relying_party_id")
    ?? searchParams.get("partner_id")
    ?? "";
  const permission = searchParams.get("permission") ?? "";
  const permissionVersion = searchParams.get("permission_version") ?? "";
  const policyId = searchParams.get("policy_id") ?? "";
  const returnUrl = searchParams.get("return_url") ?? "";

  const permissionLabel = useMemo(() => {
    if (!permission) return null;
    return getPermissionDefinition(permission)?.consentLabel ?? permission;
  }, [permission]);

  const evaluate = useCallback(async () => {
    if (!relyingPartyId || !returnUrl || (!policyId && !permission)) {
      setError("Missing relying party, return URL, and permission or policy.");
      return;
    }
    if (!suiAddress) return;

    setEvaluating(true);
    setError(null);
    setStatus("Checking your credentials…");

    try {
      const res = await fetch("/api/v1/partner-flow/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          relying_party_id: relyingPartyId,
          permission: permission || undefined,
          permission_version: permissionVersion || undefined,
          policy_id: policyId || undefined,
          return_url: returnUrl,
        }),
      });
      const data = await res.json() as FlowResult;
      if (!res.ok) throw new Error(data.error ?? "Evaluation failed");

      if (data.next === "enter" && data.redirect_url) {
        setStatus("Verified — returning…");
        window.location.href = data.redirect_url;
        return;
      }
      if (data.next === "passport" && data.passport_url) {
        setStatus("Completing verification…");
        window.location.href = data.passport_url;
        return;
      }
      if (data.next === "pending_review") {
        setStatus("Your verification is under review. Check back after approval.");
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
  }, [relyingPartyId, permission, permissionVersion, policyId, returnUrl, suiAddress]);

  useEffect(() => {
    if (authLoading) return;
    if (!relyingPartyId || !returnUrl || (!policyId && !permission)) {
      setError("Invalid verification link. A permission or policy is required.");
      return;
    }
    if (suiAddress) {
      void evaluate();
    } else {
      setStatus("Sign in to continue with Abraxas.");
    }
  }, [authLoading, suiAddress, relyingPartyId, policyId, permission, returnUrl, evaluate]);

  return (
    <div style={{
      maxWidth: 520, margin: "3rem auto", padding: "1.5rem",
      fontFamily: FONT, color: "var(--text-primary)",
      background: "var(--surface-raised)", borderRadius: 16,
      border: "1px solid var(--border-strong)",
    }}>
      <div style={{ fontSize: "0.7rem", color: "#a78bfa", letterSpacing: "0.1em", marginBottom: 8 }}>
        ABRAXAS VERIFY
      </div>
      <h1 style={{ fontSize: "1.15rem", margin: "0 0 0.75rem", fontWeight: 800 }}>
        Continue with Abraxas
      </h1>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 1rem" }}>
        {permissionLabel
          ? <>Verifying: <strong>{permissionLabel}</strong></>
          : <>Policy <strong>{policyId}</strong></>}
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
