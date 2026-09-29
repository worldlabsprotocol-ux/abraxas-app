"use client";
// FILE: components/partner/launchpad/PartnerApplicationOverview.tsx

import { useCallback, useEffect, useState } from "react";
import {
  EnvironmentBadge,
  IntegrationJourney,
  NextActionCard,
  type JourneyStage,
} from "@/components/product";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

interface ApplicationSummary {
  id: string;
  application_name: string;
  display_name: string;
  environment: string;
  policy_template_id: string;
  policy_id: string;
  status: string;
  integration_status: string;
}

interface IntegrationHealth {
  overall: "pass" | "action_required" | "blocked";
  checks: Array<{ id: string; label: string; status: string }>;
}

interface PilotProgressLite {
  enrolled: boolean;
  effective_status: string | null;
  measured_results?: { evidence_reuse_count: number };
  next_action: string | null;
}

export function PartnerApplicationOverview({
  application,
  integrationHealth,
  productionActivated,
  onNavigate,
}: {
  application: ApplicationSummary;
  integrationHealth: IntegrationHealth | null;
  productionActivated?: boolean;
  onNavigate?: (step: string) => void;
}) {
  const [pilotProgress, setPilotProgress] = useState<PilotProgressLite | null>(null);

  const loadPilot = useCallback(async () => {
    const res = await fetch(`/api/launchpad/applications/${application.id}/pilot-progress`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json();
    if (res.ok) setPilotProgress((data as { progress: PilotProgressLite }).progress);
  }, [application.id]);

  useEffect(() => { void loadPilot(); }, [loadPilot]);

  const journey = buildJourneyStages(application, integrationHealth, pilotProgress, productionActivated);
  const healthLabel =
    integrationHealth?.overall === "pass"
      ? "Healthy"
      : integrationHealth?.overall === "blocked"
        ? "Blocked"
        : integrationHealth
          ? "Action required"
          : "Unknown";

  const reuseObserved = (pilotProgress?.measured_results?.evidence_reuse_count ?? 0) > 0;

  return (
    <ContentCard title={application.display_name || application.application_name}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
        <EnvironmentBadge environment={application.environment} />
        <StatusPill label={`Integration ${application.integration_status}`} />
        <StatusPill label={`Verification ${healthLabel}`} />
        {pilotProgress?.enrolled && <StatusPill label={`Pilot ${pilotProgress.effective_status ?? "enrolled"}`} />}
        <StatusPill label={`Evidence reuse ${reuseObserved ? "observed" : "not yet observed"}`} />
        <StatusPill label={`Production ${productionActivated ? "active" : "not active"}`} />
      </div>

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <div>
          <h3 style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, margin: "0 0 0.45rem" }}>Policy</h3>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-primary)", margin: "0 0 0.15rem" }}>
            {formatPolicyTitle(application.policy_template_id)}
          </p>
          <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", margin: 0 }}>
            {application.policy_id}
          </p>
        </div>
        <div>
          <h3 style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, margin: "0 0 0.45rem" }}>Integration journey</h3>
          <IntegrationJourney stages={journey} />
        </div>
      </div>

      {pilotProgress?.next_action && (
        <div style={{ marginTop: "0.85rem" }}>
          <NextActionCard
            action={humanizeNextAction(pilotProgress.next_action)}
            detail="Resolved from your application's measured state."
            onAction={onNavigate ? () => onNavigate(resolveStepForAction(pilotProgress.next_action)) : undefined}
          />
        </div>
      )}
    </ContentCard>
  );
}

function buildJourneyStages(
  app: ApplicationSummary,
  health: IntegrationHealth | null,
  pilot: PilotProgressLite | null,
  productionActivated?: boolean,
): JourneyStage[] {
  const hasPolicy = Boolean(app.policy_template_id);
  const hasSandbox = app.environment === "sandbox" || Boolean(app.id);
  const integrated = app.integration_status !== "pending" && app.integration_status !== "not_started";
  const receiptVerified = health?.checks.some((c) => c.id.includes("receipt") && c.status === "pass") ?? false;
  const pilotLive = pilot?.enrolled && pilot.effective_status === "pilot_live";
  const productionRequested = app.status.includes("production") || app.integration_status.includes("production_request");

  return [
    { id: "choose_policy", label: "Choose policy", status: hasPolicy ? "complete" : "current" },
    { id: "create_sandbox", label: "Create sandbox", status: hasSandbox ? "complete" : hasPolicy ? "current" : "pending" },
    { id: "integrate", label: "Integrate", status: integrated ? "complete" : hasSandbox ? "current" : "pending" },
    {
      id: "verify_receipt",
      label: "Verify receipt",
      status: receiptVerified ? "complete" : integrated ? "current" : "pending",
      detail: receiptVerified ? "Receipt verification working" : undefined,
    },
    {
      id: "run_pilot",
      label: "Run pilot",
      status: pilotLive ? "complete" : receiptVerified ? "current" : "pending",
    },
    {
      id: "request_production",
      label: "Request production",
      status: productionRequested ? "complete" : pilotLive ? "current" : "pending",
    },
    {
      id: "go_live",
      label: "Go live",
      status: productionActivated ? "complete" : productionRequested ? "current" : "pending",
    },
  ];
}

function formatPolicyTitle(id: string): string {
  if (id.includes("age_21")) return "Age eligibility — Is this person 21 or older?";
  if (id.includes("residency") || id.includes("us_")) return "Residency eligibility";
  return id.replace(/_/g, " ");
}

function humanizeNextAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveStepForAction(action: string | null): string {
  if (!action) return "application";
  if (action.includes("production")) return "production";
  if (action.includes("verify") || action.includes("receipt")) return "test";
  if (action.includes("pilot")) return "readiness";
  return "configure";
}

function StatusPill({ label }: { label: string }) {
  return (
    <span
      style={{
        fontFamily: FONT,
        fontSize: "0.65rem",
        fontWeight: 700,
        padding: "0.22rem 0.55rem",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: "var(--surface-inset)",
        color: "var(--text-secondary)",
      }}
    >
      {label}
    </span>
  );
}
