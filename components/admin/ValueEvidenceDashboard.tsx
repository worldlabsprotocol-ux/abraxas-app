"use client";
// FILE: components/admin/ValueEvidenceDashboard.tsx
// Operator value evidence — executive interface with JSON as advanced option.

import { useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  MetricWithProvenance,
  PermissionStatusList,
  PilotCriteriaList,
  EvidenceTimeline,
} from "@/components/product";
import { AbxEmptyState } from "@/components/design/AbxPrimitives";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

type Scope = "application" | "portfolio";

interface PortfolioPayload {
  portfolio?: {
    applications: Array<Record<string, unknown>>;
    conversion?: { counts?: Record<string, number> };
    gtm_funnel?: Record<string, number>;
    fundraising_matrix?: Array<{ category: string; status: string; evidence: string[]; missing: string[] }>;
    capital_discipline_view?: Record<string, number>;
    network_reuse?: Record<string, unknown>;
    product_discipline?: { groups?: Record<string, unknown[]> };
  };
  design_partner?: {
    empty_state?: boolean;
    active_pilots?: number;
    funnel?: { counts?: Record<string, number> };
    applications?: Array<Record<string, unknown>>;
    fundraising_slide_readiness?: Record<string, unknown>;
  };
  policy_adoption?: {
    canonical_policies_available: number;
    production_eligible_policies: number;
    actively_consumed_policies: number;
    applications_with_multiple_policies: number;
    production_applications_with_multiple_policies: number;
    partners_with_multiple_configured_policies: number;
    partners_with_multiple_production_policies: number;
    policy_expansion_observed: boolean;
    evidence_reuse_observed: boolean;
    aggregates: Array<Record<string, unknown>>;
    notice: string;
  };
  evidence?: Record<string, unknown>;
}

