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

  async function approve(item: QueueItem) {
    setActionId(item.id);
    setError("");
    try {
      const res = await fetch("/api/admin/identity/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": pin },
        body: JSON.stringify({
          document_id: item.id,
          action: "approve",
          jurisdiction: "US",
          document_type: "passport",
          reviewer: "admin",
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; jti?: string };
      if (!res.ok) throw new Error(data.error ?? "Approve failed");
      await loadQueue();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setActionId(null);
    }
  }

  async function reject(item: QueueItem) {
    const note = window.prompt("Rejection note (optional):") ?? "";
    setActionId(item.id);
    setError("");
    try {
      const res = await fetch("/api/admin/identity/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": pin },
        body: JSON.stringify({
          document_id: item.id,
          action: "reject",
          note,
          reviewer: "admin",
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Reject failed");
      await loadQueue();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
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
          Users submit legal name + ID + selfie from /passport. Approve to issue L2 credential + on-chain stamps
          on the active Sui network (devnet or mainnet). Health: <code>/api/idv/independent/status</code>
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
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    <button
                      onClick={() => void approve(item)}
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
                      Approve L2
                    </button>
                    <button
                      onClick={() => void reject(item)}
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
