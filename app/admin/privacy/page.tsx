"use client";
// FILE: app/admin/privacy/page.tsx
// Admin queue for holder privacy requests.

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { adminFetch } from "@/lib/admin/adminFetch";
import type { AdminConfirmActionKey } from "@/lib/admin/adminConfirmCopy";
import { useAdminConfirm } from "@/lib/admin/useAdminConfirm";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";

interface RequestRow {
  id: string;
  request_ref: string;
  request_type: string;
  status: string;
  status_label: string;
  subject_pseudonym_id: string;
  created_at: string;
  updated_at: string;
}

const PRIVACY_CONFIRM_ACTIONS: Partial<Record<string, AdminConfirmActionKey>> = {
  approve_deletion: "privacy.approve_deletion",
  approve_export: "privacy.approve_export",
  deny: "privacy.deny",
  legal_hold: "privacy.legal_hold",
};

export default function AdminPrivacyPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { requestConfirm, confirmDialogProps } = useAdminConfirm();

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch("/api/admin/privacy/requests");
      const data = await res.json() as { requests?: RequestRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setRequests(data.requests ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadList(); }, [loadList]);

  async function runAction(requestId: string, action: string) {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await adminFetch(`/api/admin/privacy/requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          idempotency_key: `admin:${action}:${requestId}`,
        }),
      });
      const data = await res.json() as { error?: string; access_revoked?: boolean };
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      setMessage(
        action === "approve_deletion" && data.access_revoked
          ? "Access revoked. Physical deletion still pending retention policy."
          : `Action ${action} completed.`,
      );
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  function promptAction(req: RequestRow, action: string) {
    const actionKey = PRIVACY_CONFIRM_ACTIONS[action];
    if (!actionKey) {
      void runAction(req.id, action);
      return;
    }
    requestConfirm({
      actionKey,
      context: {
        requestRef: req.request_ref,
        requestType: req.request_type,
      },
      onConfirmed: () => runAction(req.id, action),
    });
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: 960, margin: "0 auto", color: "#f0f0f0", fontFamily: FONT }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link href="/admin/receipts" style={{ color: "#10B981", fontSize: "0.78rem" }}>← Admin</Link>
      </div>
      <h1 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>Privacy request queue</h1>
      <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: "1rem" }}>
        Review holder export and deletion requests. Deletion approval revokes access only — no automatic storage purge.
      </p>

      {error && <p style={{ color: "#FCA5A5", fontSize: "0.78rem" }}>{error}</p>}
      {message && <p style={{ color: "#10B981", fontSize: "0.78rem" }}>{message}</p>}
      {loading && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem" }}>Loading…</p>}

      {requests.map(req => (
        <div key={req.id} style={{
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
          padding: "0.85rem", marginBottom: "0.65rem", background: "#0d1017",
        }}>
          <div style={{ fontFamily: MONO, fontSize: "0.68rem", marginBottom: "0.35rem" }}>
            {req.request_type} · {req.status} · ref {req.request_ref}
          </div>
          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem" }}>
            Subject pseudonym: {req.subject_pseudonym_id.slice(0, 12)}… · {new Date(req.created_at).toISOString()}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
            <ActionBtn
              label="Review"
              disabled={confirmDialogProps.busy}
              onClick={() => void runAction(req.id, "start_review")}
            />
            {req.request_type === "data_export" && (
              <ActionBtn
                label="Approve export"
                disabled={confirmDialogProps.busy}
                onClick={() => promptAction(req, "approve_export")}
              />
            )}
            {req.request_type === "account_deletion" && (
              <ActionBtn
                label="Approve deletion (revoke access)"
                disabled={confirmDialogProps.busy}
                onClick={() => promptAction(req, "approve_deletion")}
              />
            )}
            <ActionBtn
              label="Legal hold"
              disabled={confirmDialogProps.busy}
              onClick={() => promptAction(req, "legal_hold")}
            />
            <ActionBtn
              label="Complete"
              disabled={confirmDialogProps.busy}
              onClick={() => void runAction(req.id, "complete")}
            />
            <ActionBtn
              label="Deny"
              disabled={confirmDialogProps.busy}
              onClick={() => promptAction(req, "deny")}
            />
          </div>
        </div>
      ))}

      {!loading && requests.length === 0 && (
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>No privacy requests in queue.</p>
      )}

      <AdminConfirmDialog {...confirmDialogProps} />
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.3rem 0.55rem", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)",
        background: "rgba(255,255,255,0.05)", color: "#f0f0f0", fontSize: "0.68rem",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}
