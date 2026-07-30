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
}: {
  partnerId: string;
  partnerName: string;
  verifyPath: string;
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
    setStatus("Verified — welcome.");
  }, [receiptId, urlPartnerId, urlStatus, partnerId]);

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
        {unlocked ? "You're in" : "Verifying access"}
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
          <button
            type="button"
            style={{
              width: "100%", padding: "0.85rem", borderRadius: 10, border: "none",
              background: ACCENT, color: "#000", fontWeight: 800, cursor: "pointer",
              fontFamily: FONT, fontSize: "0.9rem",
            }}
          >
            Enter {partnerName}
          </button>
          {safePayload && (
            <pre style={{
              marginTop: "1rem", fontSize: "0.62rem", padding: "0.75rem",
              background: "var(--surface)", borderRadius: 8, overflow: "auto",
              color: "var(--text-muted)",
            }}>
              {JSON.stringify(safePayload, null, 2)}
            </pre>
          )}
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
            No ID images, biometrics, or document data are shared with {partnerName}.
            Only the signed verification result above is returned.
          </p>
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
