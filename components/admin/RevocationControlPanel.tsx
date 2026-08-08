"use client";
// FILE: components/admin/RevocationControlPanel.tsx
// Admin revocation control — safe identifiers only, confirmation required.

import { useCallback, useEffect, useMemo, useState } from "react";
import { REVOCATION_REASON_CODES } from "@/lib/decisionReceipts/revocationControlPlane";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#F87171";

interface SubjectAccessView {
  subject_pseudonym_id: string;
  partner_id: string | null;
  claims: Array<{
    claim_id: string;
    claim_type: string;
    status: string;
    status_reason_code: string | null;
  }>;
  receipts: Array<{
    receipt_id: string;
    decision_id: string;
    partner_id: string;
    policy_id: string;
    status: string;
    revoked_at: string | null;
    revocation_reason_code: string | null;
  }>;
}

export function RevocationControlPanel({
  subjectId,
  adminPin,
}: {
  subjectId: string | null;
  adminPin: string;
}) {
  const [reasonCode, setReasonCode] = useState<string>(REVOCATION_REASON_CODES[0]);
  const [access, setAccess] = useState<SubjectAccessView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadAccess = useCallback(async () => {
    const id = subjectId?.trim();
    if (!id) {
      setAccess(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (adminPin) headers["x-admin-pin"] = adminPin;
      const res = await fetch(`/api/admin/revocation/subject-access?subject_id=${encodeURIComponent(id)}`, {
        cache: "no-store",
        headers,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Load failed (${res.status})`);
      setAccess(body as SubjectAccessView);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load partner access");
      setAccess(null);
    } finally {
      setLoading(false);
    }
  }, [adminPin, subjectId]);

  useEffect(() => {
    void loadAccess();
  }, [loadAccess]);

  const receiptsByPartner = useMemo(() => {
    const grouped = new Map<string, SubjectAccessView["receipts"]>();
    for (const receipt of access?.receipts ?? []) {
      const list = grouped.get(receipt.partner_id) ?? [];
      list.push(receipt);
      grouped.set(receipt.partner_id, list);
    }
    return grouped;
  }, [access?.receipts]);

  async function revokePartnerScopedAccess(partnerId: string) {
    const id = subjectId?.trim();
    if (!id) return;

    const partnerReceipts = receiptsByPartner.get(partnerId) ?? [];
    const activeReceipts = partnerReceipts.filter(r => r.status === "active");
    if (activeReceipts.length === 0) {
      setError(`No active receipts for partner ${partnerId}.`);
      return;
    }

    const confirmed = window.confirm(
      `REVOKE PARTNER-SCOPED ACCESS ONLY\n\n`
      + `Partner: ${partnerId}\n`
      + `Active receipts to revoke: ${activeReceipts.length}\n`
      + `Reason: ${reasonCode}\n\n`
      + "This revokes ONLY this partner's receipts for this subject. "
      + "Receipts belonging to other partners are NOT affected. "
      + "Credential claims are NOT globally revoked. "
      + "Restoring access requires a new valid issuance flow.",
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminPin) headers["x-admin-pin"] = adminPin;
      const res = await fetch("/api/admin/revocation", {
        method: "POST",
        headers,
        body: JSON.stringify({
          target_type: "subject_access",
          subject_id: id,
          partner_id: partnerId,
          reason_code: reasonCode,
          idempotency_key: `subject_revoke:${id}:${partnerId}:${reasonCode}`,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Revoke failed (${res.status})`);
      setSuccess(
        `Revoked ${body.revoked_receipt_ids?.length ?? 0} receipt(s) for partner ${partnerId} only.`,
      );
      await loadAccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setLoading(false);
    }
  }

  if (!subjectId?.trim()) return null;

  return (
    <section
      aria-label="Partner access revocation"
      style={{
        marginTop: "0.9rem",
        padding: "0.85rem",
        borderRadius: 8,
        border: "1px solid rgba(248,113,113,0.25)",
        background: "rgba(248,113,113,0.05)",
      }}
    >
      <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: ACCENT }}>
        Partner-scoped access revocation
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "rgba(255,255,255,0.6)", margin: "0.35rem 0 0.75rem", lineHeight: 1.5 }}>
        Revoke per partner only. Other partners&apos; receipts for this subject are never affected.
        Signatures remain verifiable; live public validity becomes revoked.
      </p>

      {loading && <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "rgba(255,255,255,0.45)" }}>Loading…</p>}
      {error && <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "#FCA5A5" }}>{error}</p>}
      {success && <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "#86EFAC" }}>{success}</p>}

      {access && (
        <>
          <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: "rgba(255,255,255,0.45)", marginBottom: "0.65rem" }}>
            pseudonym={access.subject_pseudonym_id.slice(0, 12)}…
          </p>

          <label style={{ display: "block", marginBottom: "0.65rem" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.65rem", color: "rgba(255,255,255,0.55)" }}>Reason code</span>
            <select
              value={reasonCode}
              onChange={e => setReasonCode(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                marginTop: 4,
                padding: "0.45rem 0.6rem",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.25)",
                color: "#f0f0f0",
                fontFamily: MONO,
                fontSize: "0.65rem",
              }}
            >
              {REVOCATION_REASON_CODES.map(code => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </label>

          {Array.from(receiptsByPartner.entries()).map(([partnerId, receipts]) => {
            const active = receipts.filter(r => r.status === "active");
            const revoked = receipts.filter(r => r.status === "revoked");
            return (
              <div
                key={partnerId}
                style={{
                  marginBottom: "0.75rem",
                  padding: "0.65rem",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(0,0,0,0.15)",
                }}
              >
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, marginBottom: 4 }}>
                  Partner: {partnerId}
                </div>
                {active.map(receipt => (
                  <div key={receipt.receipt_id} style={{ fontFamily: MONO, fontSize: "0.6rem", color: "rgba(255,255,255,0.7)" }}>
                    active · {receipt.receipt_id} · {receipt.policy_id}
                  </div>
                ))}
                {revoked.map(receipt => (
                  <div key={receipt.receipt_id} style={{ fontFamily: MONO, fontSize: "0.6rem", color: "rgba(255,255,255,0.5)" }}>
                    revoked · {receipt.receipt_id} · {receipt.revocation_reason_code ?? "revoked"}
                  </div>
                ))}
                <button
                  type="button"
                  disabled={loading || active.length === 0}
                  onClick={() => void revokePartnerScopedAccess(partnerId)}
                  style={{
                    marginTop: "0.5rem",
                    padding: "0.4rem 0.7rem",
                    borderRadius: 6,
                    border: "1px solid rgba(248,113,113,0.35)",
                    background: "rgba(248,113,113,0.12)",
                    color: ACCENT,
                    fontFamily: FONT,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    cursor: loading ? "wait" : "pointer",
                    opacity: active.length === 0 ? 0.5 : 1,
                  }}
                >
                  Revoke ONLY {partnerId} partner access
                </button>
              </div>
            );
          })}

          {receiptsByPartner.size === 0 && (
            <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "rgba(255,255,255,0.45)" }}>
              No partner receipts on file for this subject.
            </p>
          )}
        </>
      )}
    </section>
  );
}
