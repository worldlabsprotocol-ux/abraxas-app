"use client";
// FILE: components/passport/ConsentCeremony.tsx
// Holder authorization — requested / shared / withheld privacy contract.

import { useEffect, useState } from "react";
import { NEVER_SHARED_WITH_PARTNERS, POLICY_DECISIONS, type PolicyDecision } from "@/lib/abraxasNetwork";
import { consentVerificationRequest, declineVerificationRequest } from "@/lib/api/passport";
import { resolvePartnerDisplayName } from "@/lib/partner/partnerVerifyDisplay";
import { holderSafeClientMessage, resolveHolderRecovery } from "@/lib/partner/holderExperience";
import { PrivacyDisclosureCard } from "@/components/product/PrivacyDisclosureCard";
import { ProductOutcomeState } from "@/components/product/ProductOutcomeState";
import { HolderDecisionComplete } from "@/components/protocol/HolderDecisionComplete";
import { buildHolderRequestPresentation } from "@/lib/product/holderRequestPresentation";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const ACCENT = "#10B981";

export interface ConsentPreview {
  request_id: string;
  partner_id: string;
  policy_id: string;
  policy_name: string;
  requested_action: string | null;
  claim_labels: { claim_type: string; label: string; will_share: boolean }[];
  expires_at: string;
  status: string;
}

export function ConsentCeremony({
  requestId,
  identityComplete = false,
  onComplete,
  onDismiss,
}: {
  requestId: string;
  identityComplete?: boolean;
  suiAddress?: string;
  onComplete?: (result: { decision: string; decision_reference: string; receipt_id?: string | null }) => void;
  onDismiss?: () => void;
}) {
  const [preview, setPreview] = useState<ConsentPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    decision: PolicyDecision | "declined";
    decision_reference: string;
    receipt_id?: string | null;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/v1/verification-requests/${requestId}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error("preview_failed");
        setPreview(data as ConsentPreview);
      })
      .catch(() => setError(holderSafeClientMessage()))
      .finally(() => setLoading(false));
  }, [requestId]);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const data = await consentVerificationRequest(requestId);
      const decision = (data.decision ?? "manual_review") as PolicyDecision;
      setResult({
        decision,
        decision_reference: data.decision_reference ?? "",
        receipt_id: data.receipt_id ?? null,
      });
      onComplete?.({
        decision,
        decision_reference: data.decision_reference ?? "",
        receipt_id: data.receipt_id ?? null,
      });
    } catch {
      setError(holderSafeClientMessage());
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    setBusy(true);
    setError(null);
    try {
      await declineVerificationRequest(requestId);
      setResult({ decision: "declined", decision_reference: "" });
      onDismiss?.();
    } catch {
      setError(holderSafeClientMessage());
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div style={{ marginBottom: "1.25rem" }}>
        <ProductOutcomeState
          kind="info"
          title="Loading verification request"
          detail="Reviewing what the partner is asking for and what would be shared."
        />
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div style={{ marginBottom: "1.25rem" }}>
        <ProductOutcomeState
          kind="error"
          title="This request could not be loaded"
          detail={holderSafeClientMessage()}
        />
      </div>
    );
  }

  if (result) {
    if (result.decision === "declined") {
      return (
        <div style={{ marginBottom: "1.25rem" }}>
          <ProductOutcomeState
            kind="info"
            title="Request declined"
            detail="No eligibility answer was shared with the partner."
          />
        </div>
      );
    }

    if (result.decision === "approved" && result.receipt_id && preview) {
      return (
        <div style={{ marginBottom: "1.25rem" }}>
          <HolderDecisionComplete
            receiptId={result.receipt_id}
            partnerName={resolvePartnerDisplayName(preview.partner_id)}
            policyId={preview.policy_id}
            showPassportNotice
          />
        </div>
      );
    }

    const meta = POLICY_DECISIONS[result.decision];
    const sharedLabel = result.decision === "approved" ? "Policy answer shared" : meta.label;
    return (
      <div style={{
        padding: "1rem 1.15rem", borderRadius: 14, marginBottom: "1.25rem",
        background: `${meta.color}10`, border: `1px solid ${meta.color}44`,
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: meta.color, marginBottom: "0.35rem" }}>
          {sharedLabel}
        </div>
        {result.decision === "approved" && (
          <PrivacyDisclosureCard
            compact
            requested={[{ label: preview?.policy_name ?? "Eligibility policy" }]}
            shared={preview?.claim_labels.filter((c) => c.will_share).map((c) => ({ label: c.label })) ?? [{ label: "Signed eligibility answer" }]}
            withheld={NEVER_SHARED_WITH_PARTNERS.slice(0, 4).map((label) => ({ label }))}
          />
        )}
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", margin: "0.35rem 0 0", lineHeight: 1.55 }}>
          {meta.description}
        </p>
      </div>
    );
  }

  if (!preview) return null;

  if (preview.status === "cancelled" || preview.status === "decided" || preview.status === "expired") {
    const recovery = resolveHolderRecovery(preview.status === "expired" ? "expired" : "cancelled");
    return (
      <div style={{
        padding: "1rem", borderRadius: 14, marginBottom: "1.25rem",
        background: "var(--surface-inset)", border: "1px solid var(--border)",
      }}>
        <p role="status" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
          {recovery.explanation}
        </p>
      </div>
    );
  }

  const partnerName = resolvePartnerDisplayName(preview.partner_id);
  const copy = buildHolderRequestPresentation(partnerName, preview.policy_id, {
    requestedAction: preview.requested_action,
  });
  const claimShared = preview.claim_labels.filter((c) => c.will_share).map((c) => ({ label: c.label }));
  const sharedItems = claimShared.length > 0 ? claimShared : copy.sharedPreview;
  const reuseLikely = identityComplete && preview.claim_labels.length > 0;

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.92rem",
        fontWeight: 800,
        color: "var(--text-primary)",
        margin: "0 0 0.75rem",
        lineHeight: 1.45,
      }}>
        {copy.requestHeadline}
      </p>
      <PrivacyDisclosureCard
        requester={partnerName}
        requestReason={copy.requestReason}
        requested={copy.requested}
        shared={sharedItems}
        withheld={copy.withheld.length > 0
          ? copy.withheld
          : NEVER_SHARED_WITH_PARTNERS.slice(0, 6).map((label) => ({ label }))}
        reuseMessage={reuseLikely ? "Your existing verified evidence can answer this request. No new identity verification is needed." : null}
        footer={(
          <>
            {error && (
              <p role="alert" aria-live="assertive" style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: "0.75rem 0 0" }}>
                {holderSafeClientMessage()}
              </p>
            )}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.85rem" }}>
              <button type="button" onClick={() => void approve()} disabled={busy}
                style={{
                  padding: "0.6rem 1.1rem", borderRadius: 999, border: "none",
                  background: busy ? `${ACCENT}55` : ACCENT, color: "#000",
                  fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800,
                  cursor: busy ? "wait" : "pointer", minHeight: 44,
                }}>
                {busy ? "Continuing…" : "Continue verification"}
              </button>
              <button type="button" onClick={() => void decline()} disabled={busy}
                style={{
                  padding: "0.6rem 0.9rem", borderRadius: 999,
                  border: "1px solid var(--border)", background: "transparent",
                  color: "var(--text-muted)", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
                  cursor: busy ? "wait" : "pointer", minHeight: 44,
                }}>
                Decline
              </button>
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", margin: "0.55rem 0 0", lineHeight: 1.5 }}>
              Google sign-in is account access only. Abraxas returns the policy answer — not underlying identity files.
            </p>
          </>
        )}
      />
    </div>
  );
}
