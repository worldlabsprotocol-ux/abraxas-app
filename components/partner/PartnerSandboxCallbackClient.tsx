"use client";
// FILE: components/partner/PartnerSandboxCallbackClient.tsx
// Sandbox / Launchpad acceptance callback — receipt-authoritative, holder-first display.

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ContentCard } from "@/components/redesign/RedesignContent";
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

const SHELL: React.CSSProperties = {
  display: "grid",
  gap: "1.35rem",
  width: "min(100%, 42rem)",
  maxWidth: "42rem",
  margin: "0 auto",
  textAlign: "left",
  padding: "clamp(1rem, 4vw, 2rem) clamp(1rem, 5vw, 1.5rem) 2.5rem",
};

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
    <dl
      style={{
        margin: "1.25rem 0 0",
        padding: 0,
        display: "grid",
        gap: "0.65rem",
        borderRadius: 14,
        border: "1px solid var(--border-subtle)",
        background: "var(--surface-inset)",
        paddingBlock: "1rem",
        paddingInline: "1.1rem",
      }}
    >
      {rows.map((row) => (
        <div
          key={row.label}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: "0.75rem",
            alignItems: "baseline",
            fontFamily: FONT,
            fontSize: "clamp(0.95rem, 2.6vw, 1.02rem)",
          }}
        >
          <dt style={{ margin: 0, color: "var(--text-muted)", fontWeight: 600 }}>{row.label}</dt>
          <dd style={{ margin: 0, textAlign: "right", ...statusValueStyle(row) }}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

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

  const showDeveloperDetails = Boolean(receiptId && (display.receipt_confirmed || display.receipt));

  return (
    <div className="abx-partner-sandbox-callback" style={SHELL}>
      <ContentCard title={display.headline}>
        <p style={bodyBase}>{display.body}</p>

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

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.65rem",
            marginTop: "1.35rem",
          }}
        >
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
      </ContentCard>

      {showDeveloperDetails ? (
        <details
          style={{
            borderRadius: 14,
            border: "1px solid var(--border-subtle)",
            padding: "0.85rem 1rem",
            background: "var(--surface-raised, var(--surface-inset))",
          }}
        >
          <summary
            style={{
              fontFamily: FONT,
              fontSize: "clamp(0.95rem, 2.6vw, 1rem)",
              fontWeight: 700,
              color: "var(--accent)",
              cursor: "pointer",
            }}
          >
            Verification details
          </summary>
          <div style={{ marginTop: "1rem", display: "grid", gap: "1rem" }}>
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
                  <strong>Application ID:</strong> {display.receipt.partner_id}
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
                <li>Re-fetch{" "}
                  <code style={{ fontFamily: MONO }}>GET /api/receipts/{"{receipt_id}"}/public</code>
                  {" "}on your server
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
    </div>
  );
}
