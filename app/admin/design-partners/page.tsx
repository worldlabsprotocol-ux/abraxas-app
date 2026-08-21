"use client";
// FILE: app/admin/design-partners/page.tsx
// Review design partner applications and promote to relying party orgs.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { useAdminConfirm } from "@/lib/admin/useAdminConfirm";
import {
  ProductionAdminSessionStatus,
  PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE,
  useProductionAdminSessionGate,
} from "@/lib/admin/productionAdminSessionUi";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { slugifyPartnerId } from "@/lib/partner/partnerOnboarding";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

interface Application {
  id: string;
  company: string;
  contact_name: string | null;
  email: string;
  use_case: string | null;
  integration_type: string | null;
  status: string;
  promoted_partner_id: string | null;
  created_at: string;
}

export default function AdminDesignPartnersPage() {
  const gate = useProductionAdminSessionGate();
  const [apps, setApps] = useState<Application[]>([]);
  const [msg, setMsg] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [partnerIds, setPartnerIds] = useState<Record<string, string>>({});
  const { requestConfirm, confirmDialogProps } = useAdminConfirm();

  const refresh = useCallback(async () => {
    const res = await gate.adminRequest("/api/admin/design-partners", { cache: "no-store" });
    if (res.status === 401 && !gate.usePinUnlock) {
      setMsg(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE);
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setApps(data.applications ?? []);
  }, [gate.adminRequest, gate.usePinUnlock]);

  useEffect(() => {
    if (!gate.authorized || gate.loading) return;
    void refresh();
  }, [gate.authorized, gate.loading, refresh]);

  async function updateStatus(id: string, status: string) {
    setMsg("");
    const res = await gate.adminRequest("/api/admin/design-partners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.status === 401 && !gate.usePinUnlock) {
      setMsg(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE);
      return;
    }
    if (!res.ok) {
      setMsg("Status update failed");
      return;
    }
    await refresh();
  }

  async function executePromote(app: Application, issueLive = false) {
    setMsg("");
    setNewKey(null);
    const partnerId = partnerIds[app.id] || slugifyPartnerId(app.company);
    const res = await gate.adminRequest("/api/admin/design-partners/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: app.id,
        partner_id: partnerId,
        issue_live: issueLive,
      }),
    });
    if (res.status === 401 && !gate.usePinUnlock) {
      setMsg(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE);
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Promote failed");
      return;
    }
    setNewKey(data.api_key ?? null);
    setMsg(`Promoted ${data.partner_id} · prefix ${data.key_prefix}`);
    await refresh();
  }

  function promptPromote(app: Application) {
    const partnerId = partnerIds[app.id] || slugifyPartnerId(app.company);
    requestConfirm({
      actionKey: "design_partner.promote",
      context: {
        partnerId,
        company: app.company,
      },
      onConfirmed: () => executePromote(app, false),
    });
  }

  if (gate.loading) {
    return (
      <RedesignPage maxWidth={720}>
        <PageHeader eyebrow="Admin" title="Design partner queue" subtitle="Review applications and issue sandbox keys." />
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)" }}>Checking admin session…</p>
      </RedesignPage>
    );
  }

  if (!gate.authorized) {
    return (
      <RedesignPage maxWidth={720}>
        <PageHeader eyebrow="Admin" title="Design partner queue" subtitle="Review applications and issue sandbox keys." />
        {gate.usePinUnlock ? (
          <ContentCard title="Admin PIN">
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                type="password"
                value={gate.pin}
                onChange={(event) => gate.setPin(event.target.value)}
                placeholder="Admin PIN"
                style={inputStyle}
              />
              <button type="button" onClick={gate.unlockWithPin} style={btnStyle}>Unlock</button>
            </div>
          </ContentCard>
        ) : (
          <ContentCard title="Admin access">
            <p role="alert" style={{ fontFamily: FONT, fontSize: "0.82rem", color: "#FCA5A5", margin: 0, lineHeight: 1.6 }}>
              {gate.unauthorizedMessage}
            </p>
          </ContentCard>
        )}
      </RedesignPage>
    );
  }

  const pending = apps.filter(a => a.status === "submitted" || a.status === "approved");

  return (
    <RedesignPage maxWidth={960}>
      <PageHeader
        eyebrow="Admin · Relying parties"
        title="Design partner applications"
        subtitle={`${pending.length} pending · promote creates org + issues API key`}
      />

      <ProductionAdminSessionStatus
        gate={gate}
        style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--accent)", marginBottom: "0.75rem" }}
      />

      {msg && <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--accent)", marginBottom: "0.75rem" }}>{msg}</p>}
      {newKey && (
        <div style={{
          padding: "0.85rem", borderRadius: 12, marginBottom: "0.75rem",
          background: "rgba(232,197,71,0.08)", border: "1px solid rgba(232,197,71,0.35)",
          fontFamily: MONO, fontSize: "0.62rem", wordBreak: "break-all",
        }}>
          New API key (copy now): {newKey}
        </div>
      )}

      <ContentCard title="Application queue">
        {apps.length === 0 ? (
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>No applications yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {apps.map(app => (
              <div key={app.id} style={{
                padding: "0.85rem", borderRadius: 12, border: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 800 }}>{app.company}</div>
                    <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      {app.contact_name ?? ", "} · {app.email} · {app.integration_type}
                    </div>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--accent)" }}>{app.status}</span>
                </div>
                {app.use_case && (
                  <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0.5rem 0" }}>
                    {app.use_case}
                  </p>
                )}
                {app.promoted_partner_id && (
                  <p style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", margin: "0.35rem 0" }}>
                    Partner ID: {app.promoted_partner_id}
                  </p>
                )}
                {!app.promoted_partner_id && (
                  <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginTop: "0.55rem", alignItems: "center" }}>
                    <input
                      value={partnerIds[app.id] ?? slugifyPartnerId(app.company)}
                      onChange={e => setPartnerIds(prev => ({ ...prev, [app.id]: e.target.value }))}
                      placeholder="partner_id"
                      style={{ ...inputStyle, flex: "1 1 160px", fontSize: "0.72rem" }}
                    />
                    <button type="button" onClick={() => void updateStatus(app.id, "approved")} style={smallBtn}>
                      Approve
                    </button>
                    <button type="button" onClick={() => promptPromote(app)} disabled={confirmDialogProps.busy} style={smallBtn}>
                      Promote + test key
                    </button>
                    <button type="button" onClick={() => void updateStatus(app.id, "rejected")} style={{ ...smallBtn, background: "transparent", border: "1px solid var(--border)" }}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ContentCard>

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
        After sandbox pilot: promote to production at{" "}
        <Link href="/admin/partners" style={{ color: "var(--accent)" }}>/admin/partners</Link>
        {" "}(set allowed_environments + issue abx_live_ key).{" "}
        <Link href="/admin/inquiries" style={{ color: "var(--accent)" }}>Asset inquiries →</Link>
      </p>
      <AdminConfirmDialog {...confirmDialogProps} />
    </RedesignPage>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.55rem 0.7rem",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-inset)",
  color: "var(--text-primary)",
  fontFamily: FONT,
};

const btnStyle: React.CSSProperties = {
  padding: "0.55rem 1rem",
  borderRadius: 10,
  border: "none",
  background: "var(--accent)",
  color: "#1a1408",
  fontFamily: FONT,
  fontWeight: 700,
  cursor: "pointer",
};

const smallBtn: React.CSSProperties = {
  ...btnStyle,
  padding: "0.4rem 0.7rem",
  fontSize: "0.68rem",
};
