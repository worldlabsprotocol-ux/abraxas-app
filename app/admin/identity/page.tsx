"use client";
// FILE: app/admin/identity/page.tsx
// Abraxas independent identity review — ID + selfie preview, approve → L2 credential + on-chain stamps.

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IdentityReviewSubNav } from "@/components/admin/IdentityReviewSubNav";
import { RevocationControlPanel } from "@/components/admin/RevocationControlPanel";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { adminFetch } from "@/lib/admin/adminFetch";
import { useAdminConfirm } from "@/lib/admin/useAdminConfirm";
import { resolveIdentityReviewQueueTab } from "@/lib/admin/identityReviewQueueStates";
import { buildBiometricSignalRows } from "@/lib/admin/biometricSignalRows";
import { GOOD_TROUBLE_PARTNER_ID } from "@/lib/goodTrouble/constants";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";

interface DocRow {
  id: string;
  document_type: string | null;
  storage_path: string;
}

interface QueueItem {
  id: string;
  created_at: string;
  sui_address: string | null;
  status: string;
  subject_label: string;
  capture_session_id?: string | null;
  capture_complete?: boolean;
  partner_id?: string | null;
  policy_id?: string | null;
  verification_request_id?: string | null;
  review_status?: string | null;
  engine_decision?: string | null;
  eligibility_result?: string | null;
  raw_evidence_purged_at?: string | null;
  user_email?: string;
  legal_name?: string | null;
  documents?: DocRow[];
  biometric?: {
    face_match_score?: number;
    liveness_score?: number;
    document_quality_score?: number;
    selfie_quality_score?: number;
    decision?: string;
    reviewer_decision?: string | null;
    assurance_level?: string;
    review_method?: string;
    engine_version?: string;
    signals?: {
      rejection_reasons?: string[];
      fraud_risk_score?: number;
      fraud_risk?: number;
      face_detected_selfie?: boolean;
      face_detected_id?: boolean;
      face_count_selfie?: number;
      document_type?: string;
      document_confidence?: number;
      face_match?: number;
      liveness?: number;
      tamper_score?: number;
      id_tamper_score?: number;
      selfie_tamper_score?: number;
      selfie_blur_score?: number;
      selfie_lighting_score?: number;
      selfie_occlusion_score?: number;
      alignment_score?: number;
      face_coverage?: number;
      screen_replay_score?: number;
      deepfake_score?: number;
      deepfake_status?: string;
      reason_codes?: string[];
      threshold_policy_source?: string;
      partner_id?: string;
      face_match_method?: string;
    };
  } | null;
}

type ReviewAction = "approve" | "reject" | "request_resubmission";

