"use client";
// FILE: components/partner/PartnerSandboxCallbackClient.tsx
// Sandbox / Launchpad acceptance callback — receipt-authoritative, holder-first display.

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AbxCard } from "@/components/design/AbxPrimitives";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import { buildPartnerSandboxCallbackView } from "@/lib/partner/partnerSandboxCallback";
import {
  resolvePartnerSandboxCallbackDisplay,
  type PartnerSandboxCallbackStatusRow,
  type PartnerSandboxReceiptFetchStatus,
} from "@/lib/partner/partnerSandboxCallbackReceipt";
import type { DecisionReceiptPublicView } from "@/lib/decisionReceipts/types";
import { LiveDecisionReceiptCard } from "@/components/protocol/LiveDecisionReceiptCard";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const bodyBase: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "clamp(1rem, 2.8vw, 1.0625rem)",
  lineHeight: 1.65,
  color: "var(--text-secondary)",
  margin: 0,
};

function statusValueStyle(row: PartnerSandboxCallbackStatusRow): React.CSSProperties {
  const color =
    row.emphasis === "positive"
      ? "var(--text-primary)"
      : row.emphasis === "warning"
        ? "#FBBF24"
        : row.emphasis === "negative"
          ? "#F87171"
          : "var(--text-secondary)";
  return { color, fontWeight: row.emphasis === "neutral" ? 500 : 700 };
}

