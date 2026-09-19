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
import { SelfAttestationBrowseForm } from "@/components/partner/SelfAttestationBrowseForm";
import { GOOD_TROUBLE_BROWSE_POLICY_ID } from "@/lib/goodTrouble/constants";
import {
  planEligibilityMethods,
  resolvePackForEligibility,
} from "@/lib/partner/eligibilityMethods";
import { GOOGLE_ACCOUNT_NOT_ELIGIBILITY } from "@/lib/partner/launchpad/policyPacks";

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
  /** browse = tier 1 self-attest; checkout = tier 2 authoritative verification */
  flowTier?: "browse" | "checkout";
  browsePolicyId?: string;
  /** Purchase flow: one action card without repeated privacy paragraphs. */
  compactCheckout?: boolean;
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
  flowTier = "checkout",
  browsePolicyId = GOOD_TROUBLE_BROWSE_POLICY_ID,
  compactCheckout = false,
}: AgeAssuranceMethodChooserProps) {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<AgeAssuranceProviderPublicMeta[]>([]);
  const [existingEligible, setExistingEligible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const privacy = partnerHolderPrivacyNotes(partnerName);
  const threshold = minimumAge != null && minimumAge >= 21 ? 21 : 18;
  const pack = resolvePackForEligibility(policyId);

  const holderState: PartnerHolderState = loading
    ? "checking_existing_proof"
    : ageAssuranceStatus === "failed"
      ? "verification_could_not_confirm"
      : existingEligible
        ? "existing_proof_accepted"
        : providers.length > 0
          ? "choose_private_method"
          : "provider_unavailable";

  const checkoutCopy = resolvePartnerHolderPresentation(
    flowTier === "checkout" ? "verify_purchase_eligibility" : holderState,
    partnerName,
  );
  const copy = flowTier === "checkout"
    ? checkoutCopy
    : resolvePartnerHolderPresentation(holderState, partnerName);

  if (flowTier === "browse") {
    return (
      <SelfAttestationBrowseForm
        partnerId={partnerId}
        policyId={browsePolicyId}
        partnerName={partnerName}
        returnUrl={returnUrl}
      />
    );
  }

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

  const plan = pack
    ? planEligibilityMethods({
      pack,
      existingProofCompatible: existingEligible,
      partnerAgeCheckConfigured: true,
      privacyPreservingAvailable: providers.some((provider) => provider.authoritative || provider.configured),
      browseSelfAttestAllowed: flowTier === "browse",
    })
    : null;

  const disclosure = plan?.disclosure;

  if (compactCheckout) {
    const primaryProvider = providers[0];
    const primaryTitle = existingEligible
      ? copy.title
      : primaryProvider
        ? resolvePartnerHolderPresentation("choose_private_method", partnerName).title
        : checkoutCopy.title;
    const primaryMessage = existingEligible
      ? copy.message
      : primaryProvider
        ? resolvePartnerHolderPresentation("choose_private_method", partnerName).message
        : checkoutCopy.message;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {disclosure && (
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: "1rem" }}>Choose how to satisfy this requirement</p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", lineHeight: 1.6 }}>{disclosure.purpose}</p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", lineHeight: 1.55, color: "var(--text-muted)" }}>
              Shared result: {disclosure.disclosed_result}. Assurance required: {disclosure.assurance_level}.
              Withheld: {disclosure.withheld.join(", ")}.
            </p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", lineHeight: 1.55, color: "var(--text-muted)" }}>
              {GOOGLE_ACCOUNT_NOT_ELIGIBILITY}
            </p>
            {disclosure.economic_demo && (
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", lineHeight: 1.55 }}>
                Sandbox / testnet economic demo only. This is not real age verification and cannot be used in Production.
              </p>
            )}
          </div>
        )}
        {!disclosure && (
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: "1rem" }}>{primaryTitle}</p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", lineHeight: 1.6 }}>{primaryMessage}</p>
          </div>
        )}

        {holderState === "verification_could_not_confirm" && (
          <StatusBanner tone="info" title={copy.title}>
            {copy.message}
          </StatusBanner>
        )}

        {plan?.no_non_id_method_satisfies && (
          <StatusBanner tone="info" title="No non-ID method can satisfy this policy">
            Identity or liveness is available as an optional method. Use the partner eligibility check if it is configured.
            Completing this step does not move USDC.
          </StatusBanner>
        )}

        {existingEligible && (
          <Btn disabled={busy !== null} onClick={() => void reuseExistingProof()}>
            {busy === "reuse" ? "Confirming…" : "Use my existing compatible proof"}
          </Btn>
        )}

        {!existingEligible && primaryProvider && (
          <Btn disabled={busy !== null} onClick={() => void startProvider(primaryProvider.id)}>
            {busy === primaryProvider.id ? "Starting…" : primaryProvider.displayName}
          </Btn>
        )}

        <Btn variant="secondary" onClick={onTraditionalReturn}>
          Use {partnerName}&apos;s eligibility check
        </Btn>

        {pack && !plan?.disclosure.economic_demo && (
          <Btn variant="secondary" onClick={onFallbackId}>
            Identity / liveness (optional)
          </Btn>
        )}

        {error && (
          <p role="alert" style={{ color: "var(--text-secondary)" }}>{error}</p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p style={{ margin: 0, fontWeight: 600, fontSize: "1rem" }}>Choose how to satisfy this requirement</p>
      <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.6 }}>
        {disclosure?.purpose ?? checkoutCopy.message}
      </p>
      {disclosure && (
        <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
          Requirement: {disclosure.requirement}. Shared result: {disclosure.disclosed_result}.
          Assurance: {disclosure.assurance_level}. Withheld: {disclosure.withheld.join(", ")}.
        </p>
      )}
      <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
        {GOOGLE_ACCOUNT_NOT_ELIGIBILITY}
      </p>
      <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
        {privacy.partner_minimal}
      </p>
      {disclosure?.economic_demo && (
        <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.6 }}>
          Sandbox / testnet economic demo only. This is not real age verification and cannot be used in Production.
        </p>
      )}
      {plan?.no_non_id_method_satisfies && (
        <StatusBanner tone="info" title="No non-ID method can satisfy this policy">
          Identity or liveness is optional here. Prefer the partner eligibility check when it is configured.
        </StatusBanner>
      )}

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
            {busy === "reuse" ? "Confirming…" : "Use my existing compatible proof"}
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
        <Btn variant="secondary" onClick={onTraditionalReturn}>
          Use {partnerName}&apos;s eligibility check
        </Btn>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
          You&apos;ll return to {partnerName}. This does not move USDC.
        </p>
      </div>

      {pack && !disclosure?.economic_demo && (
      <div>
        <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>
          Identity / liveness (optional)
        </p>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", lineHeight: 1.6 }}>
          {privacy.id_fallback}
        </p>
        <Btn variant="secondary" onClick={onFallbackId}>
          Identity / liveness
        </Btn>
      </div>
      )}

      {error && (
        <p role="alert" style={{ color: "var(--text-secondary)" }}>{error}</p>
      )}
    </div>
  );
}
