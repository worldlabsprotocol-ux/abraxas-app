"use client";
// FILE: app/developers/integration-studio/SolanaUsdcPlansPanel.tsx
// Browser-first plan checkout. The customer's wallet signs and sends; Abraxas only verifies.

import { useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

type PaidPlan = "launch" | "scale";
type BillingView = {
  plan_id: "sandbox" | PaidPlan;
  active: boolean;
  paid_through: string | null;
  monthly_receipt_limit: number | null;
  monthly_api_call_limit: number | null;
  usage_period: "rolling_30_days";
  usage: { receipts: number; api_calls: number } | null;
};

type PaymentView = {
  intent_id: string;
  plan_id: PaidPlan;
  network_id: "solana_devnet" | "solana_mainnet";
  amount: string;
  currency: "USDC";
  reference: string;
  status: "pending" | "confirmed" | "expired";
  expires_at: string;
  transaction_signature?: string | null;
  payment_url?: string;
};

const body: React.CSSProperties = {
  fontFamily: ABRAXAS_FONT_SANS,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

const PLAN = {
  launch: { label: "Launch", price: "$99", included: "2,500 receipts · 100,000 API calls" },
  scale: { label: "Scale", price: "$499", included: "25,000 receipts · 1,000,000 API calls" },
} as const;

export function SolanaUsdcPlansPanel({ applicationId }: { applicationId: string }) {
  const storageKey = `abraxas_billing_intent:${applicationId}`;
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [billing, setBilling] = useState<BillingView | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  async function checkPayment(intentId: string, quiet = false) {
    if (!quiet) {
      setBusy(true);
      setNotice("");
    }
    try {
      const response = await fetch(
        `/api/launchpad/applications/${encodeURIComponent(applicationId)}/billing/solana?intent_id=${encodeURIComponent(intentId)}`,
        { credentials: "include" },
      );
      const result = await response.json() as { ok?: boolean; error?: string; payment?: PaymentView };
      if (!response.ok || !result.ok || !result.payment) {
        if (!quiet) setNotice(result.error ?? "Could not check payment.");
        return;
      }
      setPayment(result.payment);
      if (result.payment.status === "confirmed") {
        setNotice(`${PLAN[result.payment.plan_id].label} is active for 30 days.`);
        await loadBillingStatus(true);
      } else if (result.payment.status === "expired") {
        window.localStorage.removeItem(storageKey);
        setNotice("This request expired. Create a new one.");
      } else if (!quiet) {
        setNotice("Payment has not finalized yet. Pay in your wallet, then check again.");
      }
    } catch {
      if (!quiet) setNotice("Could not check payment.");
    } finally {
      if (!quiet) setBusy(false);
    }
  }

  async function loadBillingStatus(quiet = false) {
    try {
      const response = await fetch(
        `/api/launchpad/applications/${encodeURIComponent(applicationId)}/billing/solana`,
        { credentials: "include" },
      );
      const result = await response.json() as {
        ok?: boolean;
        error?: string;
        billing?: BillingView;
        payment?: PaymentView | null;
      };
      if (!response.ok || !result.ok || !result.billing) {
        if (!quiet) setNotice(result.error ?? "Could not load plan status.");
        return;
      }
      setBilling(result.billing);
      if (result.payment) {
        setPayment(result.payment);
        window.localStorage.setItem(storageKey, result.payment.intent_id);
      }
    } catch {
      if (!quiet) setNotice("Could not load plan status.");
    }
  }

  useEffect(() => {
    const intentId = window.localStorage.getItem(storageKey);
    if (intentId) void checkPayment(intentId, true);
    void loadBillingStatus(true);
    // The application id defines a separate local recovery slot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  async function createPayment(planId: PaidPlan) {
    setBusy(true);
    setNotice("");
    setCopied(false);
    try {
      const response = await fetch(
        `/api/launchpad/applications/${encodeURIComponent(applicationId)}/billing/solana`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ plan_id: planId }),
        },
      );
      const result = await response.json() as { ok?: boolean; error?: string; payment?: PaymentView };
      if (!response.ok || !result.ok || !result.payment) {
        setNotice(result.error ?? "Could not create payment request.");
        return;
      }
      setPayment(result.payment);
      window.localStorage.setItem(storageKey, result.payment.intent_id);
      setNotice("Open the request in your Solana wallet. Abraxas activates the plan after finalization.");
    } catch {
      setNotice("Could not create payment request.");
    } finally {
      setBusy(false);
    }
  }

  async function copyPaymentLink() {
    if (!payment?.payment_url) return;
    await navigator.clipboard.writeText(payment.payment_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <ContentCard title="Plans · Pay with USDC">
      <p style={{ ...body, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
        Keep building free in Sandbox, or activate a paid usage plan for 30 days with USDC on Solana.
      </p>
      {billing?.active && billing.paid_through && (
        <section role="status" style={{ border: "1px solid rgba(45,212,191,0.5)", background: "rgba(45,212,191,0.08)", borderRadius: 12, padding: "0.8rem", marginBottom: "0.75rem" }}>
          <p style={{ ...body, color: "var(--text-primary)", fontWeight: 800 }}>
            {PLAN[billing.plan_id as PaidPlan].label} is active
          </p>
          <p style={{ ...body, marginTop: "0.25rem" }}>
            Paid through {new Date(billing.paid_through).toLocaleString()}
          </p>
          {billing.usage && billing.monthly_receipt_limit != null && billing.monthly_api_call_limit != null && (
            <div style={{ display: "grid", gap: "0.55rem", marginTop: "0.65rem" }}>
              <div>
                <p style={{ ...body, fontSize: "0.75rem" }}>
                  {billing.usage.receipts.toLocaleString()} of {billing.monthly_receipt_limit.toLocaleString()} receipts used
                </p>
                <progress
                  aria-label="Receipt allowance used"
                  max={billing.monthly_receipt_limit}
                  value={Math.min(billing.usage.receipts, billing.monthly_receipt_limit)}
                  style={{ width: "100%", accentColor: "var(--accent)" }}
                />
              </div>
              <div>
                <p style={{ ...body, fontSize: "0.75rem" }}>
                  {billing.usage.api_calls.toLocaleString()} of {billing.monthly_api_call_limit.toLocaleString()} API calls used
                </p>
                <progress
                  aria-label="API allowance used"
                  max={billing.monthly_api_call_limit}
                  value={Math.min(billing.usage.api_calls, billing.monthly_api_call_limit)}
                  style={{ width: "100%", accentColor: "var(--accent)" }}
                />
              </div>
              <p style={{ ...body, fontSize: "0.7rem" }}>Usage shown for the last 30 days.</p>
            </div>
          )}
        </section>
      )}
      <div style={{ display: "grid", gap: "0.65rem", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        {(Object.keys(PLAN) as PaidPlan[]).map((planId) => (
          <section key={planId} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "0.8rem" }}>
            <p style={{ ...body, color: "var(--text-primary)", fontWeight: 800 }}>
              {PLAN[planId].label} · {PLAN[planId].price}/30 days
            </p>
            <p style={{ ...body, margin: "0.35rem 0 0.65rem" }}>{PLAN[planId].included}</p>
            <Btn size="sm" disabled={busy} loading={busy} onClick={() => void createPayment(planId)}>
              Pay {PLAN[planId].price} USDC
            </Btn>
          </section>
        ))}
      </div>

      {payment && (
        <section style={{ marginTop: "0.8rem", border: "1px solid var(--border)", borderRadius: 12, padding: "0.8rem" }}>
          <p style={{ ...body, color: "var(--text-primary)", fontWeight: 800 }}>
            {PLAN[payment.plan_id].label} · {payment.amount} {payment.currency} · {payment.network_id === "solana_mainnet" ? "Solana mainnet" : "Solana devnet"}
          </p>
          <p style={{ ...body, marginTop: "0.3rem" }}>
            Status: <strong>{payment.status}</strong>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginTop: "0.65rem" }}>
            {payment.status === "pending" && payment.payment_url && (
              <a
                href={payment.payment_url}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: 999,
                  background: "var(--accent)",
                  color: "#07111f",
                  padding: "0.48rem 0.8rem",
                  fontFamily: ABRAXAS_FONT_SANS,
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                Open Solana wallet
              </a>
            )}
            {payment.status === "pending" && (
              <>
                <Btn size="sm" variant="secondary" disabled={busy} onClick={() => void copyPaymentLink()}>
                  {copied ? "Copied" : "Copy payment link"}
                </Btn>
                <Btn size="sm" variant="secondary" disabled={busy} loading={busy} onClick={() => void checkPayment(payment.intent_id)}>
                  Check payment
                </Btn>
              </>
            )}
          </div>
          <details style={{ marginTop: "0.65rem" }}>
            <summary style={{ ...body, cursor: "pointer", color: "var(--accent)", fontWeight: 800 }}>Payment details</summary>
            <p style={{ ...body, marginTop: "0.45rem", fontFamily: ABRAXAS_FONT_MONO, overflowWrap: "anywhere" }}>
              Reference: {payment.reference}
            </p>
            <p style={{ ...body, marginTop: "0.35rem" }}>Expires {new Date(payment.expires_at).toLocaleString()}</p>
          </details>
        </section>
      )}

      <p aria-live="polite" style={{ ...body, marginTop: "0.65rem", color: payment?.status === "confirmed" ? "var(--accent)" : "var(--text-secondary)" }}>
        {notice}
      </p>
      <p style={{ ...body, marginTop: "0.5rem", fontSize: "0.74rem" }}>
        Your wallet sends directly to the configured Abraxas billing address. Abraxas never holds your keys or signs the transfer. Payment activates usage limits only; Production still requires separate review.
      </p>
    </ContentCard>
  );
}
