"use client";
// FILE: components/partner/PartnerSandboxCallbackClient.tsx
// Sandbox / Launchpad acceptance callback — receipt-authoritative display.

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import { buildPartnerSandboxCallbackView } from "@/lib/partner/partnerSandboxCallback";
import {
  resolvePartnerSandboxCallbackDisplay,
  type PartnerSandboxReceiptFetchStatus,
} from "@/lib/partner/partnerSandboxCallbackReceipt";
import type { DecisionReceiptPublicView } from "@/lib/decisionReceipts/types";
import { LiveDecisionReceiptCard } from "@/components/protocol/LiveDecisionReceiptCard";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.92rem",
  lineHeight: 1.65,
  color: "var(--text-secondary)",
  margin: 0,
};

export function PartnerSandboxCallbackClient() {
  const searchParams = useSearchParams();
  const [fetchStatus, setFetchStatus] = useState<PartnerSandboxReceiptFetchStatus>("idle");
  const [receipt, setReceipt] = useState<DecisionReceiptPublicView | null>(null);

  const urlView = useMemo(() => {
    return buildPartnerSandboxCallbackView(new URLSearchParams(searchParams.toString()));
  }, [searchParams]);

  const receiptId = urlView.hints.receipt_id;

  useEffect(() => {
    if (!receiptId) {
      setFetchStatus("idle");
      setReceipt(null);
      return;
    }

    let cancelled = false;
    setFetchStatus("loading");
    setReceipt(null);

    void (async () => {
      try {
        const res = await fetch(`/api/receipts/${encodeURIComponent(receiptId)}/public`);
        if (res.status === 404) {
          if (!cancelled) setFetchStatus("not_found");
          return;
        }
        if (!res.ok) {
          if (!cancelled) setFetchStatus("unavailable");
          return;
        }
        const data = await res.json() as DecisionReceiptPublicView;
        if (!cancelled) {
          setReceipt(data);
          setFetchStatus("loaded");
        }
      } catch {
        if (!cancelled) setFetchStatus("unavailable");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [receiptId]);

  const display = resolvePartnerSandboxCallbackDisplay({
    urlView,
    fetchStatus: receiptId ? fetchStatus : "idle",
    receipt,
  });

  return (
    <div
      className="abx-partner-sandbox-callback"
      style={{ display: "grid", gap: "1.25rem", maxWidth: 640, margin: "0 auto", textAlign: "left", padding: "0 1rem 2rem" }}
    >
      <ContentCard title={display.headline}>
        <p style={body}>{display.body}</p>

        {display.access_gate_note ? (
          <div
            role="status"
            style={{
              marginTop: "1rem",
              padding: "0.85rem 1rem",
              borderRadius: 12,
              border: "1px solid rgba(251, 191, 36, 0.45)",
              background: "rgba(251, 191, 36, 0.08)",
            }}
          >
            <p
              style={{
                ...body,
                margin: 0,
                color: "var(--text-primary)",
                fontWeight: 700,
                fontSize: "0.88rem",
              }}
            >
              Not authorization to grant access now
            </p>
            <p style={{ ...body, marginTop: "0.45rem", marginBottom: 0, fontSize: "0.86rem" }}>
              {display.access_gate_note}
            </p>
          </div>
        ) : null}

        {display.acceptability_note ? (
          <p style={{ ...body, marginTop: "0.75rem", color: "var(--text-primary)", fontWeight: 600 }}>
            {display.acceptability_note}
          </p>
        ) : null}

        {display.url_mismatches.length > 0 ? (
          <ul style={{ ...body, marginTop: "0.75rem", paddingLeft: "1.1rem", color: "#FBBF24" }}>
            {display.url_mismatches.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        {urlView.parse_errors.length > 0 ? (
          <p style={{ ...body, marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.84rem" }}>
            Callback shape: {urlView.parse_errors.join(", ")}
          </p>
        ) : null}

        {display.receipt_confirmed && display.receipt ? (
          <div
            style={{
              marginTop: "1rem",
              display: "grid",
              gap: "0.45rem",
              fontFamily: FONT,
              fontSize: "0.88rem",
            }}
          >
            <div><strong>Application:</strong> {display.receipt.partner_id}</div>
            <div><strong>Policy:</strong> {display.receipt.policy_id}</div>
            <div><strong>Decision:</strong> {display.receipt.decision_result}</div>
            <div><strong>Signature:</strong> {display.receipt.signature_valid ? "Valid" : "Invalid"}</div>
            <div>
              <strong>Currently acceptable:</strong>{" "}
              {display.receipt.currently_valid === true ? "Yes" : "No — confirm on server"}
            </div>
          </div>
        ) : null}

        {receiptId ? (
          <div style={{ marginTop: "1rem" }}>
            <p style={{ ...body, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Result reference (verify on server, not from URL alone)
            </p>
            <div
              style={{
                marginTop: "0.35rem",
                padding: "0.65rem 0.75rem",
                borderRadius: 12,
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-inset)",
                fontFamily: MONO,
                fontSize: "0.82rem",
                wordBreak: "break-all",
              }}
            >
              {receiptId}
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
          <Btn href="/developers/integration-studio" size="sm">
            Integration Studio
          </Btn>
          <Btn href="/docs/VERIFY_WITH_ABRAXAS_QUICKSTART" size="sm" variant="secondary">
            Verify integration guide
          </Btn>
        </div>
      </ContentCard>

      {display.receipt_confirmed && receiptId ? (
        <details>
          <summary
            style={{
              fontFamily: FONT,
              fontSize: "0.88rem",
              fontWeight: 700,
              color: "var(--accent)",
              cursor: "pointer",
            }}
          >
            Verification details
          </summary>
          <div style={{ marginTop: "0.85rem" }}>
            <LiveDecisionReceiptCard receiptId={receiptId} compact />
          </div>
        </details>
      ) : null}

      <ContentCard title="What this page does not do">
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.4rem" }}>
          {[
            "Does not grant access from browser callback parameters alone",
            "Does not expose API keys, wallet signatures, or identity evidence",
            "Does not replace server-side receipt verification with your sandbox API key",
          ].map((item) => (
            <li key={item} style={body}>{item}</li>
          ))}
        </ul>
        <p style={{ ...body, fontSize: "0.84rem", marginTop: "0.75rem", color: "var(--text-muted)" }}>
          Partners should call{" "}
          <code style={{ fontFamily: MONO }}>GET /api/receipts/{"{receipt_id}"}/public</code>
          {" "}from their backend. See{" "}
          <Link href="/docs/partner-flow" style={{ color: "var(--accent)", fontWeight: 700 }}>
            Partner Flow documentation
          </Link>
          .
        </p>
      </ContentCard>
    </div>
  );
}
