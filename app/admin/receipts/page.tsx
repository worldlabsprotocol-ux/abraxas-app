"use client";
// FILE: app/admin/receipts/page.tsx
// Admin inspector for eligibility decision receipts (protocol infrastructure).

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { useAdminConfirm } from "@/lib/admin/useAdminConfirm";
import {
  ProductionAdminSessionStatus,
  PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE,
  useProductionAdminSessionGate,
} from "@/lib/admin/productionAdminSessionUi";
import { REVOCATION_REASON_CODES } from "@/lib/decisionReceipts/revocationControlPlane";

const MONO = "'JetBrains Mono',monospace";

interface ReceiptRow {
  receipt_id: string;
  policy_id: string;
  policy_version: number;
  partner_id: string;
  decision_result: string;
  status: string;
  decision_context: string;
  signature_valid: boolean;
  evaluated_at: string;
  expires_at: string | null;
  decision_id?: string;
}

interface ReceiptDetail {
  receipt: ReceiptRow & {
    reason_codes: string[];
    evaluated_claim_refs: Array<{ claim_id: string; claim_type: string; issuer_id: string }>;
    consent_receipt_id: string | null;
    wallet_binding_ref: string | null;
    payload_hash: string;
    signing_key_id: string;
  };
  signature_status: string;
  resolved_status: string;
  audit_timeline: Array<{ action: string; created_at: string; actor_type: string }>;
}

interface RevokeResponse {
  receipt_id?: string;
  decision_id?: string;
  status?: string;
  revoked_at?: string | null;
  reason_code?: string;
  already_revoked?: boolean;
  error?: string;
}

function formatRevokeSuccess(data: RevokeResponse): string {
  const receiptId = data.receipt_id ?? "receipt";
  if (data.already_revoked) {
    return `Receipt ${receiptId} was already revoked.`;
  }
  const parts = [`Receipt ${receiptId} revoked.`];
  if (data.reason_code) parts.push(`Reason: ${data.reason_code}.`);
  if (data.revoked_at) parts.push(`Revoked at ${new Date(data.revoked_at).toISOString()}.`);
  return parts.join(" ");
}