function StatusSummary({ rows }: { rows: PartnerSandboxCallbackStatusRow[] }) {
  if (rows.length === 0) return null;
  return (
    <dl className="abx-partner-sandbox-callback__status-dl" aria-label="Verification status">
      {rows.map((row) => (
        <div key={row.label} className="abx-partner-sandbox-callback__status-row">
          <dt style={{ margin: 0, color: "var(--text-muted)", fontWeight: 600 }}>{row.label}</dt>
          <dd style={{ margin: 0, textAlign: "right", ...statusValueStyle(row) }}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Holder flows may leave modal scroll locks; callback must always use document scroll. */
function useRestoreDocumentScroll() {
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);
}

export function PartnerSandboxCallbackClient() {
  useRestoreDocumentScroll();

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

  const showDeveloperDetails = Boolean(receiptId && (display.receipt_confirmed || display.receipt));
  const showSandboxNote = display.receipt?.decision_context === "sandbox_only";

  return (
    <div className="abx-partner-sandbox-callback" data-testid="partner-sandbox-callback">
      <AbxCard className="abx-partner-sandbox-callback__card abx-card" padding="clamp(1.1rem, 3vw, 1.35rem)">
        <h1
          style={{
            fontFamily: FONT,
            fontSize: "var(--fs-h2, clamp(1.25rem, 3.5vw, 1.5rem))",
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: "0 0 0.75rem",
            lineHeight: 1.3,
          }}
        >
          {display.headline}
        </h1>

        <p style={bodyBase}>{display.body}</p>

        {showSandboxNote ? (
          <p className="abx-partner-sandbox-callback__sandbox-note" role="note">
            Sandbox environment — your application validates this record with its sandbox API key. Production
            authorization requires a production-usable receipt verified on your server.
          </p>
        ) : null}

        {display.subheadline ? (
          <p
            style={{
              ...bodyBase,
              marginTop: "1.1rem",
              color: "var(--text-primary)",
              fontWeight: 700,
              fontSize: "clamp(1.02rem, 2.9vw, 1.125rem)",
            }}
          >
            {display.subheadline}
          </p>
        ) : null}

        {display.subbody ? (
          <p style={{ ...bodyBase, marginTop: display.subheadline ? "0.45rem" : "1rem" }}>{display.subbody}</p>
        ) : null}

        {display.holder_link_caution ? (
          <div
            role="status"
            style={{
              marginTop: "1.15rem",
              padding: "0.9rem 1rem",
              borderRadius: 12,
              border: "1px solid rgba(251, 191, 36, 0.45)",
              background: "rgba(251, 191, 36, 0.08)",
            }}
          >
            <p style={{ ...bodyBase, margin: 0, color: "var(--text-primary)", fontWeight: 600 }}>
              {display.holder_link_caution}
            </p>
          </div>
        ) : null}

        {display.acceptability_note ? (
          <p style={{ ...bodyBase, marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.95rem" }}>
            {display.acceptability_note}
          </p>
        ) : null}

        {display.application_label ? (
          <p style={{ ...bodyBase, marginTop: "1.15rem", color: "var(--text-muted)", fontSize: "0.95rem" }}>
            Requested by{" "}
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{display.application_label}</span>
          </p>
        ) : null}

        <StatusSummary rows={display.holder_status_rows} />

        <div className="abx-partner-sandbox-callback__actions">
          {display.trust_level !== "loading" ? (
            <>
              <Btn
                href={display.primary_action.href}
                size="md"
                variant={display.primary_action.variant === "primary" ? undefined : "secondary"}
              >
                {display.primary_action.label}
              </Btn>
              {display.secondary_action ? (
                <Btn href={display.secondary_action.href} size="md" variant="secondary">
                  {display.secondary_action.label}
                </Btn>
              ) : null}
            </>
          ) : null}
        </div>

        {showDeveloperDetails ? (
          <details className="abx-partner-sandbox-callback__details">
            <summary className="abx-partner-sandbox-callback__details-summary">
              Verification details
            </summary>
            <div className="abx-partner-sandbox-callback__details-panel">
              {receiptId ? (
                <div>
                  <p style={{ ...bodyBase, fontSize: "0.9rem", color: "var(--text-muted)" }}>
                    Result reference (for server verification)
                  </p>
                  <div
                    style={{
                      marginTop: "0.35rem",
                      padding: "0.7rem 0.85rem",
                      borderRadius: 12,
                      border: "1px solid var(--border-subtle)",
                      background: "var(--surface-inset)",
                      fontFamily: MONO,
                      fontSize: "clamp(0.82rem, 2.4vw, 0.9rem)",
                      wordBreak: "break-all",
                    }}
                  >
                    {receiptId}
                  </div>
                </div>
              ) : null}

              {display.receipt ? (
                <div style={{ ...bodyBase, fontSize: "0.88rem", display: "grid", gap: "0.35rem" }}>
                  <div>
                    <strong>Partner ID:</strong> {display.receipt.partner_id}
                  </div>
                  <div>
                    <strong>Policy:</strong> {display.receipt.policy_id}
                  </div>
                </div>
              ) : null}

              {display.url_mismatches.length > 0 ? (
                <ul style={{ ...bodyBase, margin: 0, paddingLeft: "1.1rem", color: "#FBBF24", fontSize: "0.9rem" }}>
                  {display.url_mismatches.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}

              {urlView.parse_errors.length > 0 ? (
                <p style={{ ...bodyBase, color: "var(--text-muted)", fontSize: "0.88rem" }}>
                  Callback shape: {urlView.parse_errors.join(", ")}
                </p>
              ) : null}

              {receiptId ? <LiveDecisionReceiptCard receiptId={receiptId} compact /> : null}

              <div style={{ ...bodyBase, fontSize: "0.88rem", color: "var(--text-muted)" }}>
                <p style={{ margin: "0 0 0.5rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  For application developers
                </p>
                <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.35rem" }}>
                  <li>Do not grant access from browser callback parameters alone</li>
                  <li>
                    Re-fetch{" "}
                    <code style={{ fontFamily: MONO }}>GET /api/receipts/{"{receipt_id}"}/public</code> on your server
                  </li>
                  <li>Confirm current acceptability separately from signature validity</li>
                </ul>
                <p style={{ marginTop: "0.65rem", marginBottom: 0 }}>
                  See{" "}
                  <Link href="/docs/partner-flow" style={{ color: "var(--accent)", fontWeight: 700 }}>
                    Partner Flow documentation
                  </Link>
                  .
                </p>
              </div>
            </div>
          </details>
        ) : null}
      </AbxCard>
    </div>
  );
}
