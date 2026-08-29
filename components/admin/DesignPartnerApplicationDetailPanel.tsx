"use client";
// FILE: components/admin/DesignPartnerApplicationDetailPanel.tsx
// Read-only application detail body and UI-only manual review checklist.

import { useState } from "react";
import type { DesignPartnerApplicationAdminDto } from "@/lib/admin/designPartnerApplicationDetailContract";
import {
  DESIGN_PARTNER_REVIEW_CHECKLIST_ITEMS,
  DESIGN_PARTNER_REVIEW_CHECKLIST_LABELS,
  type DesignPartnerReviewChecklistItemId,
} from "@/lib/admin/designPartnerApplicationDetailContract";
import {
  classifyDesignPartnerWebsiteDisplay,
  DESIGN_PARTNER_WEBSITE_SAFE_LINK_LABEL,
} from "@/lib/admin/designPartnerApplicationWebsiteDisplay";
import { DesignPartnerLifecycleAuditTimeline } from "@/components/admin/DesignPartnerLifecycleAuditTimeline";
import { DesignPartnerPromoteReadinessPanel } from "@/components/admin/DesignPartnerPromoteReadinessPanel";
import type { PartnerIdPromoteEvaluation } from "@/lib/admin/designPartnerPromoteReadiness";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

function formatTimestamp(value: string | null): string {
  if (!value) return "Not reviewed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not reviewed";
  return date.toLocaleString();
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: "0.2rem" }}>
      <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)" }}>
        {label}
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.55, wordBreak: "break-word" }}>
        {children}
      </div>
    </div>
  );
}

function WebsiteValue({ website }: { website: string | null }) {
  const display = classifyDesignPartnerWebsiteDisplay(website);
  if (display.mode === "missing") {
    return <span>—</span>;
  }
  if (display.mode === "safe_link" && display.href) {
    return (
      <a
        href={display.href}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="design-partner-website-safe-link"
        style={{ color: "var(--accent)", fontWeight: 600 }}
      >
        {DESIGN_PARTNER_WEBSITE_SAFE_LINK_LABEL}
      </a>
    );
  }
  return (
    <div>
      <div data-testid="design-partner-website-inert">{display.displayText}</div>
      {display.warning && (
        <p
          data-testid="design-partner-website-warning"
          style={{ fontFamily: FONT, fontSize: "0.68rem", color: "#F59E0B", margin: "0.35rem 0 0", lineHeight: 1.5 }}
        >
          {display.warning}
        </p>
      )}
    </div>
  );
}

export function DesignPartnerApplicationDetailPanel({
  application,
  showChecklist = true,
  regionId,
  labelledBy,
  timelineRefreshToken,
  partnerIdEvaluation,
}: {
  application: DesignPartnerApplicationAdminDto;
  showChecklist?: boolean;
  regionId: string;
  labelledBy: string;
  timelineRefreshToken?: number;
  partnerIdEvaluation?: PartnerIdPromoteEvaluation;
}) {
  const [checklist, setChecklist] = useState<Record<DesignPartnerReviewChecklistItemId, boolean>>(() => (
    Object.fromEntries(
      DESIGN_PARTNER_REVIEW_CHECKLIST_ITEMS.map((item) => [item, false]),
    ) as Record<DesignPartnerReviewChecklistItemId, boolean>
  ));

  function toggleChecklistItem(item: DesignPartnerReviewChecklistItemId) {
    setChecklist((prev) => ({ ...prev, [item]: !prev[item] }));
  }

  return (
    <section
      id={regionId}
      role="region"
      aria-labelledby={labelledBy}
      data-testid={`design-partner-detail-panel-${application.id}`}
      style={{
        marginTop: "0.55rem",
        padding: "0.75rem",
        borderRadius: 10,
        border: "1px solid var(--border)",
        display: "grid",
        gap: "0.65rem",
      }}
    >
      <DetailRow label="Company">{application.company}</DetailRow>
      <DetailRow label="Contact name">{application.contact_name ?? "—"}</DetailRow>
      <DetailRow label="Work email">
        <span data-testid="design-partner-detail-email">{application.email}</span>
      </DetailRow>
      <DetailRow label="Website">
        <WebsiteValue website={application.website} />
      </DetailRow>
      <DetailRow label="Integration type">{application.integration_type}</DetailRow>
      <DetailRow label="Use case">{application.use_case ?? "—"}</DetailRow>
      <DetailRow label="Expected monthly volume">{application.monthly_volume ?? "—"}</DetailRow>
      <DetailRow label="Public-naming consent">
        {application.public_name_ok ? "Yes" : "No"}
      </DetailRow>
      <DetailRow label="Submitted">{formatTimestamp(application.created_at)}</DetailRow>
      <DetailRow label="Reviewed">{formatTimestamp(application.reviewed_at)}</DetailRow>
      <DetailRow label="Lifecycle status">
        <span style={{ fontFamily: MONO, fontSize: "0.68rem" }}>{application.status}</span>
      </DetailRow>

      {application.status === "approved"
        && !application.promoted_partner_id
        && partnerIdEvaluation && (
        <DesignPartnerPromoteReadinessPanel partnerIdEvaluation={partnerIdEvaluation} />
      )}

      <DesignPartnerLifecycleAuditTimeline
        applicationId={application.id}
        refreshToken={timelineRefreshToken}
      />

      {showChecklist && (
        <div style={{ marginTop: "0.25rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, marginBottom: "0.45rem" }}>
            Manual review checklist (session only)
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.45rem" }}>
            {DESIGN_PARTNER_REVIEW_CHECKLIST_ITEMS.map((item) => (
              <li key={item}>
                <label style={{ fontFamily: FONT, fontSize: "0.72rem", display: "flex", gap: "0.45rem", alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={checklist[item]}
                    onChange={() => toggleChecklistItem(item)}
                    data-testid={`design-partner-checklist-${application.id}-${item}`}
                  />
                  <span>{DESIGN_PARTNER_REVIEW_CHECKLIST_LABELS[item]}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
