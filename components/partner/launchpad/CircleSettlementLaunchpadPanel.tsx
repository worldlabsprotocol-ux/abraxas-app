"use client";
// FILE: components/partner/launchpad/CircleSettlementLaunchpadPanel.tsx
// Launchpad card for DEMO/testnet Circle settlement. Safe evidence only.

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

interface SafeEvidence {
  state?: string;
  network?: string;
  currency?: string;
  amount_minor?: number;
  provider_request_ref?: string | null;
  circle_transaction_id?: string | null;
  provider_state?: string | null;
  provider_occurred_at?: string | null;
  receipt_id?: string;
  policy_id?: string;
  policy_version?: number;
  idempotency_key?: string;
  infrastructure_label?: string;
}

interface SettlementResponse {
  ok?: boolean;
  available?: boolean;
  code?: string;
  activates_production?: boolean;
  not_a_custodian?: boolean;
  intent_is_not_a_payment?: boolean;
  duplicate?: boolean;
  evidence?: SafeEvidence | null;
  error?: string;
}

const bodyText: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.74rem",
  color: "var(--text-secondary)",
  lineHeight: 1.55,
  margin: "0 0 0.55rem",
};

export function CircleSettlementLaunchpadPanel({
  applicationId,
}: {
  applicationId: string;
}) {
  const [report, setReport] = useState<SettlementResponse | null>(null);
  const [error, setError] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [busy, setBusy] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/launchpad/applications/${applicationId}/settlement`, {
      credentials: "include",
    });
    const data = await res.json() as SettlementResponse;
    if (!res.ok && !data.code) {
      setError(String(data.error ?? "Could not load settlement status"));
      return;
    }
    setError("");
    setReport(data);
  }, [applicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSettlement() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/settlement`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        receipt_id: receiptId,
      }),
    });
    const data = await res.json() as SettlementResponse;
    setReport(data);
    if (!data.ok && data.code) setError(String(data.code));
    setBusy(false);
  }

  async function copyEvidence() {
    if (!report?.evidence) return;
    await navigator.clipboard.writeText(JSON.stringify(report.evidence, null, 2));
    setCopyFeedback("Copied safe evidence");
  }

  const evidence = report?.evidence;
  const unavailable = report && report.available === false;

  return (
    <ContentCard title="Arc testnet settlement">
      <p style={bodyText}>
        DEMO / Arc testnet infrastructure only. Abraxas is not a custodian of customer funds.
        A settlement intent is not a payment. It stays pending until Circle returns an authenticated result.
        The server generates the Circle idempotency key. Browser values are not accepted.
      </p>
      {unavailable && (
        <p style={{ ...bodyText, color: "#f59e0b" }}>
          Circle testnet settlement is unavailable on this Preview ({report?.code ?? "circle_unavailable"}).
          Operator setup is required. This does not activate production.
        </p>
      )}
      {report?.activates_production === false && (
        <p style={bodyText}>Production activation remains independently gated and is not performed here.</p>
      )}
      {evidence && (
        <pre
          style={{
            fontFamily: MONO,
            fontSize: "0.68rem",
            whiteSpace: "pre-wrap",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0.7rem",
          }}
        >
{`state: ${evidence.state}
network: ${evidence.network}
currency: ${evidence.currency}
amount_minor: ${evidence.amount_minor}
receipt_id: ${evidence.receipt_id}
policy: ${evidence.policy_id} v${evidence.policy_version}
idempotency_key: ${evidence.idempotency_key}
provider_request_ref: ${evidence.provider_request_ref ?? "—"}
circle_transaction_id: ${evidence.circle_transaction_id ?? "—"}
provider_state: ${evidence.provider_state ?? "—"}
provider_occurred_at: ${evidence.provider_occurred_at ?? "—"}`}
        </pre>
      )}
      <label style={{ ...bodyText, display: "block" }}>
        Signed receipt ID
        <input
          value={receiptId}
          onChange={(event) => setReceiptId(event.target.value)}
          style={{ display: "block", width: "100%", marginTop: 4, fontFamily: MONO, fontSize: "0.72rem" }}
        />
      </label>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
        <Btn size="sm" onClick={() => void runSettlement()} disabled={busy}>
          Create DEMO settlement intent
        </Btn>
        {evidence && (
          <Btn size="sm" variant="secondary" onClick={() => void copyEvidence()}>
            Copy safe evidence
          </Btn>
        )}
      </div>
      {copyFeedback && <p style={bodyText}>{copyFeedback}</p>}
      {error && <p style={{ ...bodyText, color: "#ef4444" }}>{error}</p>}
    </ContentCard>
  );
}