export function ValueEvidenceDashboard() {
  const [scope, setScope] = useState<Scope>("portfolio");
  const [applicationId, setApplicationId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [payload, setPayload] = useState<PortfolioPayload | null>(null);
  const [error, setError] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function loadEvidence() {
    setError("");
    setLoading(true);
    setPayload(null);
    const params = new URLSearchParams({ scope });
    if (scope === "application") {
      if (!applicationId.trim()) {
        setError("Application ID required for application scope");
        setLoading(false);
        return;
      }
      params.set("application_id", applicationId.trim());
    } else if (partnerId.trim()) {
      params.set("partner_id", partnerId.trim());
    }
    try {
      const res = await fetch(`/api/admin/value-evidence?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(String(data.error ?? "Failed to load"));
        return;
      }
      setPayload(data as PortfolioPayload);
    } finally {
      setLoading(false);
    }
  }

  const portfolio = payload?.portfolio;
  const designPartner = payload?.design_partner;
  const counts = portfolio?.conversion?.counts ?? designPartner?.funnel?.counts ?? {};
  const capital = portfolio?.capital_discipline_view ?? {};

  return (
    <>
      <ContentCard title="Portfolio operating view">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 0 }}>
          Internal business proof — measured, derived, and operator-asserted evidence separated. No vanity percentages when sample size is small.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem", alignItems: "center" }}>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as Scope)}
            style={{ fontFamily: FONT, fontSize: "0.78rem", padding: "0.35rem 0.5rem" }}
          >
            <option value="portfolio">Portfolio</option>
            <option value="application">Application</option>
          </select>
          {scope === "application" ? (
            <input
              type="text"
              placeholder="Application UUID"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              style={{ fontFamily: MONO, fontSize: "0.78rem", padding: "0.35rem 0.5rem", minWidth: 280 }}
            />
          ) : (
            <input
              type="text"
              placeholder="Partner ID filter (optional)"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              style={{ fontFamily: MONO, fontSize: "0.78rem", padding: "0.35rem 0.5rem", minWidth: 220 }}
            />
          )}
          <Btn size="sm" onClick={() => void loadEvidence()} disabled={loading}>
            {loading ? "Loading…" : "Load evidence"}
          </Btn>
          {payload && (
            <Btn size="sm" variant="ghost" onClick={() => setShowRaw((v) => !v)}>
              {showRaw ? "Hide raw JSON" : "Show raw JSON"}
            </Btn>
          )}
        </div>
        {error && <p style={{ fontFamily: FONT, color: "#ef4444", marginTop: "0.65rem" }} role="alert">{error}</p>}
      </ContentCard>

      {payload && scope === "portfolio" && (
        <>
          {designPartner?.empty_state ? (
            <AbxEmptyState
              title="No design partners enrolled"
              message="Portfolio counts remain zero until partners are enrolled and measured activity exists. Empty is honest — no fabricated traction."
              tone="neutral"
            />
          ) : (
            <>
              <ContentCard title="Portfolio">
                <div style={{ display: "grid", gap: "0.65rem", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                  <MetricWithProvenance label="Design partners" value={counts.design_partners ?? counts.accepted_design_partners ?? null} provenance="measured" />
                  <MetricWithProvenance label="Production active" value={counts.production_active ?? null} provenance="measured" />
                  <MetricWithProvenance label="Pilots live" value={designPartner?.active_pilots ?? counts.pilot_live ?? null} provenance="measured" />
                  <MetricWithProvenance label="Converted" value={counts.converted ?? null} provenance="measured" />
                  <MetricWithProvenance label="Case studies ready" value={capital.case_study_ready_pilots ?? null} provenance="derived" />
                  <MetricWithProvenance label="Policies in production use" value={capital.policies_actively_consumed ?? null} provenance="measured" />
                </div>
              </ContentCard>

              <ContentCard title="Design partner funnel">
                <FunnelCounts counts={designPartner?.funnel?.counts ?? portfolio?.gtm_funnel ?? {}} />
              </ContentCard>

              {payload.policy_adoption && (
                <ContentCard title="Policy adoption / expansion">
                  <PolicyAdoptionPanel adoption={payload.policy_adoption} />
                </ContentCard>
              )}

              {portfolio?.fundraising_matrix && (
                <ContentCard title="Fundraising evidence">
                  <FundraisingMatrix rows={portfolio.fundraising_matrix} />
                </ContentCard>
              )}

              {designPartner?.applications && designPartner.applications.length > 0 && (
                <ContentCard title="Design partners">
                  {designPartner.applications.map((app) => (
                    <DesignPartnerWorkspace key={String((app as { value_evidence?: { application_id?: string } }).value_evidence?.application_id ?? Math.random())} view={app} />
                  ))}
                </ContentCard>
              )}
            </>
          )}
        </>
      )}

      {payload && scope === "application" && payload.evidence && (
        <ApplicationEvidenceView evidence={payload.evidence} designPartner={payload.design_partner} />
      )}

      {payload && showRaw && (
        <ContentCard title="Raw evidence (debug)">
          <pre style={{ fontFamily: MONO, fontSize: "0.65rem", overflow: "auto", maxHeight: 640, margin: 0 }}>
            {JSON.stringify(payload, null, 2)}
          </pre>
        </ContentCard>
      )}
    </>
  );
}

function FunnelCounts({ counts }: { counts: Record<string, number> }) {
  const stages = [
    ["Accepted", counts.accepted_design_partners],
    ["Integrated", counts.integration_started],
    ["Verified", counts.first_successful_verification],
    ["Pilot complete", counts.pilot_complete],
    ["Production", counts.production_active],
    ["Converted", counts.converted],
  ].filter(([, v]) => v != null);

  if (stages.length === 0) {
    return <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", margin: 0 }}>Funnel counts unavailable until partners progress.</p>;
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
      {stages.map(([label, count], i) => (
        <div key={String(label)} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: FONT, fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>{count}</p>
            <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0 }}>{label}</p>
          </div>
          {i < stages.length - 1 && <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>↓</span>}
        </div>
      ))}
    </div>
  );
}

function FundraisingMatrix({ rows }: { rows: Array<{ category: string; status: string; evidence: string[]; missing: string[] }> }) {
  return (
    <div style={{ display: "grid", gap: "0.55rem" }}>
      {rows.map((row) => (
        <details key={row.category} style={{ borderRadius: 10, border: "1px solid var(--border)", padding: "0.55rem 0.65rem" }}>
          <summary style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", color: "var(--text-primary)" }}>
            {row.category} — {row.status.replace(/_/g, " ")}
          </summary>
          {row.evidence.length > 0 && (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0.45rem 0 0" }}>
              Evidence: {row.evidence.join("; ")}
            </p>
          )}
          {row.missing.length > 0 && (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
              Missing: {row.missing.join("; ")}
            </p>
          )}
        </details>
      ))}
    </div>
  );
}

function DesignPartnerWorkspace({ view }: { view: Record<string, unknown> }) {
  const program = view.program as Record<string, unknown> | null;
  const scorecard = view.scorecard as { criteria?: Array<{ criterion_type: string; status: string; measured_value?: unknown; quality?: string }>; next_action?: string } | null;
  const valueEvidence = view.value_evidence as Record<string, unknown> | undefined;
  const permissions = view.case_study_permissions as Record<string, unknown> | null;
  const artifact = view.case_study_artifact as Record<string, unknown> | null;

  if (!program) return null;

  const permissionRows = permissions
    ? [
        { label: "Company name permission", status: String(permissions.company_name_permission ?? "missing") },
        { label: "Logo permission", status: String(permissions.logo_permission ?? "missing") },
        { label: "Quote", status: permissions.quote_text ? "ready" : "missing" },
        { label: "Metrics permission", status: String(permissions.metrics_permission ?? "missing") },
        { label: "Public case study", status: String(permissions.public_case_study_permission ?? "pending") },
      ]
    : [];

  const timelineEvents = buildTimelineFromView(view);

  return (
    <div style={{ marginBottom: "1.25rem", paddingBottom: "1.25rem", borderBottom: "1px solid var(--border)" }}>
      <header style={{ marginBottom: "0.75rem" }}>
        <p style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, margin: "0 0 0.25rem", color: "var(--text-primary)" }}>
          {String(program.partner_id)}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: 0 }}>
          {String(program.primary_use_case ?? "Use case not recorded")} · Program {String(program.program_status)} · Pilot {String(program.pilot_environment ?? "sandbox")}
        </p>
      </header>

      {scorecard?.next_action && (
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", margin: "0 0 0.65rem", color: "#60A5FA" }}>
          Next: {scorecard.next_action}
        </p>
      )}

      {scorecard?.criteria && (
        <>
          <h4 style={{ fontFamily: FONT, fontSize: "0.82rem", margin: "0.65rem 0 0.45rem" }}>Pilot success criteria</h4>
          <PilotCriteriaList criteria={scorecard.criteria} />
        </>
      )}

      {timelineEvents.length > 0 && (
        <>
          <h4 style={{ fontFamily: FONT, fontSize: "0.82rem", margin: "0.85rem 0 0.45rem" }}>Pilot timeline</h4>
          <EvidenceTimeline events={timelineEvents} />
        </>
      )}

      {permissionRows.length > 0 && (
        <>
          <h4 style={{ fontFamily: FONT, fontSize: "0.82rem", margin: "0.85rem 0 0.45rem" }}>Case study readiness</h4>
          <PermissionStatusList permissions={permissionRows} />
          {artifact && (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.45rem 0 0" }}>
              Measured evidence: {String((artifact as { measured_evidence_status?: string }).measured_evidence_status ?? "see artifact")}
            </p>
          )}
        </>
      )}

      {valueEvidence && (
        <ExpansionSummary evidence={valueEvidence} />
      )}
    </div>
  );
}

function ApplicationEvidenceView({ evidence, designPartner }: { evidence: Record<string, unknown>; designPartner?: PortfolioPayload["design_partner"] }) {
  const claims = (evidence.investor_claims as Array<{ claim: string; status: string; quality: string; data_through?: string }>) ?? [];
  const lifecycle = evidence.lifecycle as Record<string, unknown> | undefined;

  return (
    <>
      <ContentCard title="Application lifecycle">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0 }}>
          Stage: {String(lifecycle?.stage ?? "unknown")} · Integration {String(lifecycle?.integration_status ?? "unknown")}
        </p>
      </ContentCard>

      {claims.length > 0 && (
        <ContentCard title="Investor claims">
          <div style={{ display: "grid", gap: "0.55rem" }}>
            {claims.map((claim) => (
              <div key={claim.claim} style={{ padding: "0.55rem 0.65rem", borderRadius: 10, border: "1px solid var(--border)" }}>
                <p style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: claim.status === "supported" ? "#10B981" : "#F4A261", margin: "0 0 0.25rem" }}>
                  {claim.status.replace(/_/g, " ").toUpperCase()}
                </p>
                <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-primary)", margin: "0 0 0.25rem" }}>{claim.claim}</p>
                <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", margin: 0 }}>
                  Quality: {claim.quality}{claim.data_through ? ` · Data through ${claim.data_through}` : ""}
                </p>
              </div>
            ))}
          </div>
        </ContentCard>
      )}

      {designPartner?.applications?.[0] && (
        <ContentCard title="Design partner workspace">
          <DesignPartnerWorkspace view={designPartner.applications[0] as Record<string, unknown>} />
        </ContentCard>
      )}
    </>
  );
}

function PolicyAdoptionPanel({ adoption }: { adoption: NonNullable<PortfolioPayload["policy_adoption"]> }) {
  return (
    <div>
      <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0 0 0.75rem", lineHeight: 1.55 }}>
        {adoption.notice}
      </p>
      <div style={{ display: "grid", gap: "0.65rem", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginBottom: "0.85rem" }}>
        <MetricWithProvenance label="Canonical policies" value={adoption.canonical_policies_available} provenance="measured" />
        <MetricWithProvenance label="Production eligible" value={adoption.production_eligible_policies} provenance="measured" />
        <MetricWithProvenance label="Actively consumed" value={adoption.actively_consumed_policies} provenance="measured" />
        <MetricWithProvenance label="Apps with >1 policy" value={adoption.applications_with_multiple_policies} provenance="measured" />
        <MetricWithProvenance label="Production apps >1 policy" value={adoption.production_applications_with_multiple_policies} provenance="measured" />
        <MetricWithProvenance label="Partners >1 configured" value={adoption.partners_with_multiple_configured_policies} provenance="measured" />
        <MetricWithProvenance label="Partners >1 production" value={adoption.partners_with_multiple_production_policies} provenance="measured" />
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0 0 0.55rem" }}>
        Policy expansion {adoption.policy_expansion_observed ? "observed" : "not yet observed"} · Evidence reuse {adoption.evidence_reuse_observed ? "observed" : "not yet observed"}
      </p>
      {adoption.aggregates.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.68rem" }}>
            <thead>
              <tr>
                {["Pack", "Result family", "Sandbox apps", "Production apps", "Requests", "Verified", "Reuse"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "0.35rem", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adoption.aggregates.map((row) => (
                <tr key={String(row.pack_id)}>
                  <td style={{ padding: "0.35rem", borderBottom: "1px solid var(--border)" }}>{String(row.pack_id)}</td>
                  <td style={{ padding: "0.35rem", borderBottom: "1px solid var(--border)" }}>{String(row.result_family)}</td>
                  <td style={{ padding: "0.35rem", borderBottom: "1px solid var(--border)" }}>{String(row.sandbox_applications)}</td>
                  <td style={{ padding: "0.35rem", borderBottom: "1px solid var(--border)" }}>{String(row.production_applications)}</td>
                  <td style={{ padding: "0.35rem", borderBottom: "1px solid var(--border)" }}>{String(row.request_volume)}</td>
                  <td style={{ padding: "0.35rem", borderBottom: "1px solid var(--border)" }}>{String(row.verified_receipts)}</td>
                  <td style={{ padding: "0.35rem", borderBottom: "1px solid var(--border)" }}>{String(row.evidence_reuse_count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExpansionSummary({ evidence }: { evidence: Record<string, unknown> }) {
  const policyProd = evidence.policy_expansion_production as Record<string, unknown> | undefined;
  const reuse = evidence.pilot_sandbox as { metrics?: { evidence_reuse_count?: { value?: number } } } | undefined;
  return (
    <div style={{ marginTop: "0.85rem" }}>
      <h4 style={{ fontFamily: FONT, fontSize: "0.82rem", margin: "0 0 0.45rem" }}>Expansion</h4>
      <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
        Policy expansion {policyProd?.policy_expansion_observed ? "observed" : "not yet observed"}.
        Evidence reuse {(reuse?.metrics?.evidence_reuse_count?.value ?? 0) > 0 ? "observed" : "not yet observed"}.
      </p>
    </div>
  );
}

function buildTimelineFromView(view: Record<string, unknown>) {
  const program = view.program as Record<string, unknown> | null;
  const valueEvidence = view.value_evidence as Record<string, unknown> | undefined;
  if (!program) return [];

  const events = [
    { id: "accepted", label: "Design partner accepted", timestamp: program.entered_at as string | null },
    { id: "pilot_started", label: "Pilot started", timestamp: program.pilot_started_at as string | null },
    { id: "pilot_complete", label: "Pilot complete", timestamp: program.pilot_completed_at as string | null },
  ];

  const velocity = valueEvidence?.integration_velocity as Record<string, { observed_at?: string }> | undefined;
  if (velocity?.application_created_to_first_successful_verification?.observed_at) {
    events.push({
      id: "first_receipt",
      label: "First receipt issued",
      timestamp: velocity.application_created_to_first_successful_verification.observed_at,
    });
  }

  return events
    .filter((e) => e.timestamp)
    .map((e) => ({ ...e, status: "complete" as const }));
}
