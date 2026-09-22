"use client";

import { useCallback, useState } from "react";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { useAdminConfirm } from "@/lib/admin/useAdminConfirm";
import { adminFetch } from "@/lib/admin/adminFetch";
import { SANDBOX_INSTITUTIONAL_OPERATOR_NOTICE } from "@/lib/partner/sandboxInstitutionalOperatorResult/contract";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

interface AuditItem {
  organization_ref: string;
  result_label: string;
  policy_id: string;
  policy_version: number;
  environment: string;
  expires_at: string;
  lifecycle_state: string;
  application_ref: string;
}

export function SandboxInstitutionalOperatorResultPanel() {
  const { requestConfirm, confirmDialogProps } = useAdminConfirm();
  const [applicationId, setApplicationId] = useState("");
  const [items, setItems] = useState<AuditItem[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(SANDBOX_INSTITUTIONAL_OPERATOR_NOTICE);

  const refresh = useCallback(async () => {
    const qs = applicationId.trim() ? `?application_id=${encodeURIComponent(applicationId.trim())}` : "";
    const res = await adminFetch(`/api/admin/sandbox-institutional-result${qs}`, { cache: "no-store" });
    const data = await res.json() as { items?: AuditItem[]; notice?: string; error?: string };
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    setItems(data.items ?? []);
    if (data.notice) setNotice(data.notice);
  }, [applicationId]);

  async function issue() {
    setError("");
    const res = await adminFetch("/api/admin/sandbox-institutional-result", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ application_id: applicationId.trim(), confirm: true }),
    });
    const data = await res.json() as { error?: string };
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    await refresh();
  }

  async function revoke(organizationRef: string) {
    setError("");
    const res = await adminFetch("/api/admin/sandbox-institutional-result", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        application_id: applicationId.trim(),
        organization_ref: organizationRef,
        confirm: true,
      }),
    });
    const data = await res.json() as { error?: string };
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    await refresh();
  }

  return (
    <div>
      <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
        {notice} Operator access only. There is no public creation flow.
      </p>
      <label style={{ display: "block", marginTop: "1rem", fontFamily: FONT, fontSize: "0.75rem" }}>
        Launchpad application ref
        <input
          value={applicationId}
          onChange={(e) => setApplicationId(e.target.value)}
          style={{
            display: "block",
            width: "100%",
            marginTop: "0.35rem",
            padding: "0.5rem 0.7rem",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "#f0f0f0",
            fontFamily: MONO,
          }}
        />
      </label>
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => requestConfirm({
            actionKey: "sandbox_institutional_result.issue",
            onConfirmed: () => void issue().catch((err: unknown) => setError(err instanceof Error ? err.message : "issue_failed")),
          })}
          style={{ padding: "0.45rem 0.8rem", background: "#10B981", color: "#04120e", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
        >
          Issue sandbox test result
        </button>
        <button
          type="button"
          onClick={() => void refresh().catch((err: unknown) => setError(err instanceof Error ? err.message : "load_failed"))}
          style={{ padding: "0.45rem 0.8rem", background: "transparent", color: "#f0f0f0", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>
      {error && <p style={{ color: "#f87171", fontFamily: FONT }}>{error}</p>}
      <ul style={{ listStyle: "none", padding: 0, marginTop: "1.25rem" }}>
        {items.map((item) => (
          <li key={item.organization_ref} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "0.75rem", marginBottom: "0.65rem" }}>
            <div style={{ fontFamily: MONO, fontSize: "0.68rem" }}>ref {item.organization_ref}</div>
            <div style={{ fontFamily: FONT, fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
              {item.result_label} · {item.lifecycle_state} · expires {item.expires_at}
            </div>
            <button
              type="button"
              onClick={() => requestConfirm({
                actionKey: "sandbox_institutional_result.revoke",
                onConfirmed: () => void revoke(item.organization_ref).catch((err: unknown) => setError(err instanceof Error ? err.message : "revoke_failed")),
              })}
              style={{ marginTop: "0.5rem", padding: "0.35rem 0.65rem", background: "transparent", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.45)", borderRadius: 8, cursor: "pointer" }}
            >
              Revoke
            </button>
          </li>
        ))}
      </ul>
      <AdminConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
