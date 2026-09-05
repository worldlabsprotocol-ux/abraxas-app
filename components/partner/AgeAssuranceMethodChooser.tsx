"use client";
// FILE: components/partner/AgeAssuranceMethodChooser.tsx
// Privacy-first age-assurance method selection for partner flows.

import { useCallback, useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import {
  partnerHolderPrivacyNotes,
  resolvePartnerHolderPresentation,
  type PartnerHolderState,
} from "@/lib/partner/partnerHolderCopy";
import type { AgeAssuranceProviderPublicMeta } from "@/lib/assurance/ageProviders/types";

export interface AgeAssuranceMethodChooserProps {
  partnerId: string;
  policyId: string;
  partnerName: string;
  returnUrl: string;
  verifyRequestId: string | null;
  minimumAge: number | null;
  onFallbackId: () => void;
  onTraditionalReturn: () => void;
  ageAssuranceStatus?: string | null;
}

type ProviderListResponse = {
  ok?: boolean;
  existing_proof?: { status: string; eligible_for_reuse: boolean };
  providers?: AgeAssuranceProviderPublicMeta[];
};

export function AgeAssuranceMethodChooser({
  partnerId,
  policyId,
  partnerName,
  returnUrl,
  verifyRequestId,
  minimumAge,
  onFallbackId,
  onTraditionalReturn,
  ageAssuranceStatus,
}: AgeAssuranceMethodChooserProps) {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<AgeAssuranceProviderPublicMeta[]>([]);
  const [existingEligible, setExistingEligible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const privacy = partnerHolderPrivacyNotes(partnerName);
  const threshold = minimumAge != null && minimumAge >= 21 ? 21 : 18;

  const holderState: PartnerHolderState = loading
    ? "checking_existing_proof"
    : ageAssuranceStatus === "failed"
      ? "verification_could_not_confirm"
      : existingEligible
        ? "existing_proof_accepted"
        : providers.length > 0
          ? "choose_private_method"
          : "provider_unavailable";

  const copy = resolvePartnerHolderPresentation(holderState, partnerName);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        partner_id: partnerId,
        policy_id: policyId,
        threshold: String(threshold),
      });
      const res = await fetch(`/api/age-assurance/providers?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json() as ProviderListResponse;
      if (!res.ok) {
        setError("Could not load verification options.");
        return;
      }
      setProviders(data.providers ?? []);
      setExistingEligible(Boolean(data.existing_proof?.eligible_for_reuse));
    } catch {
      setError("Could not load verification options.");
    } finally {
      setLoading(false);
    }
  }, [partnerId, policyId, threshold]);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  async function reuseExistingProof() {
    setBusy("reuse");
    setError(null);
    try {
      const res = await fetch("/api/age-assurance/reuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          partner_id: partnerId,
          policy_id: policyId,
          return_url: returnUrl,
          verification_request_id: verifyRequestId ?? undefined,
        }),
      });
      const data = await res.json() as { ok?: boolean; redirect_url?: string; error?: string };
      if (res.ok && data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }
      setError(data.error ?? "Could not reuse existing proof.");
    } catch {
      setError("Could not reuse existing proof.");
    } finally {
      setBusy(null);
    }
  }

  async function startProvider(providerId: string) {
    setBusy(providerId);
    setError(null);
    try {
      const res = await fetch("/api/age-assurance/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          provider_id: providerId,
          partner_id: partnerId,
          policy_id: policyId,
          return_url: returnUrl,
          requested_threshold: threshold,
        }),
      });
      const data = await res.json() as { ok?: boolean; redirect_url?: string; error?: string };
      if (res.ok && data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }
      setError(data.error ?? "Provider session could not be started.");
    } catch {
      setError("Provider session could not be started.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <StatusBanner tone="pending" title={copy.title}>
        {copy.message}
      </StatusBanner>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
        {privacy.auth_not_age}
      </p>
      <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
        {privacy.partner_minimal}
      </p>
      <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
        {privacy.merchant_obligation}
      </p>

      {holderState === "verification_could_not_confirm" && (
        <StatusBanner tone="info" title={copy.title}>
          {copy.message}
        </StatusBanner>
      )}

      {existingEligible && (
        <div>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>{copy.title}</p>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", lineHeight: 1.6 }}>{copy.message}</p>
          <Btn disabled={busy !== null} onClick={() => void reuseExistingProof()}>
            {busy === "reuse" ? "Confirming…" : "Use my existing Abraxas age proof"}
          </Btn>
        </div>
      )}

      {providers.length > 0 && (
        <div>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>
            {resolvePartnerHolderPresentation("choose_private_method", partnerName).title}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {providers.map(provider => (
              <Btn
                key={provider.id}
                variant="secondary"
                disabled={busy !== null}
                onClick={() => void startProvider(provider.id)}
              >
                {busy === provider.id ? "Starting…" : provider.displayName}
              </Btn>
            ))}
          </div>
        </div>
      )}

      {providers.length === 0 && !existingEligible && (
        <StatusBanner tone="info" title={copy.title}>
          {copy.message}
        </StatusBanner>
      )}

      <div>
        <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>
          {resolvePartnerHolderPresentation("id_upload_fallback", partnerName).title}
        </p>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", lineHeight: 1.6 }}>
          {privacy.id_fallback}
        </p>
        <Btn variant="secondary" onClick={onFallbackId}>
          {resolvePartnerHolderPresentation("id_upload_fallback", partnerName).action_label}
        </Btn>
      </div>

      <div>
        <Btn variant="secondary" onClick={onTraditionalReturn}>
          Use the traditional partner option
        </Btn>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
          Return to {partnerName} without Abraxas verification.
        </p>
      </div>

      {error && (
        <p role="alert" style={{ color: "var(--text-secondary)" }}>{error}</p>
      )}
    </div>
  );
}
