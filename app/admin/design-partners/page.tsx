"use client";
// FILE: app/admin/design-partners/page.tsx
// Review design partner applications and promote to relying party orgs.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { PartnerSandboxSignoffPanel } from "@/components/admin/PartnerSandboxSignoffPanel";
import { DesignPartnerPilotSummaryBar } from "@/components/admin/DesignPartnerPilotSummaryBar";
import { DesignPartnerIntakeHealthCard } from "@/components/admin/DesignPartnerIntakeHealthCard";
import { DesignPartnerApplicationDetailPanel } from "@/components/admin/DesignPartnerApplicationDetailPanel";
import { useAdminConfirm } from "@/lib/admin/useAdminConfirm";
import type { DesignPartnerPilotSummaryDto } from "@/lib/admin/designPartnerPilotSummary";
import {
  parseDesignPartnerApplicationPageResponse,
  type DesignPartnerApplicationAdminDto,
} from "@/lib/admin/designPartnerApplicationDetailContract";
import {
  DESIGN_PARTNER_QUEUE_STATUS_FILTERS,
  type DesignPartnerQueueStatusFilter,
} from "@/lib/admin/designPartnerApplicationQueueCursor";
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
const WARN = "#F59E0B";
const REJECT = "#FCA5A5";
const APPLICATION_DETAIL_DISCLOSURE_LABEL = "View application details";
const APPLICATION_DETAIL_HIDE_LABEL = "Hide application details";
const QUEUE_PAGE_LIMIT = 25;

const STATUS_TAB_LABELS: Record<DesignPartnerQueueStatusFilter, string> = {
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  onboarded: "Onboarded",
  all: "All",
};

interface Application extends DesignPartnerApplicationAdminDto {}

function dedupeApplicationsById(
  existing: Application[],
  incoming: Application[],
): Application[] {
  const seen = new Set(existing.map((app) => app.id));
  const merged = [...existing];
  for (const app of incoming) {
    if (!seen.has(app.id)) {
      seen.add(app.id);
      merged.push(app);
    }
  }
  return merged;
}

function cardModeForApp(
  app: Application,
  statusFilter: DesignPartnerQueueStatusFilter,
): "pending" | "rejected" | "onboarded" {
  if (statusFilter === "rejected") return "rejected";
  if (statusFilter === "onboarded") return "onboarded";
  if (statusFilter === "submitted" || statusFilter === "approved") return "pending";
  if (app.promoted_partner_id) return "onboarded";
  if (app.status === "rejected") return "rejected";
  return "pending";
}

function showChecklistForApp(
  app: Application,
  statusFilter: DesignPartnerQueueStatusFilter,
): boolean {
  if (statusFilter === "submitted" || statusFilter === "approved") return true;
  if (statusFilter === "all") {
    return (app.status === "submitted" || app.status === "approved") && !app.promoted_partner_id;
  }
  return false;
}

function ApplicationMeta({ app }: { app: Application }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
      {[app.contact_name, app.integration_type].filter(Boolean).join(" · ")}
    </div>
  );
}