export default function AdminReceiptsPage() {
  const gate = useProductionAdminSessionGate();
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReceiptDetail | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reasonCode, setReasonCode] = useState<string>(REVOCATION_REASON_CODES[0]);
  const { requestConfirm, confirmDialogProps } = useAdminConfirm();

  const revokeControlsDisabled =
    revokingId !== null || confirmDialogProps.open || confirmDialogProps.busy;

  const canLoad = gate.usePinUnlock ? Boolean(gate.pin) : gate.authorized;

  const loadList = useCallback(async () => {
    if (gate.loading || !canLoad) return;
    setListLoading(true);
    setError("");
    try {
      const res = await gate.adminRequest("/api/admin/receipts", { cache: "no-store" });
      const data = await res.json() as { receipts?: ReceiptRow[]; error?: string };
      if (res.status === 401 && !gate.usePinUnlock) {
        throw new Error(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE);
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setReceipts(data.receipts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setListLoading(false);
    }
  }, [canLoad, gate.adminRequest, gate.loading, gate.usePinUnlock]);

  const loadDetail = useCallback(async (receiptId: string) => {
    if (!canLoad) return;
    setDetailLoading(true);
    setError("");
    try {
      const res = await gate.adminRequest(`/api/admin/receipts/${receiptId}`, { cache: "no-store" });
      const data = await res.json() as ReceiptDetail & { error?: string };
      if (res.status === 401 && !gate.usePinUnlock) {
        throw new Error(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE);
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to load detail");
      setDetail(data);
      setSelected(receiptId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detail load failed");
    } finally {
      setDetailLoading(false);
    }
  }, [canLoad, gate.adminRequest, gate.usePinUnlock]);

  useEffect(() => { void loadList(); }, [loadList]);

  async function executeRevokeReceipt(receiptId: string) {
    setRevokingId(receiptId);
    setError("");
    setSuccess("");
    try {
      const res = await gate.adminRequest(`/api/admin/receipts/${receiptId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke",
          reason_code: reasonCode,
          idempotency_key: `receipt_revoke:${receiptId}:${reasonCode}`,
        }),
      });
      const data = await res.json() as RevokeResponse;
      if (res.status === 401 && !gate.usePinUnlock) {
        throw new Error(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE);
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Revoke failed");
      }
      setSuccess(formatRevokeSuccess(data));
      await loadDetail(receiptId);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setRevokingId(null);
    }
  }

  function promptRevokeReceipt(receiptId: string) {
    requestConfirm({
      actionKey: "receipt.revoke",
      context: { receiptId, reasonCode },
      onConfirmed: () => executeRevokeReceipt(receiptId),
    });
  }

  function clearDetail() {
    setDetail(null);
    setSelected(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060810", color: "#f0f0f0", fontFamily: MONO }}>
      <header style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between" }}>
        <div>
          <Link href="/admin/partners" style={{ color: "#a78bfa", fontSize: "0.75rem", textDecoration: "none" }}>← Admin</Link>
          {" · "}
          <Link href="/admin/trust" style={{ color: "#a78bfa", fontSize: "0.75rem", textDecoration: "none" }}>Trust layer</Link>
          <h1 style={{ fontSize: "0.9rem", margin: "0.25rem 0 0", letterSpacing: "0.08em" }}>Decision Receipts</h1>
          <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", margin: "0.25rem 0 0" }}>
            Eligibility decision receipts. signed policy evaluation artifacts
          </p>
        </div>
        {gate.usePinUnlock ? (
          <input
            type="password"
            value={gate.pin}
            onChange={event => gate.setPin(event.target.value)}
            placeholder="Admin PIN"
            style={{ padding: "0.4rem 0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, color: "#f0f0f0", fontSize: "0.7rem" }}
          />
        ) : (
          <ProductionAdminSessionStatus
            gate={gate}
            style={{ fontSize: "0.68rem", color: gate.authorized ? "#86EFAC" : "#f26b6b", margin: 0, maxWidth: 280, lineHeight: 1.5 }}
          />
        )}
      </header>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "1rem 1.5rem 3rem" }}>
        {!gate.usePinUnlock && !gate.loading && !gate.authorized && (
          <div style={{ padding: "0.5rem 0.75rem", marginBottom: "1rem", background: "rgba(242,107,107,0.1)", border: "1px solid rgba(242,107,107,0.25)", borderRadius: 4, fontSize: "0.7rem", color: "#f26b6b" }}>
            {gate.unauthorizedMessage}
          </div>
        )}
        {error && (
          <div style={{ padding: "0.5rem 0.75rem", marginBottom: "1rem", background: "rgba(242,107,107,0.1)", border: "1px solid rgba(242,107,107,0.25)", borderRadius: 4, fontSize: "0.7rem", color: "#f26b6b" }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: "0.5rem 0.75rem", marginBottom: "1rem", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 4, fontSize: "0.7rem", color: "#86EFAC" }}>
            {success}
          </div>
        )}

        <div
          className="admin-receipts-split"
          style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.2fr" : "1fr", gap: "1rem" }}
        >
          <section style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: "0.65rem", color: "rgba(255,255,255,0.35)" }}>
              {listLoading ? "Loading…" : `${receipts.length} receipts`}
            </div>
            {receipts.length === 0 ? (
              <p style={{ padding: "1.5rem", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }}>No receipts yet.</p>
            ) : receipts.map(r => (
              <button
                key={r.receipt_id}
                type="button"
                onClick={() => void loadDetail(r.receipt_id)}
                disabled={(detailLoading && selected === r.receipt_id) || revokingId !== null}
                style={{
                  display: "block", width: "100%", textAlign: "left", padding: "0.6rem 0.75rem",
                  background: selected === r.receipt_id ? "rgba(124,58,237,0.12)" : "transparent",
                  border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)",
                  cursor: (detailLoading && selected === r.receipt_id) || revokingId !== null ? "not-allowed" : "pointer",
                  color: "inherit", opacity: (detailLoading && selected === r.receipt_id) || revokingId !== null ? 0.55 : 1,
                }}
              >
                <div style={{ fontSize: "0.72rem" }}>{r.receipt_id}</div>
                <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                  {r.policy_id} v{r.policy_version} · {r.decision_result} · {r.status}
                </div>
              </button>
            ))}
          </section>

          {detail && (
            <section style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "0.75rem 1rem", fontSize: "0.68rem" }}>
              <button
                type="button"
                className="admin-receipts-back"
                onClick={clearDetail}
                style={{
                  display: "none", marginBottom: "0.75rem", padding: 0, border: "none",
                  background: "transparent", color: "#a78bfa", fontSize: "0.65rem", cursor: "pointer",
                }}
              >
                ← Back to list
              </button>
              {detailLoading ? (
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", margin: 0 }}>Loading receipt…</p>
              ) : (
                <>
                  <h2 style={{ fontSize: "0.75rem", margin: "0 0 0.75rem" }}>Receipt inspector</h2>
                  <dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.35rem 0.5rem", margin: 0 }}>
                    {[
                      ["Receipt ID", detail.receipt.receipt_id],
                      ["Decision ID", detail.receipt.decision_id ?? ", "],
                      ["Policy", `${detail.receipt.policy_id} v${detail.receipt.policy_version}`],
                      ["Partner", detail.receipt.partner_id],
                      ["Result", detail.receipt.decision_result],
                      ["Status", detail.resolved_status],
                      ["Context", detail.receipt.decision_context],
                      ["Signature", detail.signature_status],
                      ["Expires", detail.receipt.expires_at ?? ", "],
                      ["Consent", detail.receipt.consent_receipt_id ?? ", "],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "contents" }}>
                        <dt style={{ color: "rgba(255,255,255,0.35)" }}>{k}</dt>
                        <dd style={{ margin: 0, wordBreak: "break-all" }}>{v}</dd>
                      </div>
                    ))}
                  </dl>

                  {detail.receipt.reason_codes.length > 0 && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <div style={{ color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Reason codes</div>
                      <div>{detail.receipt.reason_codes.join(", ")}</div>
                    </div>
                  )}

                  {detail.receipt.evaluated_claim_refs.length > 0 && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <div style={{ color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Claim references</div>
                      {detail.receipt.evaluated_claim_refs.map(ref => (
                        <div key={ref.claim_id} style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.55)" }}>
                          {ref.claim_type} · {ref.issuer_id} · {ref.claim_id.slice(0, 8)}…
                        </div>
                      ))}
                    </div>
                  )}

                  {detail.audit_timeline.length > 0 && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <div style={{ color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Audit timeline</div>
                      {detail.audit_timeline.map((ev, i) => (
                        <div key={i} style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.5)" }}>
                          {ev.created_at} · {ev.action}
                        </div>
                      ))}
                    </div>
                  )}

                  {detail.resolved_status === "active" && (
                    <div style={{ marginTop: "1rem" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.62rem", color: "rgba(255,255,255,0.45)" }}>
                        Revocation reason code
                        <select
                          value={reasonCode}
                          onChange={e => setReasonCode(e.target.value)}
                          disabled={revokeControlsDisabled}
                          style={{
                            display: "block",
                            width: "100%",
                            marginTop: 4,
                            padding: "0.35rem 0.5rem",
                            borderRadius: 4,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(0,0,0,0.25)",
                            color: "#f0f0f0",
                            fontFamily: MONO,
                            fontSize: "0.62rem",
                            opacity: revokeControlsDisabled ? 0.55 : 1,
                          }}
                        >
                          {REVOCATION_REASON_CODES.map(code => (
                            <option key={code} value={code}>{code}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => promptRevokeReceipt(detail.receipt.receipt_id)}
                        disabled={revokeControlsDisabled}
                        style={{
                          padding: "0.4rem 0.75rem",
                          background: "rgba(242,107,107,0.12)",
                          border: "1px solid rgba(242,107,107,0.25)",
                          borderRadius: 4,
                          color: "#f26b6b",
                          cursor: revokeControlsDisabled ? "not-allowed" : "pointer",
                          fontSize: "0.65rem",
                          opacity: revokeControlsDisabled ? 0.55 : 1,
                        }}
                      >
                        {revokingId === detail.receipt.receipt_id ? "Revoking…" : "Revoke receipt"}
                      </button>
                    </div>
                  )}

                  <div style={{ marginTop: "0.75rem", fontSize: "0.6rem" }}>
                    <a href={`/api/receipts/${detail.receipt.receipt_id}/public`} target="_blank" rel="noreferrer" style={{ color: "#a78bfa" }}>
                      Public receipt JSON →
                    </a>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </div>
      <style>{`
        @media (max-width: 960px) {
          .admin-receipts-split { grid-template-columns: 1fr !important; }
          .admin-receipts-back { display: inline-block !important; }
        }
      `}</style>
      <AdminConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
