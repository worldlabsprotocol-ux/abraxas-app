"use client";
// FILE: components/passport/ConsentCeremony.tsx
// Selective disclosure consent. holder sees exactly what will be shared.

import { useEffect, useState } from "react";
import { NEVER_SHARED_WITH_PARTNERS, POLICY_DECISIONS, type PolicyDecision } from "@/lib/abraxasNetwork";
import { consentVerificationRequest, declineVerificationRequest } from "@/lib/api/passport";
import { resolvePartnerDisplayName } from "@/lib/partner/partnerVerifyDisplay";
import { holderSafeClientMessage, resolveHolderRecovery } from "@/lib/partner/holderExperience";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
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
  onComplete?: (result: { decision: string; decision_reference: string }) => void;
  onDismiss?: () => void;
}) {
  const [preview, setPreview] = useState<ConsentPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ decision: PolicyDecision | "declined"; decision_reference: string } | null>(null);

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
      setResult({ decision, decision_reference: data.decision_reference ?? "" });
      onComplete?.({ decision, decision_reference: data.decision_reference ?? "" });
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
      <div style={{ padding: "1rem", borderRadius: 14, background: "var(--surface-raised)", border: "1px solid var(--border-strong)", marginBottom: "1.25rem" }}>
        <p role="status" aria-live="polite" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>Loading partner request…</p>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div style={{ padding: "1rem", borderRadius: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", marginBottom: "1.25rem" }}>
        <p role="alert" aria-live="assertive" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#EF4444", margin: 0 }}>{holderSafeClientMessage()}</p>
      </div>
    );
  }

  if (result) {
    if (result.decision === "declined") {
      return (
        <div style={{
          padding: "1rem 1.15rem", borderRadius: 14, marginBottom: "1.25rem",
          background: "var(--surface-inset)", border: "1px solid var(--border-strong)",
        }}>
          <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
            Request declined
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>
            No claims were shared with the partner.
          </p>
        </div>
      );
    }

    const meta = POLICY_DECISIONS[result.decision];
    return (
      <div style={{
        padding: "1rem 1.15rem", borderRadius: 14, marginBottom: "1.25rem",
        background: `${meta.color}10`, border: `1px solid ${meta.color}44`,
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: meta.color, marginBottom: "0.35rem" }}>
          Partner decision: {meta.label}
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0 0 0.35rem", lineHeight: 1.55 }}>
          {result.decision === "approved"
            ? "The partner receives only the policy result, not underlying evidence. Sandbox results are not Production-usable."
            : result.decision === "denied"
              ? resolveHolderRecovery("denied").explanation
              : meta.description}
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

  return (
    <div style={{
      padding: "1.15rem 1.25rem", borderRadius: 16, marginBottom: "1.25rem",
      background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
        color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.35rem",
      }}>
        Partner consent · selective disclosure
      </div>
      <h3 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.35rem" }}>
        {preview.policy_name}
      </h3>
      <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0 0 0.85rem", lineHeight: 1.6 }}>
        <strong>{resolvePartnerDisplayName(preview.partner_id)}</strong>
        {preview.requested_action ? ` requests access for: ${preview.requested_action.replace(/_/g, " ")}` : " requests a policy result."}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0 0 0.85rem", lineHeight: 1.6 }}>
        Abraxas is designed to return the policy decision needed for this request rather than automatically sharing your ID files.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem", marginBottom: "0.85rem" }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: ACCENT, marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Will share (claims only)
          </div>
          {preview.claim_labels.length > 0 ? preview.claim_labels.map(c => (
            <div key={c.claim_type} style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-primary)", marginBottom: 4 }}>
              ✓ {c.label}
            </div>
          )) : (
            <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Policy outcome only. No personal documents.
            </div>
          )}
        </div>
        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: "var(--text-muted)", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Will NOT share
          </div>
          {NEVER_SHARED_WITH_PARTNERS.slice(0, 6).map(item => (
            <div key={item} style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: 3 }}>
              ✗ {item}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" aria-live="assertive" style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: "0 0 0.65rem" }}>{holderSafeClientMessage()}</p>
      )}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" onClick={() => void approve()} disabled={busy}
          style={{
            padding: "0.6rem 1.1rem", borderRadius: 999, border: "none",
            background: busy ? `${ACCENT}55` : ACCENT, color: "#000",
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800,
            cursor: busy ? "wait" : "pointer",
          }}>
          {busy ? "Processing…" : "Approve & share claims →"}
        </button>
        <button type="button" onClick={() => void decline()} disabled={busy}
          style={{
            padding: "0.6rem 0.9rem", borderRadius: 999,
            border: "1px solid var(--border)", background: "transparent",
            color: "var(--text-muted)", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
            cursor: busy ? "wait" : "pointer",
          }}>
          Decline
        </button>
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", margin: "0.55rem 0 0", lineHeight: 1.5 }}>
        Google sign-in is account access only. Selecting a method earlier did not share a result.
      </p>
    </div>
  );
}