export default function AdminDesignPartnersPage() {
  const gate = useProductionAdminSessionGate();
  const [apps, setApps] = useState<Application[]>([]);
  const [msg, setMsg] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [promotedPartnerId, setPromotedPartnerId] = useState<string | null>(null);
  const [handoffPolicyId, setHandoffPolicyId] = useState("");
  const [handoffReturnUrl, setHandoffReturnUrl] = useState("");
  const [partnerIds, setPartnerIds] = useState<Record<string, string>>({});
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});
  const [busyAppId, setBusyAppId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DesignPartnerQueueStatusFilter>("submitted");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detailOpenByAppId, setDetailOpenByAppId] = useState<Record<string, boolean>>({});
  const [pilotSummaries, setPilotSummaries] = useState<Record<string, DesignPartnerPilotSummaryDto>>({});
  const { requestConfirm, confirmDialogProps } = useAdminConfirm();

  const refreshPilotSummaries = useCallback(async () => {
    const res = await gate.adminRequest("/api/admin/design-partners/pilot-summary", { cache: "no-store" });
    if (res.status === 401 && !gate.usePinUnlock) {
      return;
    }
    if (!res.ok) return;
    const data = await res.json() as { summaries?: DesignPartnerPilotSummaryDto[] };
    const next: Record<string, DesignPartnerPilotSummaryDto> = {};
    for (const summary of data.summaries ?? []) {
      next[summary.application_id] = summary;
    }
    setPilotSummaries(next);
  }, [gate.adminRequest, gate.usePinUnlock]);

  const fetchApplications = useCallback(async (options?: {
    cursor?: string | null;
    append?: boolean;
    status?: DesignPartnerQueueStatusFilter;
  }) => {
    const activeStatus = options?.status ?? statusFilter;
    const params = new URLSearchParams({
      status: activeStatus,
      limit: String(QUEUE_PAGE_LIMIT),
    });
    if (options?.cursor) {
      params.set("cursor", options.cursor);
    }

    const res = await gate.adminRequest(`/api/admin/design-partners?${params.toString()}`, {
      cache: "no-store",
    });
    if (res.status === 401 && !gate.usePinUnlock) {
      setMsg(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE);
      return false;
    }
    if (!res.ok) return false;

    const data = await res.json();
    const parsed = parseDesignPartnerApplicationPageResponse(data);
    setApps((prev) => (
      options?.append ? dedupeApplicationsById(prev, parsed.applications) : parsed.applications
    ));
    setNextCursor(parsed.next_cursor);
    setHasMore(parsed.has_more);
    setReviewerNotes((prev) => {
      const merged = { ...prev };
      for (const app of parsed.applications) {
        if (merged[app.id] === undefined) {
          merged[app.id] = app.reviewer_notes ?? "";
        }
      }
      return merged;
    });
    return true;
  }, [gate.adminRequest, gate.usePinUnlock, statusFilter]);

  const loadFirstPage = useCallback(async (status: DesignPartnerQueueStatusFilter = statusFilter) => {
    setQueueLoading(true);
    setMsg("");
    try {
      return await fetchApplications({ status, append: false });
    } finally {
      setQueueLoading(false);
    }
  }, [fetchApplications, statusFilter]);

  const refresh = useCallback(async () => {
    const loaded = await loadFirstPage(statusFilter);
    if (!loaded) return;
    await refreshPilotSummaries();
  }, [loadFirstPage, refreshPilotSummaries, statusFilter]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMore || queueLoading) return;
    setLoadingMore(true);
    try {
      await fetchApplications({ cursor: nextCursor, append: true });
    } finally {
      setLoadingMore(false);
    }
  }, [fetchApplications, hasMore, loadingMore, nextCursor, queueLoading]);

  useEffect(() => {
    if (!gate.authorized || gate.loading) return;
    setApps([]);
    setNextCursor(null);
    setHasMore(false);
    setDetailOpenByAppId({});
    setQueueLoading(true);
    void (async () => {
      try {
        const loaded = await fetchApplications({ status: statusFilter, append: false });
        if (loaded) {
          await refreshPilotSummaries();
        }
      } finally {
        setQueueLoading(false);
      }
    })();
  }, [gate.authorized, gate.loading, statusFilter, fetchApplications, refreshPilotSummaries]);

  async function patchApplication(
    app: Application,
    status: string,
    options?: { includeNotes?: boolean },
  ) {
    setBusyAppId(app.id);
    setMsg("");
    try {
      const payload: Record<string, string> = { id: app.id, status };
      if (options?.includeNotes) {
        payload.reviewer_notes = reviewerNotes[app.id] ?? "";
      }
      const res = await gate.adminRequest("/api/admin/design-partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401 && !gate.usePinUnlock) {
        setMsg(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setMsg(data.error ?? "Status update failed");
        return;
      }
      await refresh();
    } finally {
      setBusyAppId(null);
    }
  }

  async function executePromote(app: Application) {
    setBusyAppId(app.id);
    setMsg("");
    setNewKey(null);
    setPromotedPartnerId(null);
    setHandoffPolicyId("");
    setHandoffReturnUrl("");
    const partnerId = partnerIds[app.id] || slugifyPartnerId(app.company);
    try {
      const res = await gate.adminRequest("/api/admin/design-partners/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: app.id,
          partner_id: partnerId,
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
      setPromotedPartnerId(data.partner_id ?? null);
      setMsg(`Promoted ${data.partner_id} · prefix ${data.key_prefix}`);
      await refresh();
    } finally {
      setBusyAppId(null);
    }
  }

  function promptPromote(app: Application) {
    const partnerId = partnerIds[app.id] || slugifyPartnerId(app.company);
    requestConfirm({
      actionKey: "design_partner.promote",
      context: {
        partnerId,
        company: app.company,
      },
      onConfirmed: () => executePromote(app),
    });
  }

  function promptReject(app: Application) {
    requestConfirm({
      actionKey: "design_partner.reject",
      context: { company: app.company },
      onConfirmed: () => patchApplication(app, "rejected", { includeNotes: true }),
    });
  }

  function toggleApplicationDetail(appId: string) {
    setDetailOpenByAppId((prev) => ({ ...prev, [appId]: !prev[appId] }));
  }

  function renderApplicationCard(
    app: Application,
    mode: "pending" | "rejected" | "onboarded",
    showChecklist: boolean,
  ) {
    const busy = busyAppId === app.id || confirmDialogProps.busy;
    const detailOpen = Boolean(detailOpenByAppId[app.id]);
    const detailToggleId = `design-partner-detail-toggle-${app.id}`;
    const detailRegionId = `design-partner-detail-panel-${app.id}`;
    return (
      <div
        key={app.id}
        data-testid={`design-partner-app-${app.id}`}
        style={{
          padding: "0.85rem", borderRadius: 12, border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 800 }}>{app.company}</div>
            <ApplicationMeta app={app} />
          </div>
          <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--accent)" }}>{app.status}</span>
        </div>
        {app.use_case && (
          <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0.5rem 0 0", lineHeight: 1.55 }}>
            {app.use_case}
          </p>
        )}
        <button
          type="button"
          id={detailToggleId}
          aria-expanded={detailOpen}
          aria-controls={detailRegionId}
          data-testid={detailToggleId}
          onClick={() => toggleApplicationDetail(app.id)}
          style={detailDisclosureBtn}
        >
          {detailOpen ? APPLICATION_DETAIL_HIDE_LABEL : APPLICATION_DETAIL_DISCLOSURE_LABEL}
        </button>
        {detailOpen && (
          <DesignPartnerApplicationDetailPanel
            application={app}
            showChecklist={showChecklist}
            regionId={detailRegionId}
            labelledBy={detailToggleId}
          />
        )}
        {app.reviewer_notes && mode === "rejected" && (
          <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)", margin: "0.35rem 0", lineHeight: 1.5 }}>
            Reviewer notes: {app.reviewer_notes}
          </p>
        )}
        {mode === "onboarded" && app.promoted_partner_id && (
          <>
            <p style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", margin: "0.35rem 0" }}>
              Partner ID: {app.promoted_partner_id}
            </p>
            {pilotSummaries[app.id] && (
              <div style={{ marginTop: "0.65rem" }}>
                <DesignPartnerPilotSummaryBar summary={pilotSummaries[app.id]} />
              </div>
            )}
            <div
              id={`pilot-signoff-${app.promoted_partner_id}`}
              style={{ marginTop: "0.65rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border)" }}
            >
              <PartnerSandboxSignoffPanel
                partnerId={app.promoted_partner_id}
                applicationId={app.id}
                adminRequest={gate.adminRequest}
                usePinUnlock={gate.usePinUnlock}
                onUnauthorized={() => setMsg(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE)}
              />
            </div>
          </>
        )}
        {mode === "pending" && !app.promoted_partner_id && (
          <>
            <label style={{ fontFamily: FONT, fontSize: "0.7rem", display: "block", marginTop: "0.55rem" }}>
              <span style={{ display: "block", fontWeight: 700, marginBottom: "0.25rem" }}>
                Reviewer notes (optional)
              </span>
              <textarea
                value={reviewerNotes[app.id] ?? ""}
                onChange={(e) => setReviewerNotes((prev) => ({ ...prev, [app.id]: e.target.value }))}
                data-testid={`reviewer-notes-${app.id}`}
                rows={2}
                style={{
                  ...inputStyle,
                  width: "100%",
                  resize: "vertical",
                  minHeight: 56,
                  fontSize: "0.72rem",
                }}
              />
            </label>
            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginTop: "0.55rem", alignItems: "center" }}>
              <input
                value={partnerIds[app.id] ?? slugifyPartnerId(app.company)}
                onChange={e => setPartnerIds(prev => ({ ...prev, [app.id]: e.target.value }))}
                placeholder="partner_id"
                style={{ ...inputStyle, flex: "1 1 160px", fontSize: "0.72rem" }}
              />
              {app.status === "submitted" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void patchApplication(app, "approved")}
                  style={smallBtn}
                >
                  Approve
                </button>
              )}
              {app.status === "approved" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => promptPromote(app)}
                  data-testid={`promote-${app.id}`}
                  style={smallBtn}
                >
                  Promote + test key
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => promptReject(app)}
                data-testid={`reject-${app.id}`}
                aria-label="Reject application"
                style={rejectBtn}
              >
                Reject
              </button>
            </div>
            {app.status === "submitted" && (
              <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.45rem 0 0", lineHeight: 1.5 }}>
                Approve before promoting. Promotion issues a sandbox abx_test_ key only — Production activation is separate.
              </p>
            )}
          </>
        )}
        {mode === "rejected" && (
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.45rem 0 0", lineHeight: 1.5 }}>
            Rejected applications are retained for audit. Promotion is not available.
          </p>
        )}
      </div>
    );
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

  const queueSummary = hasMore
    ? `Showing ${apps.length} applications · more available`
    : `Showing ${apps.length} application${apps.length === 1 ? "" : "s"}`;

  return (
    <RedesignPage maxWidth={960}>
      <PageHeader
        eyebrow="Admin · Relying parties"
        title="Design partner applications"
        subtitle={queueSummary}
      />

      <ProductionAdminSessionStatus
        gate={gate}
        style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--accent)", marginBottom: "0.75rem" }}
      />

      <DesignPartnerIntakeHealthCard
        authorized={gate.authorized}
        loading={gate.loading}
        adminRequest={gate.adminRequest}
      />

      {msg && <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--accent)", marginBottom: "0.75rem" }}>{msg}</p>}
      {newKey && (
        <div style={{
          padding: "0.85rem", borderRadius: 12, marginBottom: "0.75rem",
          background: "rgba(232,197,71,0.08)", border: "1px solid rgba(232,197,71,0.35)",
          fontFamily: MONO, fontSize: "0.62rem", wordBreak: "break-all",
        }}>
          New sandbox API key (copy now): {newKey}
        </div>
      )}

      {promotedPartnerId && (
        <ContentCard title="Sandbox handoff — operator assistance">
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.65rem" }}>
            Share these values with the design partner. Default key scopes are verify:credential and verify:registry only.
            Webhook testing requires a separate key with webhooks:read from{" "}
            <Link href="/admin/partners" style={{ color: "var(--accent)", fontWeight: 600 }}>/admin/partners</Link>.
          </p>
          <div style={{ display: "grid", gap: "0.5rem", marginBottom: "0.65rem" }}>
            <label style={{ fontFamily: FONT, fontSize: "0.72rem" }}>
              <span style={{ display: "block", fontWeight: 700, marginBottom: "0.25rem" }}>partner_id</span>
              <input
                readOnly
                value={promotedPartnerId}
                data-testid="handoff-partner-id"
                style={{ ...inputStyle, width: "100%", fontFamily: MONO, fontSize: "0.68rem" }}
              />
            </label>
            <label style={{ fontFamily: FONT, fontSize: "0.72rem" }}>
              <span style={{ display: "block", fontWeight: 700, marginBottom: "0.25rem" }}>policy_id (ops supplies)</span>
              <input
                value={handoffPolicyId}
                onChange={(e) => setHandoffPolicyId(e.target.value)}
                placeholder="sandbox-policy-v1"
                data-testid="handoff-policy-id"
                style={{ ...inputStyle, width: "100%", fontFamily: MONO, fontSize: "0.68rem" }}
              />
            </label>
            <label style={{ fontFamily: FONT, fontSize: "0.72rem" }}>
              <span style={{ display: "block", fontWeight: 700, marginBottom: "0.25rem" }}>return_url (ops allowlists)</span>
              <input
                value={handoffReturnUrl}
                onChange={(e) => setHandoffReturnUrl(e.target.value)}
                placeholder="https://partner.example.com/auth/abraxas/callback"
                data-testid="handoff-return-url"
                style={{ ...inputStyle, width: "100%", fontFamily: MONO, fontSize: "0.68rem" }}
              />
            </label>
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)", margin: "0 0 0.5rem", lineHeight: 1.55 }}>
            Partner portal: <Link href="/developers/partner" style={{ color: "var(--accent)" }}>/developers/partner</Link>
            {" · "}
            Docs: <Link href="/docs/partner-flow#external-design-partner-sandbox" style={{ color: "var(--accent)" }}>External design partner sandbox</Link>
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)", margin: "0 0 0.5rem", lineHeight: 1.55 }}>
            Runbooks:{" "}
            <code style={{ fontFamily: MONO, fontSize: "0.62rem" }}>docs/EXTERNAL_DESIGN_PARTNER_PILOT.md</code>
            {" · "}
            <a
              href="https://github.com/worldlabsprotocol-ux/abraxas-app/blob/main/docs/PARTNER_ONBOARDING_CHECKLIST.md"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)" }}
            >
              Operator onboarding checklist
            </a>
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: WARN, margin: 0, fontWeight: 600 }}>
            These handoff fields are session-only operator notes — not persisted in browser storage.
          </p>
        </ContentCard>
      )}

      <ContentCard title="Application queue">
        <div
          role="tablist"
          aria-label="Application status filter"
          style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.75rem" }}
        >
          {DESIGN_PARTNER_QUEUE_STATUS_FILTERS.map((status) => {
            const selected = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={selected}
                data-testid={`design-partner-status-tab-${status}`}
                onClick={() => setStatusFilter(status)}
                style={{
                  ...smallBtn,
                  minHeight: 44,
                  background: selected ? "var(--accent)" : "transparent",
                  color: selected ? "#1a1408" : "var(--text-primary)",
                  border: "1px solid var(--border-strong)",
                }}
              >
                {STATUS_TAB_LABELS[status]}
              </button>
            );
          })}
        </div>

        <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0 0 0.75rem", lineHeight: 1.55 }}>
          New applications appear after refreshing the current status or switching away and back.
          Load more continues strictly below the captured cursor.
        </p>

        {queueLoading ? (
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
            Loading applications…
          </p>
        ) : apps.length === 0 ? (
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
            No applications in this status.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {apps.map((app) => renderApplicationCard(
              app,
              cardModeForApp(app, statusFilter),
              showChecklistForApp(app, statusFilter),
            ))}
          </div>
        )}

        {hasMore && (
          <button
            type="button"
            data-testid="design-partner-load-more"
            disabled={loadingMore || queueLoading}
            onClick={() => void loadMore()}
            style={{
              ...detailDisclosureBtn,
              marginTop: "0.75rem",
              textAlign: "center",
            }}
          >
            {loadingMore ? "Loading more…" : "Load more applications"}
          </button>
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

const rejectBtn: React.CSSProperties = {
  ...smallBtn,
  background: "transparent",
  color: REJECT,
  border: "1px solid rgba(239,68,68,0.4)",
};

const detailDisclosureBtn: React.CSSProperties = {
  ...inputStyle,
  width: "100%",
  textAlign: "left",
  minHeight: 44,
  marginTop: "0.55rem",
  fontWeight: 600,
  fontSize: "0.72rem",
  cursor: "pointer",
};
