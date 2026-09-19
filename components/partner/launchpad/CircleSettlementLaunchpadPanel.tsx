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
  intent_id?: string;
  state?: string;
  network?: string;
  currency?: string;
  amount_minor?: number;
  provider_request_ref?: string | null;
  circle_transaction_id?: string | null;
  provider_state?: string | null;
  provider_occurred_at?: string | null;
  policy_id?: string;
  policy_version?: number;
  idempotency_key?: string;
  infrastructure_label?: string;
  label?: string;
  environment?: string;
}

interface EligibleReceiptView {
  selection_token: string;
  decision_state: "approved";
  issued_at: string;
  policy_version: number;
  environment: "sandbox";
  eligibility_summary: string;
  amount_minor: number;
  network: string;
  currency: string;
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

function receiptLabel(item: EligibleReceiptView): string {
  const issued = item.issued_at ? new Date(item.issued_at).toISOString() : "unknown time";
  return `Approved · issued ${issued} · policy v${item.policy_version} · ${item.environment}`;
}

export function CircleSettlementLaunchpadPanel({
  applicationId,
}: {
  applicationId: string;
}) {
  const [report, setReport] = useState<SettlementResponse | null>(null);
  const [eligible, setEligible] = useState<EligibleReceiptView[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState("");
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");

  const load = useCallback(async () => {
    const [statusRes, listRes] = await Promise.all([
      fetch(`/api/launchpad/applications/${applicationId}/settlement`, {
        credentials: "include",
      }),
      fetch(`/api/launchpad/applications/${applicationId}/settlement/eligible-receipts`, {
        credentials: "include",
      }),
    ]);
    const data = await statusRes.json() as SettlementResponse;
    const listData = await listRes.json() as { receipts?: EligibleReceiptView[]; error?: string };
    if (!statusRes.ok && !data.code) {
      setError(String(data.error ?? "Could not load settlement status"));
      return;
    }
    setError("");
    setReport(data);
    setEligible(Array.isArray(listData.receipts) ? listData.receipts : []);
  }, [applicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = selectedIndex >= 0 ? eligible[selectedIndex] : undefined;

  async function createIntent() {
    if (!selected) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/settlement`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        selection_token: selected.selection_token,
      }),
    });
    const data = await res.json() as SettlementResponse;
    setReport(data);
    if (!data.ok && data.code) setError(String(data.code));
    setBusy(false);
    void load();
  }

  async function submitTransfer() {
    const intentId = report?.evidence?.intent_id;
    if (!intentId || !confirmTransfer) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/settlement/submit`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        intent_id: intentId,
        confirm_testnet_transfer: true,
      }),
    });
    const data = await res.json() as SettlementResponse;
    setReport(data);
    setConfirmTransfer(false);
    if (!data.ok && data.code) setError(String(data.code));
    setBusy(false);
  }

  async function copyEvidence() {
    if (!report?.evidence) return;
    const { receipt_id: _omit, ...safe } = report.evidence as SafeEvidence & { receipt_id?: string };
    await navigator.clipboard.writeText(JSON.stringify(safe, null, 2));
    setCopyFeedback("Copied safe evidence");
  }

  const evidence = report?.evidence;
  const unavailable = report && report.available === false;
  const pendingReview = evidence?.state === "pending";
  const judgeDemo = process.env.NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO?.trim() === "true";

