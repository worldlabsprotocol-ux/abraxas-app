"use client";
// FILE: components/stocklana/StocklanaCallbackClient.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { getStocklanaAsset } from "@/lib/stocklana/catalog";
import {
  STOCKLANA_DEMO_DISCLAIMER,
  STOCKLANA_JURISDICTION_NOTICE,
} from "@/lib/stocklana/constants";
import type { StocklanaEligibilityState } from "@/lib/stocklana/validateEligibilityReceipt";
import { stocklanaVerifyUrl } from "@/lib/stocklana/partnerIntegration";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',ui-monospace,monospace";

const STATE_META: Record<StocklanaEligibilityState, { label: string; color: string; purchase: string }> = {
  permitted: { label: "Permitted", color: "#14F195", purchase: "Eligible path unlocked (demo — no live trade)" },
  denied: { label: "Denied", color: "#EF4444", purchase: "Purchase path blocked" },
  pending: { label: "Pending review", color: "#F59E0B", purchase: "Awaiting manual review" },
  expired: { label: "Expired", color: "#94A3B8", purchase: "Receipt expired — re-verify" },
  error: { label: "Error", color: "#EF4444", purchase: "Could not validate receipt" },
};

export function StocklanaCallbackClient() {
  const searchParams = useSearchParams();
  const receiptId = searchParams.get("receipt_id");
  const urlStatus = searchParams.get("status");
  const assetId = searchParams.get("asset") ?? "openai-prestocks";

  const asset = useMemo(() => getStocklanaAsset(assetId), [assetId]);

  const [state, setState] = useState<StocklanaEligibilityState>("error");
  const [detail, setDetail] = useState("Waiting for callback…");
  const [purchasePermitted, setPurchasePermitted] = useState(false);
  const [partnerReceipt, setPartnerReceipt] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (urlStatus === "denied") {
      setState("denied");
      setDetail("verification_denied_at_partner_flow");
      setPurchasePermitted(false);
      setLoading(false);
      return;
    }

    if (!receiptId) {
      setState("error");
      setDetail("missing_receipt_id");
      setPurchasePermitted(false);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/stocklana/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt_id: receiptId }),
      });
      const data = await res.json() as {
        state?: StocklanaEligibilityState;
        detail?: string;
        purchase_permitted?: boolean;
        partner_receipt?: Record<string, unknown>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? data.detail ?? "Validation failed");

      setState(data.state ?? "error");
      setDetail(data.detail ?? "unknown");
      setPurchasePermitted(Boolean(data.purchase_permitted));
      setPartnerReceipt(data.partner_receipt ?? null);
    } catch (e) {
      setState("error");
      setDetail("validation_failed");
      setPurchasePermitted(false);
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setLoading(false);
    }
  }, [receiptId, urlStatus]);

  useEffect(() => {
    void validate();
  }, [validate]);

  const meta = STATE_META[state];

  return (
    <RedesignPage accent="partner" maxWidth={720}>
      <ContentCard>
        <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
          STOCKLANA · ELIGIBILITY RESULT
        </div>
        <h1 style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, margin: "0.35rem 0 0.5rem" }}>
          {asset ? `${asset.symbol} access` : "Eligibility result"}
        </h1>
        <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
          {STOCKLANA_DEMO_DISCLAIMER}
        </p>
      </ContentCard>

      <div style={{ marginTop: "1rem" }}>
      <ContentCard>
        <div style={{
          padding: "1rem",
          borderRadius: 12,
          border: `1px solid ${meta.color}55`,
          background: `${meta.color}12`,
        }}>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: meta.color }}>
            {loading ? "Validating…" : meta.label}
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-primary)", margin: "0.35rem 0" }}>
            {meta.purchase}
          </p>
          <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
            detail={detail}
          </p>
        </div>

        {state === "denied" && detail === "jurisdiction_blocked_us" && (
          <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "#F59E0B", lineHeight: 1.6, marginTop: "0.75rem" }}>
            {STOCKLANA_JURISDICTION_NOTICE}
          </p>
        )}

        <button
          type="button"
          disabled={!purchasePermitted}
          style={{
            marginTop: "1rem",
            width: "100%",
            padding: "0.85rem",
            borderRadius: 10,
            border: "none",
            fontWeight: 800,
            fontFamily: FONT,
            cursor: purchasePermitted ? "pointer" : "not-allowed",
            background: purchasePermitted ? "#14F195" : "var(--surface)",
            color: purchasePermitted ? "#000" : "var(--text-muted)",
          }}
        >
          {purchasePermitted ? "Continue (demo — no live trade)" : "Purchase unavailable"}
        </button>

        {partnerReceipt && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.35rem" }}>
              What Stocklana received (signed metadata only)
            </div>
            <pre style={{
              fontFamily: MONO,
              fontSize: "0.6rem",
              padding: "0.75rem",
              borderRadius: 8,
              background: "var(--surface)",
              overflow: "auto",
              color: "var(--text-secondary)",
            }}>
              {JSON.stringify(partnerReceipt, null, 2)}
            </pre>
            <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              No birth date, street address, passport image, or document number is returned. Abraxas exposes claim
              references inside the signed receipt — not raw claim values.
            </p>
          </div>
        )}

        {error && (
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#EF4444", marginTop: "0.75rem" }}>{error}</p>
        )}

        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Btn href="/stocklana" variant="secondary" size="sm">← Back to Stocklana</Btn>
          <Btn href={stocklanaVerifyUrl(typeof window !== "undefined" ? window.location.origin : undefined, assetId)} size="sm">Re-verify</Btn>
        </div>
      </ContentCard>
      </div>
    </RedesignPage>
  );
}
