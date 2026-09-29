"use client";
// FILE: components/partner/launchpad/PartnerApplicationPoliciesPanel.tsx

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { EligibilityPolicyCard } from "@/components/product/EligibilityPolicyCard";
import { NextActionCard } from "@/components/product";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { humanizeMultiPolicyNextAction } from "@/lib/partner/launchpad/multiPolicyNextAction";
import type { ApplicationPoliciesSummary } from "@/lib/partner/launchpad/applicationPolicyBindings";

const FONT = ABRAXAS_FONT_SANS;

interface EligibilityPoliciesResponse {
  ok: boolean;
  summary: ApplicationPoliciesSummary;
  next_action: string | null;
}

export function PartnerApplicationPoliciesPanel({
  applicationId,
  onNavigate,
}: {
  applicationId: string;
  onNavigate?: (step: string) => void;
}) {
  const [summary, setSummary] = useState<ApplicationPoliciesSummary | null>(null);
  const [nextAction, setNextAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/eligibility-policies`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json() as EligibilityPoliciesResponse & { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not load eligibility policies");
      setSummary(null);
    } else {
      setSummary(data.summary);
      setNextAction(data.next_action);
    }
    setLoading(false);
  }, [applicationId]);

  useEffect(() => { void load(); }, [load]);

  async function addPolicy(templateId: string) {
    setAdding(templateId);
    setError("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/eligibility-policies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ policy_template_id: templateId }),
    });
    const data = await res.json() as EligibilityPoliciesResponse & { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not add policy");
    } else {
      setSummary(data.summary);
      setShowCatalog(false);
    }
    setAdding(null);
  }

  if (loading) {
    return (
      <ContentCard title="Eligibility policies">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>Loading policies…</p>
      </ContentCard>
    );
  }

  if (!summary) {
    return (
      <ContentCard title="Eligibility policies">
        <p role="alert" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#ef4444", margin: 0 }}>{error || "Unavailable"}</p>
      </ContentCard>
    );
  }

  const initialTitle = summary.initial_policy_template_id
    ? summary.bindings.find((b) => b.pack_id === summary.initial_policy_template_id)?.title
      ?? summary.initial_policy_template_id.replace(/_/g, " ")
    : null;

  return (
    <ContentCard title="Eligibility policies">
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 0.65rem", lineHeight: 1.55 }}>
        One integration. Multiple eligibility policies. Add approved eligibility questions through the same Abraxas trust infrastructure without collecting underlying identity data.
      </p>

      <p style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.75rem" }}>
        {summary.configured_count} configured · {summary.production_active_count} production · {summary.sandbox_count} sandbox
      </p>

      {summary.policy_expansion_observed && initialTitle && (
        <div style={{ marginBottom: "0.85rem", padding: "0.65rem 0.75rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-inset)" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, margin: "0 0 0.35rem" }}>Policy expansion · Observed</p>
          <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-secondary)", margin: 0 }}>
            Initial: {initialTitle}
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-secondary)", margin: "0.25rem 0 0" }}>
            Current: {summary.bindings.map((b) => b.title).join(" · ")}
          </p>
        </div>
      )}

      {summary.bindings.length === 0 ? (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 0.75rem" }}>
          No eligibility policies configured yet. Choose the first question your application needs Abraxas to answer.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "0.65rem", marginBottom: "0.85rem" }}>
          {summary.bindings.map((binding) => (
            <EligibilityPolicyCard
              key={binding.binding_id ?? binding.policy_id}
              title={binding.title}
              question={binding.question}
              partnerReceives={binding.partner_receives}
              partnerDoesNotReceive={binding.partner_does_not_receive}
              technicalId={binding.policy_id}
              packId={String(binding.pack_id)}
              catalogVersion={binding.policy_version}
              resultFamily={binding.disclosed_result}
              environment={
                binding.application_production_authorized ? "production" : "sandbox"
              }
              availability={binding.availability}
              policyProductionEligible={binding.policy_production_eligible}
              applicationProductionAuthorized={binding.application_production_authorized}
              compatibilityHint={binding.compatibility_hint}
              requestVolume={binding.request_volume}
              verifiedReceipts={binding.verified_receipts}
              evidenceReuseCount={binding.evidence_reuse_count}
              minimumAssurance={binding.minimum_assurance}
              receiptLifetimeHours={binding.receipt_lifetime_hours}
              reuseNotice={binding.reuse_notice}
            />
          ))}
        </div>
      )}

      {nextAction && (
        <div style={{ marginBottom: "0.75rem" }}>
          <NextActionCard
            action={humanizeMultiPolicyNextAction(nextAction) ?? nextAction}
            detail="Resolved from configured policies and measured integration state."
            onAction={
              onNavigate && nextAction.includes("production")
                ? () => onNavigate("production")
                : onNavigate && nextAction.includes("receipt")
                  ? () => onNavigate("test")
                  : nextAction === "add_another_eligibility_policy"
                    ? () => setShowCatalog(true)
                    : undefined
            }
          />
        </div>
      )}

      {error && <p role="alert" style={{ color: "#ef4444", fontFamily: FONT, fontSize: "0.72rem", margin: "0 0 0.65rem" }}>{error}</p>}

      {!showCatalog ? (
        <Btn
          size="sm"
          variant="secondary"
          onClick={() => setShowCatalog(true)}
          disabled={summary.available_to_add.length === 0}
        >
          Add eligibility policy
        </Btn>
      ) : (
        <div style={{ marginTop: "0.5rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, margin: "0 0 0.55rem" }}>
            Add eligibility policy
          </p>
          {summary.available_to_add.length === 0 ? (
            <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", margin: 0 }}>
              No additional production policies are currently available for this application.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "0.55rem" }}>
              {summary.available_to_add.map((policy) => (
                <div key={String(policy.pack_id)}>
                  <EligibilityPolicyCard
                    title={policy.title}
                    question={policy.question}
                    partnerReceives={policy.partner_receives}
                    partnerDoesNotReceive={policy.partner_does_not_receive}
                    packId={String(policy.pack_id)}
                    catalogVersion={policy.catalog_version}
                    resultFamily={policy.disclosed_result}
                    environment={policy.policy_production_eligible ? "available" : "sandbox"}
                    policyProductionEligible={policy.policy_production_eligible}
                    applicationProductionAuthorized={false}
                    minimumAssurance={policy.minimum_assurance}
                    receiptLifetimeHours={policy.receipt_lifetime_hours}
                    reuseNotice={policy.reuse_notice}
                    compact
                  />
                  <div style={{ marginTop: "0.4rem" }}>
                    <Btn
                      size="sm"
                      loading={adding === String(policy.pack_id)}
                      disabled={Boolean(adding)}
                      onClick={() => void addPolicy(String(policy.pack_id))}
                    >
                      Configure in sandbox
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Btn size="sm" variant="ghost" onClick={() => setShowCatalog(false)} style={{ marginTop: "0.55rem" }}>
            Cancel
          </Btn>
        </div>
      )}
    </ContentCard>
  );
}