  return (
    <ContentCard title="Arc testnet settlement">
      <p style={bodyText}>
        DEMO / Arc testnet infrastructure only. Abraxas is not a custodian of customer funds.
        Creating an intent never moves funds. Submit is a separate, one-time testnet confirmation.
        The server derives amount, network, currency, wallets, and receipt binding.
        Choose an eligible sandbox receipt. Settlement never asks for identity or liveness.
        Self-attestation, account login, and unverified partner claims cannot settle testnet USDC. Completing Partner Flow does not move USDC.
      </p>
      {unavailable && (
        <p style={{ ...bodyText, color: "#f59e0b" }}>
          Circle testnet settlement is unavailable on this Preview ({report?.code ?? "circle_unavailable"}).
          You can still create a pending intent for review. This does not activate production.
        </p>
      )}
      {report?.activates_production === false && (
        <p style={bodyText}>Production activation remains independently gated and is not performed here.</p>
      )}
      <label style={{ ...bodyText, display: "block" }}>
        Eligible sandbox receipts
        <select
          value={selectedIndex}
          onChange={(event) => setSelectedIndex(Number(event.target.value))}
          style={{ display: "block", width: "100%", marginTop: 4, fontFamily: FONT, fontSize: "0.72rem" }}
        >
          <option value={-1}>Select an eligible sandbox receipt</option>
          {eligible.map((item, index) => (
            <option key={index} value={index}>
              {receiptLabel(item)}
            </option>
          ))}
        </select>
      </label>
      {eligible.length === 0 && (
        <p style={bodyText}>No settlement-eligible sandbox receipts for this app.</p>
      )}
      {selected && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0.75rem",
            margin: "0.7rem 0",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <p style={{ ...bodyText, fontWeight: 600, color: "var(--text-primary)" }}>
            Review selected receipt
          </p>
          <p style={bodyText}>{receiptLabel(selected)}</p>
          <p style={bodyText}>{selected.eligibility_summary}</p>
          <p style={{ ...bodyText, fontFamily: MONO, marginBottom: 0 }}>
            {`amount_minor: ${selected.amount_minor}
network: ${selected.network}
currency: ${selected.currency}`}
          </p>
          <p style={{ ...bodyText, marginTop: "0.55rem", marginBottom: 0 }}>
            Creating an intent does not move funds.
          </p>
        </div>
      )}
      {pendingReview && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0.75rem",
            marginBottom: "0.7rem",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <p style={{ ...bodyText, fontWeight: 600, color: "var(--text-primary)" }}>
            Pending intent — sandbox/testnet
          </p>
          <p style={bodyText}>No funds moved yet.</p>
          <p style={{ ...bodyText, fontFamily: MONO, marginBottom: 0 }}>
            {`amount_minor: ${evidence.amount_minor}
policy version: ${evidence.policy_version}
network: ${evidence.network}
currency: ${evidence.currency}`}
          </p>
        </div>
      )}
      {evidence && !pendingReview && (
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
policy version: ${evidence.policy_version}
idempotency_key: ${evidence.idempotency_key}
provider_request_ref: ${evidence.provider_request_ref ?? "—"}
circle_transaction_id: ${evidence.circle_transaction_id ?? "—"}
provider_state: ${evidence.provider_state ?? "—"}
provider_occurred_at: ${evidence.provider_occurred_at ?? "—"}`}
        </pre>
      )}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
        <Btn size="sm" onClick={() => void createIntent()} disabled={busy || !selected || pendingReview}>
          Create DEMO settlement intent
        </Btn>
        {evidence && (
          <Btn size="sm" variant="secondary" onClick={() => void copyEvidence()}>
            Copy safe evidence
          </Btn>
        )}
      </div>
      {pendingReview && evidence.intent_id && !judgeDemo && (
        <div style={{ marginTop: "0.85rem" }}>
          <label style={{ ...bodyText, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={confirmTransfer}
              onChange={(event) => setConfirmTransfer(event.target.checked)}
            />
            I confirm this one-time Arc testnet USDC transfer. Amount, wallets, and receipt stay server-derived.
          </label>
          <Btn
            size="sm"
            onClick={() => void submitTransfer()}
            disabled={busy || !confirmTransfer}
          >
            Submit testnet transfer
          </Btn>
        </div>
      )}
      {pendingReview && judgeDemo && (
        <p style={bodyText}>
          DEMO environment displays pending testnet settlement evidence only.
          Testnet transfer submission is disabled.
        </p>
      )}
      {!pendingReview && (
        <p style={bodyText}>Submit testnet transfer stays unavailable until a pending intent exists.</p>
      )}
      {copyFeedback && <p style={bodyText}>{copyFeedback}</p>}
      {error && <p style={{ ...bodyText, color: "#ef4444" }}>{error}</p>}
    </ContentCard>
  );
}
