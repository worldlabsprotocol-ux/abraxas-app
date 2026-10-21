"use client";
// FILE: components/partner/PartnerSandboxCallbackClient.tsx
// Sandbox / Launchpad acceptance callback — server verification required.

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import { buildPartnerSandboxCallbackView } from "@/lib/partner/partnerSandboxCallback";
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
  const [receiptVerified, setReceiptVerified] = useState<boolean | null>(null);

  const view = useMemo(() => {
    return buildPartnerSandboxCallbackView(new URLSearchParams(searchParams.toString()));
  }, [searchParams]);

  useEffect(() => {
    setReceiptVerified(null);
  }, [view.hints.receipt_id]);

  const approved = view.holder_outcome === "approved" && !view.forbidden_detected;

  return (
    <div
      className="abx-partner-sandbox-callback"
      style={{ display: "grid", gap: "1.25rem", maxWidth: 640, margin: "0 auto", textAlign: "left" }}
    >
      <ContentCard title={view.headline}>
        <p style={body}>{view.body}</p>
        {view.forbidden_detected ? (
          <p style={{ ...body, color: "#FBBF24", marginTop: "0.75rem" }}>
            Remove sensitive query parameters from callback URLs. Partners must verify outcomes server-side.
          </p>
        ) : null}
        {view.parse_errors.length > 0 ? (
          <p style={{ ...body, marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.84rem" }}>
            Callback validation: {view.parse_errors.join(", ")}
          </p>
        ) : null}

        {approved && view.hints.receipt_id ? (
          <div style={{ marginTop: "1rem" }}>
            <p style={{ ...body, fontWeight: 600, color: "var(--text-primary)" }}>
              Result reference for your application server
            </p>
            <div
              style={{
                marginTop: "0.5rem",
                padding: "0.75rem 0.85rem",
                borderRadius: 12,
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-inset)",
                fontFamily: MONO,
                fontSize: "0.82rem",
                wordBreak: "break-all",
              }}
            >
              {view.hints.receipt_id}
            </div>
            {receiptVerified === true ? (
              <p style={{ ...body, marginTop: "0.65rem", color: "#10B981", fontWeight: 600 }}>
                Public receipt signature verified for this reference.
              </p>
            ) : null}
            {receiptVerified === false ? (
              <p style={{ ...body, marginTop: "0.65rem", color: "var(--text-muted)" }}>
                Receipt could not be loaded from the public verification endpoint.
              </p>
            ) : null}
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

      {approved && view.hints.receipt_id ? (
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
            <LiveDecisionReceiptCard
              receiptId={view.hints.receipt_id}
              compact
              onLoaded={(receipt) => {
                const sig = "signature_valid" in receipt ? receipt.signature_valid : undefined;
                setReceiptVerified(sig !== false);
              }}
            />
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
