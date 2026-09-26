"use client";
// FILE: components/partner/PartnerEnterClient.tsx
// Partner callback page — validates signed session receipt, no PII.

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Btn } from "@/components/redesign/ui";
import { isSessionReceiptExpired } from "@/lib/partner/sessionReceipt";
import { sanitizePartnerPayload } from "@/lib/partner/partnerVerificationResult";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

interface PublicReceipt {
  receipt_id: string;
  partner_id: string;
  policy_id: string;
  decision_result: string;
  expires_at: string | null;
  signature_valid: boolean;
  status: string;
}

export function PartnerEnterClient({
  partnerId,
  partnerName,
  verifyPath,
  accessDecisionUrl,
  successPath,
}: {
  partnerId: string;
  partnerName: string;
  verifyPath: string;
  accessDecisionUrl?: string;
  successPath: string;
}) {
  const searchParams = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);
  const [status, setStatus] = useState("Validating verification result…");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PublicReceipt | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const receiptId = searchParams.get("receipt_id");
  const urlPartnerId = searchParams.get("partner_id");
  const urlStatus = searchParams.get("status");

  const validate = useCallback(async () => {
    if (!receiptId) {
      setError("Missing receipt_id in callback URL.");
      return;
    }
    if (urlPartnerId && urlPartnerId !== partnerId) {
      setError("Partner mismatch in callback.");
      return;
    }
    if (urlStatus === "denied") {
      setError("Verification was denied.");
      return;
    }

    setStatus("Fetching signed verification result…");
    if (accessDecisionUrl) {
      const decisionUrl = `${accessDecisionUrl}?${searchParams.toString()}`;
      const res = await fetch(decisionUrl, { cache: "no-store" });
      const data = await res.json() as {
        grant?: boolean;
        outcome?: string;
        errors?: string[];
        receipt_id?: string;
        error?: string;
      };
      if (!data.grant) {
        throw new Error(data.errors?.join("; ") || data.error || `Access ${data.outcome ?? "denied"}`);
      }
      setReceipt({
        receipt_id: data.receipt_id ?? receiptId,
        partner_id: partnerId,
        policy_id: searchParams.get("policy_id") ?? "",
        decision_result: "approved",
        expires_at: null,
        signature_valid: true,
        status: "active",
      });
      setUnlocked(true);
      setStatus("Eligibility confirmed. " + partnerName + " received a signed approved result.");
      return;
    }
    const res = await fetch(`/api/receipts/${encodeURIComponent(receiptId)}/public`);
    const data = await res.json() as PublicReceipt & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Receipt not found");

    if (data.partner_id !== partnerId) {
      throw new Error("Receipt was not issued for this partner.");
    }
    if (!data.signature_valid) {
      throw new Error("Receipt signature verification failed.");
    }
    if (data.decision_result !== "approved") {
      throw new Error(`Decision was ${data.decision_result}, not approved.`);
    }
    if (data.status === "revoked") {
      throw new Error("Receipt has been revoked.");
    }
    if (isSessionReceiptExpired(data.expires_at)) {
      setReceipt(data);
      setStatus("Session receipt expired. Refresh to continue.");
      return;
    }

    setReceipt(data);
    setUnlocked(true);
    setStatus("Eligibility confirmed. " + partnerName + " received a signed approved result.");
  }, [receiptId, urlPartnerId, urlStatus, partnerId, accessDecisionUrl, searchParams]);

  async function refreshReceipt() {
    setRefreshing(true);
    setError(null);
    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}`;
      const res = await fetch("/api/v1/partner-flow/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          partner_id: partnerId,
          policy_id: receipt?.policy_id ?? searchParams.get("policy_id"),
          return_url: returnUrl,
        }),
      });
      const data = await res.json() as { redirect_url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Refresh failed");
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void validate().catch(e => setError(e instanceof Error ? e.message : "Validation failed"));
  }, [validate]);

  const safePayload = receipt
    ? sanitizePartnerPayload({
        receipt_id: receipt.receipt_id,
        partner_id: receipt.partner_id,
        policy_id: receipt.policy_id,
        decision: receipt.decision_result,
      })
    : null;

  return (
    <div style={{
      maxWidth: 520, margin: "3rem auto", padding: "1.5rem",
      fontFamily: FONT, color: "var(--text-primary)",
      background: "var(--surface-raised)", borderRadius: 16,
      border: `1px solid ${unlocked ? ACCENT : "var(--border-strong)"}`,
    }}>
      <div style={{ fontSize: "0.7rem", color: ACCENT, letterSpacing: "0.1em", marginBottom: 8 }}>
        {partnerName.toUpperCase()} · AGE-GATED ENTRY
      </div>
      <h1 style={{ fontSize: "1.15rem", margin: "0 0 0.75rem", fontWeight: 800 }}>
        {unlocked ? "Eligibility confirmed" : "Verifying access"}
      </h1>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        {status}
      </p>
      {error && <p style={{ fontSize: "0.82rem", color: "#EF4444", marginTop: "0.5rem" }}>{error}</p>}

      {receipt && !unlocked && !error && (
        <Btn onClick={() => void refreshReceipt()} disabled={refreshing} size="sm" style={{ marginTop: "1rem" }}>
          {refreshing ? "Refreshing…" : "Refresh session receipt"}
        </Btn>
      )}

      {unlocked && (
        <div style={{ marginTop: "1.25rem" }}>
          <div style={{
            display: "grid",
            gap: "0.5rem",
            padding: "0.8rem",
            borderRadius: 10,
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.2)",
            marginBottom: "0.9rem",
          }}>
            <p style={{ fontSize: "0.8rem", color: "var(--text-primary)", margin: 0, fontWeight: 700 }}>
              Shared: approved eligibility result
            </p>
            <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              Kept private: birth date, ID images, biometrics, and document data.
            </p>
          </div>
          <Btn href={successPath} size="lg" fullWidth>
            Continue to {partnerName} →
          </Btn>
          {safePayload && (
            <details style={{ marginTop: "0.8rem" }}>
              <summary style={{ fontSize: "0.7rem", color: "var(--text-muted)", cursor: "pointer" }}>
                Receipt details
              </summary>
              <pre style={{
                marginTop: "0.5rem", fontSize: "0.62rem", padding: "0.75rem",
                background: "var(--surface)", borderRadius: 8, overflow: "auto",
                color: "var(--text-muted)",
              }}>
                {JSON.stringify(safePayload, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {!unlocked && !receiptId && (
        <div style={{ marginTop: "1rem" }}>
          <Btn href={verifyPath} size="sm">Continue with Abraxas →</Btn>
        </div>
      )}
    </div>
  );
}
