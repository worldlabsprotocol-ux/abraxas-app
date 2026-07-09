"use client";
// FILE: components/admin/CieloVerifiedRateQueue.tsx
// Operator queue for Cielo verified-rate requests.

import { useCallback, useEffect, useState } from "react";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

type FilterStatus =
  | "request_received"
  | "pending_review"
  | "eligible"
  | "operator_confirmed"
  | "declined";

type OperatorAction =
  | "mark_under_review"
  | "mark_eligible"
  | "confirm_contact_sent"
  | "decline";

interface QueueRequest {
  public_reference: string;
  status: string;
  status_label: string;
  eligibility_decision: string;
  guest_name: string | null;
  contact_email: string | null;
  check_in: string | null;
  check_out: string | null;
  guests: number | null;
  policy_id: string;
  policy_version: number;
  verification_decision_id: string | null;
  consent_receipt_id: string | null;
  reason_codes: string[];
  assigned_to: string | null;
  decision_reason: string | null;
  created_at: string;
}

interface FilterChip {
  status: FilterStatus;
  label: string;
  count: number;
}

interface RequestDetail extends QueueRequest {
  subject_sui_address: string;
  wallet_binding_id: string | null;
  wallet_binding_status?: string;
  notes: string | null;
  operator_notes: { author: string; note: string; created_at: string }[];
  contacted_at: string | null;
  reviewed_at: string | null;
  decided_at: string | null;
  events: {
    id: string;
    actor_type: string;
    actor_id: string;
    prior_status: string | null;
    next_status: string;
    action: string;
    note: string | null;
    created_at: string;
  }[];
}

const ACTION_LABELS: Record<OperatorAction, string> = {
  mark_under_review: "Mark under review",
  mark_eligible: "Mark eligible",
  confirm_contact_sent: "Confirm contact sent",
  decline: "Decline request",
};