function BiometricSignalsPanel({ item }: { item: QueueItem }) {
  const bio = item.biometric;
  if (!bio) {
    return (
      <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", marginTop: 10 }}>
        No biometric assessment on file.
      </div>
    );
  }

  const signals = bio.signals ?? {};
  const rows = buildBiometricSignalRows(bio);

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap: "0.35rem 0.75rem",
        padding: "0.65rem 0.75rem",
        borderRadius: 8,
        background: "rgba(16,185,129,0.06)",
        border: "1px solid rgba(16,185,129,0.15)",
      }}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <div style={{ fontFamily: FONT, fontSize: "0.58rem", color: "rgba(255,255,255,0.45)" }}>{label}</div>
            <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "#D1FAE5", marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>
      {signals.rejection_reasons && signals.rejection_reasons.length > 0 && (
        <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "rgba(255,255,255,0.65)", marginTop: 8, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Engine rejection reasons</div>
          {signals.rejection_reasons.map(r => (
            <div key={r} style={{ marginTop: 2 }}>• {r}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function CapturePreview({
  doc,
  label,
}: {
  doc: DocRow | undefined;
  label: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!doc?.storage_path) return;
    let cancelled = false;
    void adminFetch(`/api/admin/identity/document-url?path=${encodeURIComponent(doc.storage_path)}`)
      .then(r => r.json())
      .then((data: { signed_url?: string }) => {
        if (!cancelled && data.signed_url) setUrl(data.signed_url);
      })
      .catch(() => { if (!cancelled) setErr(true); });
    return () => { cancelled = true; };
  }, [doc?.storage_path]);

  return (
    <div style={{ flex: "1 1 140px", minWidth: 120 }}>
      <div style={{ fontFamily: FONT, fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        height: 100, borderRadius: 8, overflow: "hidden",
        background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontFamily: FONT, fontSize: "0.62rem", color: err ? "#FCA5A5" : "rgba(255,255,255,0.35)" }}>
            {err ? "Preview failed" : "Loading…"}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdminIdentityPage() {
  const searchParams = useSearchParams();
  const activeTab = resolveIdentityReviewQueueTab(searchParams.get("status"));
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [documentDobs, setDocumentDobs] = useState<Record<string, string>>({});
  const [expandedDetail, setExpandedDetail] = useState<Record<string, boolean>>({});
  const [partnerFilter, setPartnerFilter] = useState<"all" | "good_trouble">("all");
  const { requestConfirm, confirmDialogProps } = useAdminConfirm();

  const itemBusy = (id: string) =>
    actionId === id || loading || confirmDialogProps.open || confirmDialogProps.busy;

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const partnerParam = partnerFilter === "good_trouble"
        ? `&partner_id=${encodeURIComponent(GOOD_TROUBLE_PARTNER_ID)}`
        : "";
      const detailParam = Object.values(expandedDetail).some(Boolean) ? "&detail=true" : "";
      const res = await adminFetch(
        `/api/admin/identity/queue?status=${encodeURIComponent(activeTab.queryStatus)}${partnerParam}${detailParam}`,
      );
      const data = await res.json() as { items?: QueueItem[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load queue");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [activeTab.queryStatus, partnerFilter, expandedDetail]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    setSuccess(null);
  }, [activeTab.queryStatus]);

  const REVIEW_SUCCESS_COPY: Record<ReviewAction, string> = {
    approve: "Identity approved. Queue refreshed.",
    reject: "Identity submission rejected. Queue refreshed.",
    request_resubmission: "Submission marked for resubmission. Queue refreshed.",
  };

  async function runReview(item: QueueItem, action: ReviewAction) {
    setActionId(item.id);
    setError("");
    setSuccess(null);
    try {
      const minimumAgeGate = 21;
      const body: Record<string, unknown> = {
        document_id: item.id,
        action,
        jurisdiction: "US",
        document_type: "passport",
        reviewer: "admin",
        note: notes[item.id]?.trim() || undefined,
      };
      if (action === "approve") {
        body.minimum_age_gate = minimumAgeGate;
        body.document_date_of_birth = documentDobs[item.id]?.trim() || undefined;
      }
      const res = await adminFetch("/api/admin/identity/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok?: boolean; error?: string; reviewer_decision?: string };
      if (!res.ok) throw new Error(data.error ?? `${action} failed`);
      setSuccess(REVIEW_SUCCESS_COPY[action]);
      await loadQueue();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setActionId(null);
    }
  }

  const idDoc = (item: QueueItem) => item.documents?.find(d => d.document_type === "id_front");
  const selfieDoc = (item: QueueItem) => item.documents?.find(d => d.document_type === "selfie");

  function promptReview(item: QueueItem, action: "approve" | "reject") {
    setSuccess(null);
    requestConfirm({
      actionKey: action === "approve" ? "identity.approve" : "identity.reject",
      context: {
        subjectLabel: item.legal_name ?? item.subject_label,
        assuranceLevel: item.biometric?.assurance_level === "L3" ? "3" : "2",
      },
      onConfirmed: () => runReview(item, action),
    });
  }

  async function purgeRawEvidence(item: QueueItem) {
    if (!item.capture_session_id) return;
    setActionId(item.id);
    setError("");
    try {
      const res = await adminFetch("/api/admin/identity/purge-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capture_session_id: item.capture_session_id, force: true }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Purge failed");
      setSuccess("Raw evidence purged. Decision record and credential remain.");
      await loadQueue();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purge failed");
    } finally {
      setActionId(null);
    }
  }

  function promptPurge(item: QueueItem) {
    requestConfirm({
      actionKey: "identity.purge_evidence",
      context: {
        subjectLabel: item.subject_label,
        assuranceLevel: "2",
      },
      onConfirmed: () => purgeRawEvidence(item),
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c10", color: "#f0f0f0", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <IdentityReviewSubNav activeTabId={activeTab.id} />

        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: "1.25rem" }}>
          Engine decisions are preserved separately from reviewer decisions. Every action writes an immutable audit log.
          Health: <code>/api/idv/independent/status</code>
        </p>

        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => void loadQueue()}
            disabled={loading}
            style={{
              padding: "0.55rem 1rem", borderRadius: 8, border: "none",
              background: "#10B981", color: "#000", fontFamily: FONT, fontSize: "0.78rem",
              fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <label style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", gap: 6 }}>
            Partner
            <select
              value={partnerFilter}
              onChange={e => setPartnerFilter(e.target.value as "all" | "good_trouble")}
              style={{
                padding: "0.35rem 0.5rem", borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)",
                color: "#f0f0f0", fontFamily: FONT, fontSize: "0.72rem",
              }}
            >
              <option value="all">All partners</option>
              <option value="good_trouble">Good Trouble</option>
            </select>
          </label>
        </div>

        {error && (
          <div style={{ padding: "0.65rem 0.85rem", borderRadius: 8, marginBottom: "1rem",
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
            fontFamily: FONT, fontSize: "0.75rem", color: "#FCA5A5" }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: "0.65rem 0.85rem", borderRadius: 8, marginBottom: "1rem",
            background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)",
            fontFamily: FONT, fontSize: "0.75rem", color: "#86EFAC" }}>
            {success}
          </div>
        )}

        {items.length === 0 && !loading ? (
          <div style={{ fontFamily: FONT, fontSize: "0.82rem", color: "rgba(255,255,255,0.4)" }}>
            No {activeTab.label.toLowerCase()} identity submissions.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {items.map(item => (
              <div key={item.id} style={{
                padding: "1rem", borderRadius: 10,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 280px" }}>
                    <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700 }}>
                      {item.subject_label}
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
                      {item.partner_id ? `Partner: ${item.partner_id}` : "Partner: (none)"}
                      {item.policy_id ? ` · Policy: ${item.policy_id}` : ""}
                      {item.verification_request_id ? ` · Flow: ${item.verification_request_id.slice(0, 8)}…` : ""}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
                      {item.sui_address ? `${item.sui_address.slice(0, 10)}…${item.sui_address.slice(-6)}` : "No wallet — user must sign in"}
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", marginTop: 6 }}>
                      {item.capture_complete ? "ID + selfie complete" : "Incomplete capture"}
                      {" · "}{new Date(item.created_at).toLocaleString()}
                      {item.capture_session_id && (
                        <>{" · "}session {item.capture_session_id.slice(0, 8)}…</>
                      )}
                      {item.raw_evidence_purged_at
                        ? " · Raw evidence purged"
                        : activeTab.id !== "pending" ? " · Raw evidence retained" : ""}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedDetail(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                        void loadQueue();
                      }}
                      style={{
                        marginTop: 8, padding: "0.25rem 0.5rem", borderRadius: 4,
                        border: "1px solid rgba(255,255,255,0.12)", background: "transparent",
                        color: "#10B981", fontFamily: FONT, fontSize: "0.65rem", cursor: "pointer",
                      }}
                    >
                      {expandedDetail[item.id] ? "Hide protected detail" : "Open protected review detail"}
                    </button>
                    {expandedDetail[item.id] && item.legal_name && (
                      <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.65)", marginTop: 6 }}>
                        Reviewer-only: {item.legal_name}
                        {item.user_email ? ` · ${item.user_email}` : ""}
                      </div>
                    )}
                    <BiometricSignalsPanel item={item} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end", minWidth: 160 }}>
                    {activeTab.id === "pending" ? (
                      <>
                        <textarea
                          value={notes[item.id] ?? ""}
                          onChange={e => setNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="Reviewer reason (required for age approval)"
                          rows={2}
                          disabled={itemBusy(item.id)}
                          style={{
                            width: "100%", minWidth: 180, padding: "0.45rem 0.55rem", borderRadius: 6,
                            border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)",
                            color: "#f0f0f0", fontFamily: FONT, fontSize: "0.68rem", resize: "vertical",
                          }}
                        />
                        <input
                          type="date"
                          value={documentDobs[item.id] ?? ""}
                          onChange={e => setDocumentDobs(prev => ({ ...prev, [item.id]: e.target.value }))}
                          disabled={itemBusy(item.id)}
                          title="Document date of birth (internal only — never exposed)"
                          style={{
                            width: "100%", minWidth: 180, padding: "0.45rem 0.55rem", borderRadius: 6,
                            border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)",
                            color: "#f0f0f0", fontFamily: FONT, fontSize: "0.68rem",
                          }}
                        />
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => promptReview(item, "approve")}
                            disabled={
                              itemBusy(item.id)
                              || !item.sui_address
                              || !item.capture_complete
                              || !notes[item.id]?.trim()
                              || !documentDobs[item.id]?.trim()
                            }
                            title={
                              !item.sui_address ? "User must sign in"
                                : !item.capture_complete ? "Missing ID or selfie"
                                  : !notes[item.id]?.trim() ? "Reviewer reason required"
                                    : !documentDobs[item.id]?.trim() ? "Document DOB required for age eligibility"
                                      : undefined
                            }
                            style={{
                              padding: "0.45rem 0.85rem", borderRadius: 6, border: "none",
                              background: item.sui_address && item.capture_complete ? "#10B981" : "rgba(255,255,255,0.1)",
                              color: item.sui_address && item.capture_complete ? "#000" : "rgba(255,255,255,0.3)",
                              fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
                              cursor: item.sui_address && item.capture_complete ? "pointer" : "not-allowed",
                            }}
                          >
                            Approve {item.biometric?.assurance_level === "L3" ? "L3" : "L2"}
                          </button>
                          <button
                            onClick={() => void runReview(item, "request_resubmission")}
                            disabled={itemBusy(item.id)}
                            style={{
                              padding: "0.45rem 0.85rem", borderRadius: 6,
                              border: "1px solid rgba(251,191,36,0.45)", background: "transparent",
                              color: "#FCD34D", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Resubmit
                          </button>
                          <button
                            onClick={() => promptReview(item, "reject")}
                            disabled={itemBusy(item.id)}
                            style={{
                              padding: "0.45rem 0.85rem", borderRadius: 6,
                              border: "1px solid rgba(239,68,68,0.4)", background: "transparent",
                              color: "#FCA5A5", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
                        <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", textAlign: "right" }}>
                          Status: {item.status}
                          {item.eligibility_result ? ` · ${item.eligibility_result}` : ""}
                        </div>
                        {!item.raw_evidence_purged_at && item.capture_session_id && (
                          <button
                            onClick={() => promptPurge(item)}
                            disabled={itemBusy(item.id)}
                            style={{
                              padding: "0.45rem 0.85rem", borderRadius: 6,
                              border: "1px solid rgba(251,191,36,0.45)", background: "transparent",
                              color: "#FCD34D", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Purge raw evidence
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {item.capture_session_id && expandedDetail[item.id] && !item.raw_evidence_purged_at && (
                  <div style={{ display: "flex", gap: "0.65rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
                    <CapturePreview doc={idDoc(item)} label="Government ID" />
                    <CapturePreview doc={selfieDoc(item)} label="Selfie" />
                  </div>
                )}
                {item.raw_evidence_purged_at && (
                  <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", marginTop: 8 }}>
                    Raw evidence purged — images unavailable. Decision record and credential remain.
                  </p>
                )}

                {item.sui_address && (
                  <RevocationControlPanel subjectId={item.sui_address} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <AdminConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
