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
  sandboxReceipt = false,
}: {
  partnerId: string;
  partnerName: string;
  verifyPath: string;
  accessDecisionUrl?: string;
  successPath: string;
  sandboxReceipt?: boolean;
}) {
  const searchParams = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);
  const [status, setStatus] = useState("Validating verification result…");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PublicReceipt | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [receiptIdCopied, setReceiptIdCopied] = useState(false);

  const receiptId = searchParams.get("receipt_id");
  const urlPartnerId = searchParams.get("partner_id");
  const urlStatus = searchParams.get("status");

  const validate = useCallback(async () => {
    if (!receiptId) {
      setError("We could not find a verification result for this return.");
      return;
    }
    if (urlPartnerId && urlPartnerId !== partnerId) {
      setError("This verification result belongs to a different service.");
      return;
    }
    if (urlStatus === "denied") {
      setError("This verification did not confirm eligibility.");
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
        throw new Error("We could not confirm this verification result.");
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
    void validate().catch(() => setError("We could not confirm this verification result."));
  }, [validate]);

  const safePayload = receipt
    ? sanitizePartnerPayload({
        receipt_id: receipt.receipt_id,
        partner_id: receipt.partner_id,
        policy_id: receipt.policy_id,
        decision: receipt.decision_result,
      })
    : null;

  const receiptVerifierHref = receipt
    ? `/verify?mode=receipt&receipt_id=${encodeURIComponent(receipt.receipt_id)}&partner_id=${encodeURIComponent(receipt.partner_id)}&policy_id=${encodeURIComponent(receipt.policy_id)}${sandboxReceipt ? "&allow_sandbox=1" : ""}`
    : "/verify?mode=receipt";

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
        {error ? "Verification needs attention" : unlocked ? "Eligibility confirmed" : "Verifying access"}
      </h1>
      {!error && (
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {status}
        </p>
      )}
      {error && (
        <div role="alert" style={{ marginTop: "0.5rem" }}>
          <p style={{ fontSize: "0.82rem", color: "#FCA5A5", margin: "0 0 0.8rem", lineHeight: 1.55 }}>
            {error}
          </p>
          <Btn href={verifyPath} size="lg" fullWidth>
            Try verification again →
          </Btn>
        </div>
      )}

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
          {receipt && (
            <div style={{
              marginTop: "0.9rem",
              padding: "0.8rem",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}>
              <p style={{ fontSize: "0.76rem", color: "var(--text-primary)", margin: "0 0 0.35rem", fontWeight: 700 }}>
                Keep this receipt for the demo
              </p>
              <code style={{ display: "block", fontSize: "0.66rem", color: "var(--text-secondary)", overflowWrap: "anywhere", userSelect: "text", marginBottom: "0.65rem" }}>
                {receipt.receipt_id}
              </code>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                <Btn
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void navigator.clipboard.writeText(receipt.receipt_id).then(() => {
                      setReceiptIdCopied(true);
                      setTimeout(() => setReceiptIdCopied(false), 1500);
                    });
                  }}
                >
                  {receiptIdCopied ? "Receipt ID copied" : "Copy receipt ID"}
                </Btn>
                <Btn href={receiptVerifierHref} size="sm" variant="secondary">
                  Verify receipt →
                </Btn>
                <Btn href={`/api/receipts/${encodeURIComponent(receipt.receipt_id)}/public`} size="sm" variant="ghost">
                  Public receipt JSON →
                </Btn>
              </div>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: "0.65rem 0 0", lineHeight: 1.5 }}>
                This is the receipt ID used by receipt tools. It is different from a Launchpad application ID or Solana transaction signature.
              </p>
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.75rem" }}>
            <Btn href="/passport" size="sm" variant="secondary">Open Passport activity →</Btn>
            <Btn href="/pilot-journey" size="sm" variant="ghost">Return to Week 2 journey →</Btn>
          </div>
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

    </div>
  );
}
