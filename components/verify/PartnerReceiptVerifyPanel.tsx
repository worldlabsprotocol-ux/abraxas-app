"use client";
// FILE: components/verify/PartnerReceiptVerifyPanel.tsx
// Integrator tester for GET /api/receipts/{receipt_id}/public — UI only, no contract changes.

import Link from "next/link";
import { useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { PARTNER_FLOW_RECEIPT_CHECKS } from "@/lib/partner/partnerFlowIntegratorKit";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

function evaluateChecks(
  receipt: PartnerFlowPublicReceipt,
  partnerId: string,
  policyId: string,
  allowSandbox: boolean,
) {
  const validation = validatePartnerFlowPublicReceipt(receipt, {
    partnerId: partnerId.trim() || "expected-partner",
    policyId: policyId.trim() || "expected-policy",
    allowSandbox,
  });

  const rows = PARTNER_FLOW_RECEIPT_CHECKS.map((row) => {
    let pass = false;
    if (row.check.startsWith("signature_valid")) pass = receipt.signature_valid === true;
    else if (row.check.startsWith('decision_result')) pass = receipt.decision_result === "approved";
    else if (row.check.startsWith("status")) pass = receipt.status === "active";
    else if (row.check.startsWith("expires_at")) {
      pass = Boolean(receipt.expires_at && new Date(receipt.expires_at) > new Date());
    } else if (row.check.startsWith("production_usable")) {
      pass = allowSandbox ? true : receipt.production_usable === true;
    } else if (row.check.startsWith("partner_id")) {
      pass = !partnerId.trim() || receipt.partner_id === partnerId.trim();
    } else if (row.check.startsWith("policy_id")) {
      pass = !policyId.trim() || receipt.policy_id === policyId.trim();
    }
    return { ...row, pass };
  });

  return { validation, rows };
}

export function PartnerReceiptVerifyPanel() {
  const [receiptId, setReceiptId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [allowSandbox, setAllowSandbox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PartnerFlowPublicReceipt | null>(null);

  async function runLookup() {
    const id = receiptId.trim();
    if (!id) {
      setErr("Enter a receipt_id from your Partner Flow callback.");
      return;
    }
    setLoading(true);
    setErr(null);
    setReceipt(null);
    try {
      const res = await fetch(`/api/receipts/${encodeURIComponent(id)}/public`);
      const data = await res.json() as PartnerFlowPublicReceipt & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Receipt lookup failed");
      setReceipt(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Receipt lookup failed");
    } finally {
      setLoading(false);
    }
  }

  const analysis = receipt
    ? evaluateChecks(receipt, partnerId, policyId, allowSandbox)
    : null;

  return (
    <div>
      <StatusBanner
        tone="info"
        title="Partner Flow receipt verification"
      >
        For integrators validating session receipts after a holder callback. Run this check from your server in production — this page is a public tester only.
      </StatusBanner>

      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "1rem 0" }}>
        Who this is for: engineering teams implementing Partner Flow. What to do next: paste a{" "}
        <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>receipt_id</code> from your callback,
        optionally bind expected <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>partner_id</code> /{" "}
        <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>policy_id</code>, then verify the public payload.
      </p>

      <div style={{ display: "grid", gap: "0.65rem", marginBottom: "1rem" }}>
        <label style={labelStyle}>
          Receipt ID
          <input
            value={receiptId}
            onChange={(e) => setReceiptId(e.target.value)}
            placeholder="dr_… from callback query"
            style={inputStyle}
          />
          <span style={helperStyle}>From your return_url callback — not a registry asset ID.</span>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.65rem" }}>
          <label style={labelStyle}>
            Expected partner_id (optional)
            <input value={partnerId} onChange={(e) => setPartnerId(e.target.value)} placeholder="your-partner-id" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Expected policy_id (optional)
            <input value={policyId} onChange={(e) => setPolicyId(e.target.value)} placeholder="your-policy-v1" style={inputStyle} />
          </label>
        </div>
        <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
          <input type="checkbox" checked={allowSandbox} onChange={(e) => setAllowSandbox(e.target.checked)} />
          <span style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            Allow sandbox policy (pilot testing only — not for production gates)
          </span>
        </label>
      </div>

      {err && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#EF4444", margin: "0 0 1rem" }}>{err}</p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <Btn onClick={() => void runLookup()} disabled={loading} loading={loading}>
          {loading ? "Fetching receipt…" : "Verify receipt"}
        </Btn>
        <Btn href="/docs/partner-flow#receipt-verification" variant="secondary" size="sm">
          Integration docs
        </Btn>
      </div>

      {receipt && analysis && (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div
            style={{
              padding: "0.85rem 1rem",
              borderRadius: 12,
              border: `1px solid ${analysis.validation.ok ? `${ACCENT}44` : "rgba(239,68,68,0.35)"}`,
              background: analysis.validation.ok ? `${ACCENT}10` : "rgba(239,68,68,0.08)",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
              {analysis.validation.ok ? "Receipt checks passed" : "Receipt checks failed"}
            </div>
            {!analysis.validation.ok && analysis.validation.errors.length > 0 && (
              <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)" }}>
                {analysis.validation.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ display: "grid", gap: "0.35rem" }}>
            {analysis.rows.map((row) => (
              <div
                key={row.check}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "0.65rem",
                  padding: "0.55rem 0.65rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: "0.72rem", fontWeight: 800, color: row.pass ? ACCENT : "#EF4444" }}>
                  {row.pass ? "✓" : "○"}
                </span>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-primary)" }}>{row.check}</div>
                  <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>{row.why}</div>
                </div>
              </div>
            ))}
          </div>

          <pre
            style={{
              fontFamily: MONO,
              fontSize: "0.65rem",
              lineHeight: 1.55,
              padding: "0.85rem",
              borderRadius: 10,
              overflow: "auto",
              background: "var(--surface-inset)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              margin: 0,
            }}
          >
            {JSON.stringify(receipt, null, 2)}
          </pre>
        </div>
      )}

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1rem", lineHeight: 1.55 }}>
        Looking up a tokenized asset instead? Use the{" "}
        <Link href="/verify?mode=registry" style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>
          Registry lookup
        </Link>{" "}
        tab. Credential JWT testing lives under{" "}
        <Link href="/verify?mode=credential" style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>
          Credential JWT
        </Link>.
      </p>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.3rem",
  fontFamily: FONT,
  fontSize: "0.72rem",
  fontWeight: 600,
  color: "var(--text-muted)",
};

const inputStyle: React.CSSProperties = {
  padding: "0.65rem 0.75rem",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-inset)",
  color: "var(--text-primary)",
  fontFamily: MONO,
  fontSize: "0.72rem",
};

const helperStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.68rem",
  fontWeight: 500,
  color: "var(--text-muted)",
  lineHeight: 1.45,
};
