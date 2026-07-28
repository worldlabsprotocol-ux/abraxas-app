"use client";
// FILE: app/admin/identity/page.tsx
// Abraxas independent identity review — ID + selfie preview, approve → L2 credential + on-chain stamps.

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN ?? "abraxas2026";
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
  user_email: string;
  sui_address: string | null;
  file_name: string;
  storage_path: string;
  status: string;
  reviewer_note: string | null;
  legal_name?: string | null;
  capture_session_id?: string | null;
  document_type?: string | null;
  has_selfie?: boolean;
  has_id_front?: boolean;
  capture_complete?: boolean;
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
    };
  } | null;
}

type ReviewAction = "approve" | "reject" | "request_resubmission";

function pct(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(0)}%`;
}

function boolLabel(value: unknown): string {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "—";
}

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
  const fraud = signals.fraud_risk ?? signals.fraud_risk_score;
  const tamper = signals.tamper_score ?? signals.id_tamper_score;

  const rows: Array<[string, string]> = [
    ["Engine version", bio.engine_version ?? "—"],
    ["Engine decision", bio.decision ?? "—"],
    ["Reviewer decision", bio.reviewer_decision ?? "pending"],
    ["Fraud risk", pct(fraud)],
    ["Face match", pct(signals.face_match ?? bio.face_match_score)],
    ["Liveness", pct(signals.liveness ?? bio.liveness_score)],
    ["Document type", String(signals.document_type ?? "—")],
    ["Document confidence", pct(signals.document_confidence)],
    ["ID image quality", pct(bio.document_quality_score)],
    ["Selfie quality", pct(bio.selfie_quality_score)],
    ["Tamper score", pct(tamper)],
    ["Face detected (ID)", boolLabel(signals.face_detected_id)],
    ["Face detected (selfie)", boolLabel(signals.face_detected_selfie)],
    ["Selfie face count", String(signals.face_count_selfie ?? "—")],
    ["Assurance", bio.assurance_level ?? "—"],
    ["Review method", bio.review_method ?? "—"],
  ];

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
  pin,
  doc,
  label,
}: {
  pin: string;
  doc: DocRow | undefined;
  label: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!doc?.storage_path) return;
    let cancelled = false;
    void fetch(`/api/admin/identity/document-url?path=${encodeURIComponent(doc.storage_path)}`, {
      headers: { "x-admin-pin": pin },
    })
      .then(r => r.json())
      .then((data: { signed_url?: string }) => {
        if (!cancelled && data.signed_url) setUrl(data.signed_url);
      })
      .catch(() => { if (!cancelled) setErr(true); });
    return () => { cancelled = true; };
  }, [doc?.storage_path, pin]);

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
  const [pin, setPin] = useState(ADMIN_PIN);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/identity/queue?status=pending", {
        headers: { "x-admin-pin": pin },
      });
      const data = await res.json() as { items?: QueueItem[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load queue");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [pin]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  async function runReview(item: QueueItem, action: ReviewAction) {
    setActionId(item.id);
    setError("");
    try {
      const res = await fetch("/api/admin/identity/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": pin },
        body: JSON.stringify({
          document_id: item.id,
          action,
          jurisdiction: "US",
          document_type: "passport",
          reviewer: "admin",
          note: notes[item.id]?.trim() || undefined,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; reviewer_decision?: string };
      if (!res.ok) throw new Error(data.error ?? `${action} failed`);
      await loadQueue();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setActionId(null);
    }
  }

  const idDoc = (item: QueueItem) => item.documents?.find(d => d.document_type === "id_front");
  const selfieDoc = (item: QueueItem) => item.documents?.find(d => d.document_type === "selfie");

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c10", color: "#f0f0f0", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "#10B981", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
              Abraxas independent verify
            </div>
            <h1 style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>
              Identity review queue
            </h1>
          </div>
          <Link href="/admin" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#10B981", textDecoration: "none" }}>
            ← Admin home
          </Link>
        </div>

        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: "1.25rem" }}>
          Engine decisions are preserved separately from reviewer decisions. Every action writes an immutable audit log.
          Health: <code>/api/idv/independent/status</code>
        </p>

        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Admin PIN"
            style={{
              padding: "0.55rem 0.75rem", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
              color: "#f0f0f0", fontFamily: MONO, fontSize: "0.72rem",
            }}
          />
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
        </div>

        {error && (
          <div style={{ padding: "0.65rem 0.85rem", borderRadius: 8, marginBottom: "1rem",
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
            fontFamily: FONT, fontSize: "0.75rem", color: "#FCA5A5" }}>
            {error}
          </div>
        )}

        {items.length === 0 && !loading ? (
          <div style={{ fontFamily: FONT, fontSize: "0.82rem", color: "rgba(255,255,255,0.4)" }}>
            No pending identity uploads.
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
                      {item.legal_name ?? item.user_email}
                    </div>
                    {item.legal_name && (
                      <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                        {item.user_email}
                      </div>
                    )}
                    <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
                      {item.sui_address ? `${item.sui_address.slice(0, 10)}…${item.sui_address.slice(-6)}` : "No wallet — user must sign in"}
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", marginTop: 6 }}>
                      {item.capture_complete ? "ID + selfie complete" : "Incomplete capture"}
                      {" · "}{new Date(item.created_at).toLocaleString()}
                      {item.capture_session_id && (
                        <>{" · "}session {item.capture_session_id.slice(0, 8)}…</>
                      )}
                    </div>
                    <BiometricSignalsPanel item={item} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end", minWidth: 160 }}>
                    <textarea
                      value={notes[item.id] ?? ""}
                      onChange={e => setNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Reviewer notes"
                      rows={2}
                      style={{
                        width: "100%", minWidth: 180, padding: "0.45rem 0.55rem", borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)",
                        color: "#f0f0f0", fontFamily: FONT, fontSize: "0.68rem", resize: "vertical",
                      }}
                    />
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => void runReview(item, "approve")}
                        disabled={actionId === item.id || !item.sui_address || !item.capture_complete}
                        title={!item.sui_address ? "User must sign in" : !item.capture_complete ? "Missing ID or selfie" : undefined}
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
                        disabled={actionId === item.id}
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
                        onClick={() => void runReview(item, "reject")}
                        disabled={actionId === item.id}
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
                  </div>
                </div>

                {item.capture_session_id && (
                  <div style={{ display: "flex", gap: "0.65rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
                    <CapturePreview pin={pin} doc={idDoc(item)} label="Government ID" />
                    <CapturePreview pin={pin} doc={selfieDoc(item)} label="Selfie" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
