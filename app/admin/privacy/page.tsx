"use client";
// FILE: app/admin/privacy/page.tsx
// Admin queue for holder privacy requests.

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { OperationalEmptyState } from "@/components/admin/operator/OperationalEmptyState";
import { OperationalErrorState } from "@/components/admin/operator/OperationalErrorState";
import { adminFetch } from "@/lib/admin/adminFetch";
import type { AdminConfirmActionKey } from "@/lib/admin/adminConfirmCopy";
import { useAdminConfirm } from "@/lib/admin/useAdminConfirm";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { ContentCard, PageHeader } from "@/components/redesign/RedesignContent";

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

const STATUS_FILTERS = [
  { value: "", label: "Active queue" },
  { value: "requested", label: "Requested" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "legal_hold", label: "Legal hold" },
  { value: "access_revoked_pending_purge", label: "Access revoked" },
] as const;

export default function AdminPrivacyPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { requestConfirm, confirmDialogProps } = useAdminConfirm();

  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const url = statusFilter
        ? `/api/admin/privacy/requests?status=${encodeURIComponent(statusFilter)}`
        : "/api/admin/privacy/requests";
      const res = await adminFetch(url);
      const data = await res.json() as { requests?: RequestRow[]; error?: string };
      if (!res.ok) {
        setRequests([]);
        setLoadError(data.error ?? "Privacy queue unavailable.");
        return;
      }
      setRequests(data.requests ?? []);
    } catch {
      setRequests([]);
      setLoadError("Privacy queue unavailable.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void loadList(); }, [loadList]);

  async function runAction(requestId: string, action: string) {
    setLoading(true);
    setMessage("");
    setActionError("");
    try {
      const res = await adminFetch(`/api/admin/privacy/requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          idempotency_key: `admin:${action}:${requestId}`,
        }),
      });
      const data = await res.json() as { error?: string; access_revoked?: boolean; request?: { status?: string } };
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      setMessage(
        action === "approve_deletion" && data.access_revoked
          ? "Access revoked. Physical deletion still pending retention policy."
          : `Action completed — backend status: ${data.request?.status ?? "updated"}.`,
      );
      await loadList();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  const actionsDisabled = loading || confirmDialogProps.open || confirmDialogProps.busy;

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
    <RedesignPage accent="admin" maxWidth={960}>
      <PageHeader
        eyebrow="Admin · Privacy"
        title="Privacy request queue"
        subtitle="Review holder export and deletion requests. Deletion approval revokes access only — no automatic storage purge."
      />

      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {STATUS_FILTERS.map(filter => (
          <button
            key={filter.value || "active"}
            type="button"
            disabled={loading}
            onClick={() => setStatusFilter(filter.value)}
            style={{
              padding: "0.3rem 0.55rem", borderRadius: 999,
              border: statusFilter === filter.value ? "1px solid var(--accent)" : "1px solid var(--border)",
              background: statusFilter === filter.value ? "rgba(16,185,129,0.1)" : "transparent",
              color: statusFilter === filter.value ? "#6EE7B7" : "var(--text-secondary)",
              fontFamily: FONT, fontSize: "0.65rem", fontWeight: 700, cursor: "pointer",
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loadError && (
        <OperationalErrorState
          title="Privacy queue unavailable"
          message={`${loadError} Queue count is unknown — not zero.`}
          onRetry={() => void loadList()}
        />
      )}

      {actionError && (
        <p role="alert" style={{ color: "#FCA5A5", fontSize: "0.78rem", fontFamily: FONT }}>{actionError}</p>
      )}
      {message && (
        <p style={{ color: "#10B981", fontSize: "0.78rem", fontFamily: FONT }}>{message}</p>
      )}
      {loading && !loadError && (
        <p role="status" style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", fontFamily: FONT }}>Loading…</p>
      )}

      {!loadError && !loading && requests.length === 0 && (
        <OperationalEmptyState
          title="No privacy requests in this view"
          body="The queue loaded successfully and reports zero items for the selected filter."
        />
      )}

      {!loadError && requests.length > 0 && (
        <ContentCard title="Requests">
          {requests.map(req => (
            <div key={req.id} style={{
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
              padding: "0.85rem", marginBottom: "0.65rem", background: "#0d1017",
            }}>
              <div style={{ fontFamily: MONO, fontSize: "0.68rem", marginBottom: "0.35rem" }}>
                {req.request_type} · {req.status_label ?? req.status} · ref {req.request_ref}
              </div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem" }}>
                Subject pseudonym: {req.subject_pseudonym_id.slice(0, 12)}… · received {new Date(req.created_at).toISOString()}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                <ActionBtn label="Review" disabled={actionsDisabled} onClick={() => void runAction(req.id, "start_review")} />
                {req.request_type === "data_export" && (
                  <ActionBtn label="Approve export" disabled={actionsDisabled} onClick={() => promptAction(req, "approve_export")} />
                )}
                {req.request_type === "account_deletion" && (
                  <ActionBtn label="Approve deletion (revoke access)" disabled={actionsDisabled} onClick={() => promptAction(req, "approve_deletion")} />
                )}
                <ActionBtn label="Legal hold" disabled={actionsDisabled} onClick={() => promptAction(req, "legal_hold")} />
                <ActionBtn label="Complete" disabled={actionsDisabled} onClick={() => void runAction(req.id, "complete")} />
                <ActionBtn label="Deny" disabled={actionsDisabled} onClick={() => promptAction(req, "deny")} />
              </div>
            </div>
          ))}
        </ContentCard>
      )}

      <AdminConfirmDialog {...confirmDialogProps} />
    </RedesignPage>
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
