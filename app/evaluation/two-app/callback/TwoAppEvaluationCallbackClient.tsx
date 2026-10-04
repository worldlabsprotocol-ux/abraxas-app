"use client";
// FILE: app/evaluation/two-app/callback/TwoAppEvaluationCallbackClient.tsx
// Holder return continuation — never grants access from query parameters.

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  TWO_APP_EVAL_CALLBACK_SESSION_KEY,
  buildTwoAppEvalCallbackContinuationView,
  twoAppEvalJourneyHref,
} from "@/lib/partner/twoAppEvaluation/callbackContinuation";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  lineHeight: 1.65,
  color: "var(--text-secondary)",
  margin: 0,
};

export function TwoAppEvaluationCallbackClient() {
  const searchParams = useSearchParams();
  const [evaluationId, setEvaluationId] = useState<string | null>(null);

  const view = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    return buildTwoAppEvalCallbackContinuationView(params);
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setEvaluationId(window.sessionStorage.getItem(TWO_APP_EVAL_CALLBACK_SESSION_KEY));
  }, []);

  const journeyHref = twoAppEvalJourneyHref(evaluationId);

  const outcomeLabel = view.holder_outcome === "approved"
    ? "Holder flow returned with a receipt hint"
    : view.holder_outcome === "denied"
      ? "Holder flow returned denied"
      : view.holder_outcome === "pending_review"
        ? "Holder flow pending review"
        : "Holder returned to callback URL";

  return (
    <div style={{ display: "grid", gap: "1rem", textAlign: "left" }}>
      <ContentCard title={outcomeLabel}>
        <p style={body}>{view.notice}</p>
        {view.forbidden_detected && (
          <p style={{ ...body, color: "#FBBF24", marginTop: "0.65rem" }}>
            Unexpected personal data appeared in the callback URL. Do not log or persist callback query strings. Verify server-side only.
          </p>
        )}
        {view.hints.receipt_id && (
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--surface-inset)",
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              Receipt hint (not authorization)
            </div>
            <div style={{ fontFamily: MONO, fontSize: "0.82rem", wordBreak: "break-all", color: "var(--text-primary)" }}>
              {view.hints.receipt_id}
            </div>
          </div>
        )}
        <p style={{ ...body, fontSize: "0.78rem", marginTop: "0.75rem", color: "var(--text-muted)" }}>
          Next: run server-side verification with your sandbox API key —{" "}
          <code style={{ fontFamily: MONO }}>GET /api/receipts/{"{receipt_id}"}/public</code>
          {" "}and Integration Kit narrow-result verification. The evaluation checklist updates when verification events are recorded.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
          <Btn href={journeyHref} size="sm">
            Return to evaluation checklist
          </Btn>
          <Btn href="/developers/launchpad" size="sm" variant="secondary">
            Open Launchpad
          </Btn>
          <Btn href="/docs/VERIFY_WITH_ABRAXAS_QUICKSTART" size="sm" variant="ghost">
            Integration quickstart
          </Btn>
        </div>
      </ContentCard>

      <ContentCard title="What this page does not do">
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.35rem" }}>
          {[
            "Does not grant access from browser callback parameters",
            "Does not expose API keys or webhook secrets",
            "Does not replace your server-side receipt verification",
            "Does not display holder identity data",
          ].map((item) => (
            <li key={item} style={body}>{item}</li>
          ))}
        </ul>
        <p style={{ ...body, fontSize: "0.76rem", marginTop: "0.65rem", color: "var(--text-muted)" }}>
          Lost your evaluation link? Open{" "}
          <Link href="/evaluation/two-app" style={{ color: "var(--accent)", fontWeight: 700 }}>
            /evaluation/two-app
          </Link>
          {" "}in the same browser session or paste your saved evaluation URL.
        </p>
      </ContentCard>
    </div>
  );
}
