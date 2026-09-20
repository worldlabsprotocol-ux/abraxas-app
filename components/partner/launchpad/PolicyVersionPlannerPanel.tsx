"use client";
// FILE: components/partner/launchpad/PolicyVersionPlannerPanel.tsx
// Read-only policy version comparison. Never upgrades the pin.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  POLICY_VERSION_PLANNER_ENTRY,
  POLICY_VERSION_NOTICE,
} from "@/lib/partner/launchpad/policyVersionPlanner/contract";
import type { PolicyVersionPlannerView } from "@/lib/partner/launchpad/policyVersionPlanner/view";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.8rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

function statusText(availability: string): string {
  if (availability === "no_newer") return "Current — no newer catalog version";
  if (availability === "newer_planning") return "Planning — newer catalog version";
  if (availability === "deprecated") return "Deprecated or unavailable";
  return "Unknown catalog state";
}

export function PolicyVersionPlannerPanel({
  applicationId,
  onContinue,
}: {
  applicationId: string;
  onContinue?: () => void;
}) {
  const [view, setView] = useState<PolicyVersionPlannerView | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/policy-version-plan`, {
        credentials: "include",
      });
      const data = await res.json() as PolicyVersionPlannerView & { error?: string };
      if (!res.ok) {
        setError("Could not load the policy version plan.");
        setView(null);
        return;
      }
      setView(data);
    } catch {
      setError("Could not load the policy version plan.");
    }
  }, [applicationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const comparison = view?.comparison;

  return (
    <ContentCard title={POLICY_VERSION_PLANNER_ENTRY}>
      <p style={{ ...body, marginBottom: "0.75rem" }}>{POLICY_VERSION_NOTICE}</p>
      {error && <p role="alert" style={{ ...body, color: "var(--danger, #f87171)", marginBottom: "0.7rem" }}>{error}</p>}
      {view && (
        <>
          <h3 style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, margin: "0 0 0.4rem" }}>
            Current pinned policy
          </h3>
          <p style={{ ...body, fontWeight: 700, color: "var(--text-primary)" }} role="status">
            {statusText(view.availability)}
          </p>
          <p style={{ ...body, marginBottom: "0.65rem" }}>{view.availability_label}</p>
          {view.reusable_continuity_reviewed && view.reusable_continuity_label && (
            <p style={{ ...body, fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.65rem" }} role="status">
              {view.reusable_continuity_label}
            </p>
          )}
          {view.current && (
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "0.8rem", marginBottom: "0.85rem" }}>
              <p style={{ ...body, fontWeight: 700, color: "var(--text-primary)" }}>
                {view.current.display_name} · v{view.pinned_version}
              </p>
              <p style={body}>Eligibility result: {view.current.result_category}</p>
              <p style={body}>Qualifying method: {view.current.method_category}</p>
              <p style={body}>Partner receives: {view.current.partner_receives}</p>
              <p style={body}>Withheld: {view.current.withheld.join(", ")}</p>
              <p style={body}>{view.current.environment_label}</p>
            </div>
          )}
          {comparison && (
            <>
              <h3 style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, margin: "0 0 0.4rem" }}>
                Planned catalog comparison
              </h3>
              <p style={{ ...body, fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.55rem" }} role="status">
                {comparison.compatibility_label}
              </p>
              <div style={{ display: "grid", gap: "0.45rem", marginBottom: "0.85rem" }}>
                {[
                  ["Result category", comparison.result_category.from, comparison.result_category.to],
                  ["Qualifying method", comparison.method_category.from, comparison.method_category.to],
                  ["Shared result", comparison.partner_receives.from, comparison.partner_receives.to],
                  ["Withheld", comparison.withheld.from.join(", "), comparison.withheld.to.join(", ")],
                  ["Allowed output fields", comparison.allowed_output_fields.from.join(", "), comparison.allowed_output_fields.to.join(", ")],
                  ["Environment", comparison.environment.from, comparison.environment.to],
                ].map(([label, from, to]) => (
                  <div key={String(label)} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.65rem" }}>
                    <div style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700 }}>{label}</div>
                    <p style={body}>Current: {from}</p>
                    <p style={body}>Planning: {to}</p>
                  </div>
                ))}
                <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.65rem" }}>
                  <div style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700 }}>Compatible paths</div>
                  {Object.entries(comparison.paths).map(([id, path]) => (
                    <p key={id} style={body}>
                      {id.replace(/_/g, " ")}: {path.from ? "current yes" : "current no"} → {path.to ? "planning yes" : "planning no"}
                      {path.changed ? " (changed)" : " (unchanged)"}
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}
          <p style={{ ...body, marginBottom: "0.7rem" }}>{view.google_is_account_only}</p>
          <p style={{ ...body, marginBottom: "0.7rem" }}>
            <Link href="/docs/policy-compatibility" style={{ color: "var(--accent)", fontWeight: 700 }}>
              Policy compatibility
            </Link>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.75rem" }}>
            {view.next_actions.map((action) => (
              <Link key={action.id} href={action.href} style={{ color: "var(--accent)", fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700 }}>
                {action.label}
              </Link>
            ))}
          </div>
          {onContinue && (
            <Btn size="sm" variant="secondary" onClick={onContinue}>Continue to test console</Btn>
          )}
        </>
      )}
    </ContentCard>
  );
}