export function CieloVerifiedRateQueue({ pin }: { pin: string }) {
  const [filter, setFilter] = useState<FilterStatus | "all">("all");
  const [requests, setRequests] = useState<QueueRequest[]>([]);
  const [filters, setFilters] = useState<FilterChip[]>([]);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [operatorId, setOperatorId] = useState("cielo_operator");
  const [internalNote, setInternalNote] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadQueue = useCallback(async () => {
    const url =
      filter === "all"
        ? "/api/admin/cielo/verified-rate"
        : `/api/admin/cielo/verified-rate?status=${filter}`;
    const res = await fetch(url, { headers: { "x-admin-pin": pin } });
    const json = await res.json() as { requests?: QueueRequest[]; filters?: FilterChip[]; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Load failed");
    setRequests(json.requests ?? []);
    setFilters(json.filters ?? []);
  }, [filter, pin]);

  const loadDetail = useCallback(async (ref: string) => {
    const res = await fetch(`/api/admin/cielo/verified-rate?ref=${encodeURIComponent(ref)}`, {
      headers: { "x-admin-pin": pin },
    });
    const json = await res.json() as { request?: RequestDetail; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Detail failed");
    setDetail(json.request ?? null);
  }, [pin]);

  useEffect(() => {
    void loadQueue().catch(e => setError(e instanceof Error ? e.message : "Load failed"));
  }, [loadQueue]);

  useEffect(() => {
    if (!selectedRef) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedRef).catch(e => setError(e instanceof Error ? e.message : "Detail failed"));
  }, [selectedRef, loadDetail]);

  async function runAction(action: OperatorAction) {
    if (!selectedRef) return;
    if (action === "decline" && !declineReason.trim()) {
      setError("Decline reason is required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/cielo/verified-rate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-pin": pin },
        body: JSON.stringify({
          public_reference: selectedRef,
          action,
          operator_id: operatorId.trim() || "cielo_operator",
          assigned_to: assignedTo.trim() || undefined,
          internal_note: internalNote.trim() || undefined,
          decline_reason: declineReason.trim() || undefined,
        }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Action failed");
      setInternalNote("");
      setDeclineReason("");
      await loadQueue();
      await loadDetail(selectedRef);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const totalCount = filters.reduce((sum, f) => sum + f.count, 0);

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ fontFamily: FONT, fontSize: "1rem", marginBottom: "0.35rem" }}>
        Verified-rate request queue
      </h2>
      <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "#888", marginBottom: "0.85rem", lineHeight: 1.55 }}>
        Internal operator workflow — verified-rate requests only. Not bookings, reservations, or payments.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.85rem" }}>
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")} label={`All (${totalCount})`} />
        {filters.map(f => (
          <FilterBtn
            key={f.status}
            active={filter === f.status}
            onClick={() => setFilter(f.status)}
            label={`${f.label} (${f.count})`}
          />
        ))}
      </div>

      {error && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#FCA5A5", marginBottom: "0.65rem" }}>{error}</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)", gap: "1rem" }}>
        <div style={{ border: "1px solid #222", borderRadius: 12, overflow: "hidden" }}>
          {requests.length === 0 ? (
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#666", padding: "1rem" }}>No requests in this filter.</p>
          ) : requests.map(r => (
            <button
              key={r.public_reference}
              type="button"
              onClick={() => setSelectedRef(r.public_reference)}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "0.75rem 1rem",
                border: "none", borderBottom: "1px solid #222", cursor: "pointer",
                background: selectedRef === r.public_reference ? "rgba(16,185,129,0.12)" : "#0D1117",
                color: "#fff",
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: "0.72rem", fontWeight: 700 }}>{r.public_reference}</div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#aaa", marginTop: 4 }}>
                {r.status_label} · {r.eligibility_decision}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.65rem", color: "#666", marginTop: 4 }}>
                {r.guest_name ?? "—"} · {new Date(r.created_at).toLocaleString()}
              </div>
            </button>
          ))}
        </div>

        <div style={{ border: "1px solid #222", borderRadius: 12, padding: "1rem", background: "#0D1117", minHeight: 320 }}>
          {!detail ? (
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#666" }}>Select a request to review.</p>
          ) : (
            <>
              <div style={{ fontFamily: MONO, fontSize: "0.85rem", fontWeight: 800, color: ACCENT, marginBottom: "0.5rem" }}>
                {detail.public_reference}
              </div>
              <DetailRow label="Operator status" value={detail.status_label} />
              <DetailRow label="Eligibility decision" value={detail.eligibility_decision} />
              <DetailRow label="Policy" value={`${detail.policy_id} v${detail.policy_version}`} />
              <DetailRow label="Reason codes" value={detail.reason_codes.join(", ") || "—"} />
              <DetailRow label="Decision ID" value={detail.verification_decision_id ?? "—"} mono />
              <DetailRow label="Consent receipt" value={detail.consent_receipt_id ?? "—"} mono />
              <DetailRow label="Wallet binding" value={detail.wallet_binding_status ?? "—"} />
              <DetailRow label="Dates" value={
                detail.check_in && detail.check_out
                  ? `${detail.check_in} → ${detail.check_out} · ${detail.guests ?? "?"} guests`
                  : "—"
              } />
              <DetailRow label="Guest" value={detail.guest_name ?? "—"} />
              <DetailRow label="Contact" value={detail.contact_email ?? "—"} />
              {detail.notes && <DetailRow label="Guest notes" value={detail.notes} />}
              {detail.decision_reason && <DetailRow label="Decline reason" value={detail.decision_reason} />}

              <div style={{ marginTop: "0.85rem", marginBottom: "0.65rem" }}>
                <label style={{ fontFamily: FONT, fontSize: "0.65rem", color: "#888", display: "block", marginBottom: 4 }}>
                  Operator ID
                </label>
                <input value={operatorId} onChange={e => setOperatorId(e.target.value)} style={inp} />
              </div>
              <div style={{ marginBottom: "0.65rem" }}>
                <label style={{ fontFamily: FONT, fontSize: "0.65rem", color: "#888", display: "block", marginBottom: 4 }}>
                  Assign to (optional)
                </label>
                <input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={inp} />
              </div>
              <div style={{ marginBottom: "0.65rem" }}>
                <label style={{ fontFamily: FONT, fontSize: "0.65rem", color: "#888", display: "block", marginBottom: 4 }}>
                  Internal note (optional)
                </label>
                <textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} />
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ fontFamily: FONT, fontSize: "0.65rem", color: "#888", display: "block", marginBottom: 4 }}>
                  Decline reason (required to decline)
                </label>
                <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.85rem" }}>
                {(Object.keys(ACTION_LABELS) as OperatorAction[]).map(action => (
                  <button
                    key={action}
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction(action)}
                    style={{ ...btn, padding: "0.35rem 0.65rem", fontSize: "0.65rem", opacity: busy ? 0.6 : 1 }}
                  >
                    {ACTION_LABELS[action]}
                  </button>
                ))}
              </div>

              {detail.operator_notes.length > 0 && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "#aaa", marginBottom: 4 }}>
                    Internal notes
                  </div>
                  {detail.operator_notes.map((n, i) => (
                    <div key={i} style={{ fontFamily: FONT, fontSize: "0.65rem", color: "#888", marginBottom: 4, lineHeight: 1.5 }}>
                      <span style={{ color: "#666" }}>{n.author} · {new Date(n.created_at).toLocaleString()}</span>
                      <br />{n.note}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "#aaa", marginBottom: 4 }}>
                  Status timeline
                </div>
                {detail.events.map(e => (
                  <div key={e.id} style={{ fontFamily: MONO, fontSize: "0.58rem", color: "#777", lineHeight: 1.6, padding: "0.25rem 0", borderTop: "1px solid #1a1a1a" }}>
                    {new Date(e.created_at).toLocaleString()} · {e.action}
                    {e.prior_status ? ` · ${e.prior_status} → ${e.next_status}` : ` · ${e.next_status}`}
                    {e.note ? ` · ${e.note}` : ""}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function FilterBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "0.3rem 0.6rem", borderRadius: 999, cursor: "pointer",
        border: `1px solid ${active ? ACCENT : "#333"}`,
        background: active ? "rgba(16,185,129,0.15)" : "transparent",
        color: active ? ACCENT : "#888",
        fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
      }}
    >
      {label}
    </button>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ marginBottom: "0.35rem" }}>
      <span style={{ fontFamily: FONT, fontSize: "0.62rem", color: "#666" }}>{label}: </span>
      <span style={{ fontFamily: mono ? MONO : FONT, fontSize: "0.65rem", color: "#ccc", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", padding: "0.45rem", borderRadius: 8, border: "1px solid #333",
  background: "#111", color: "#fff", boxSizing: "border-box", fontFamily: FONT, fontSize: "0.72rem",
};

const btn: React.CSSProperties = {
  padding: "0.45rem 0.85rem", borderRadius: 8, border: "none", background: ACCENT,
  color: "#000", fontWeight: 700, cursor: "pointer",
};
