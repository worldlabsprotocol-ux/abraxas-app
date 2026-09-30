"use client";
// FILE: components/partner/launchpad/PartnerApplicationOverview.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { NextActionCard } from "@/components/product";
import { PrivacyDisclosureCard } from "@/components/product/PrivacyDisclosureCard";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { PartnerApplicationPoliciesPanel } from "@/components/partner/launchpad/PartnerApplicationPoliciesPanel";
import { PartnerLaunchpadMerchantJourney } from "@/components/partner/launchpad/PartnerLaunchpadMerchantJourney";
import { PartnerLaunchpadTechnicalDetails } from "@/components/partner/launchpad/PartnerLaunchpadTechnicalDetails";
import {
  merchantPolicySubtitle,
  resolveLaunchpadJourneyState,
  type LaunchpadJourneyInput,
} from "@/lib/partner/launchpad/journeyState";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type { ApplicationPoliciesSummary } from "@/lib/partner/launchpad/applicationPolicyBindings";
import type { StarterKitPlatform } from "@/lib/partner/starterKit/contract";

const FONT = ABRAXAS_FONT_SANS;

interface ApplicationSummary {
  id: string;
  public_slug?: string;
  partner_id?: string;
  application_name: string;
  display_name: string;
  environment: string;
  policy_template_id: string;
  policy_id: string;
  status: string;
  integration_status: string;
  allowed_return_urls: string[];
  key_prefix: string | null;
}

interface IntegrationHealth {
  overall: "pass" | "action_required" | "blocked";
  checks: Array<{ id: string; label: string; status: string }>;
}

export function PartnerApplicationOverview({
  application,
  integrationHealth,
  productionActivated,
  activeSandboxKey = Boolean(application.key_prefix),
  starterKitEvidenced = false,
  starterKitPlatform = null,
  onNavigate,
}: {
  application: ApplicationSummary;
  integrationHealth: IntegrationHealth | null;
  productionActivated?: boolean;
  activeSandboxKey?: boolean;
  starterKitEvidenced?: boolean;
  starterKitPlatform?: StarterKitPlatform | null;
  onNavigate?: (step: string) => void;
}) {
  const [policySummary, setPolicySummary] = useState<ApplicationPoliciesSummary | null>(null);

  const loadPolicies = useCallback(async () => {
    const res = await fetch(`/api/launchpad/applications/${application.id}/eligibility-policies`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json() as { summary?: ApplicationPoliciesSummary };
    if (res.ok && data.summary) setPolicySummary(data.summary);
  }, [application.id]);

  useEffect(() => { void loadPolicies(); }, [loadPolicies]);

  const verifiedReceiptCount = useMemo(
    () => policySummary?.bindings.reduce((sum, binding) => sum + (binding.verified_receipts ?? 0), 0) ?? 0,
    [policySummary],
  );

  const harnessPassed = integrationHealth?.checks.some(
    (check) => check.id === "harness" && check.status === "pass",
  ) ?? false;

  const journeyInput: LaunchpadJourneyInput = {
    application,
    configuredPolicyCount: policySummary?.configured_count ?? (application.policy_template_id ? 1 : 0),
    verifiedReceiptCount,
    activeSandboxKey,
    starterKitEvidenced,
    starterKitPlatform,
    harnessPassed,
    productionActivated,
  };

  const journey = useMemo(() => resolveLaunchpadJourneyState(journeyInput), [journeyInput]);
  const primaryBinding = policySummary?.bindings.find((binding) => binding.binding_role === "primary")
    ?? policySummary?.bindings[0];

  const appTitle = application.display_name || application.application_name;
  const subtitle = merchantPolicySubtitle(application.policy_template_id);

  return (
    <>
      <ContentCard title={appTitle}>
        <div style={{ marginBottom: "0.85rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.86rem", fontWeight: 700, margin: "0 0 0.2rem", color: "var(--text-primary)" }}>
            {subtitle}
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
            {journey.environmentLabel}
            {" · "}
            {journey.verificationLabel}
          </p>
        </div>

        <PartnerLaunchpadMerchantJourney
          stages={journey.stages}
          completedCount={journey.completedCount}
          totalStages={journey.totalStages}
          compact
        />

        <div style={{ marginTop: "1rem" }}>
          <NextActionCard
            title="Next step"
            action={journey.primaryAction.label}
            detail={journey.primaryAction.detail}
            buttonLabel={journey.primaryAction.cta}
            onAction={
              onNavigate && journey.primaryAction.enabled
                ? () => onNavigate(journey.primaryAction.stage)
                : undefined
            }
          />
        </div>

        {journey.testPassed && journey.privacySummary && (
          <div style={{ marginTop: "0.85rem" }}>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, color: "#10B981", margin: "0 0 0.55rem" }}>
              Test passed
            </p>
            <PrivacyDisclosureCard
              requester={appTitle}
              requestReason="Customer age eligibility verification"
              requested={[{ label: "Confirm customer is 21 or older" }]}
              shared={journey.privacySummary.shared.map((label) => ({ label }))}
              withheld={journey.privacySummary.withheld.map((label) => ({ label }))}
              compact
            />
          </div>
        )}

        <PartnerLaunchpadTechnicalDetails
          data={{
            applicationId: application.id,
            partnerId: application.partner_id,
            publicSlug: application.public_slug,
            bindingId: primaryBinding?.binding_id ?? null,
            policyId: application.policy_id,
            policyTemplateId: application.policy_template_id,
            resultFamily: primaryBinding?.disclosed_result,
            environment: application.environment,
            keyPrefix: application.key_prefix,
            integrationStatus: application.integration_status,
            allowedReturnUrls: application.allowed_return_urls,
            productionActive: productionActivated,
          }}
        />
      </ContentCard>

      <div style={{ marginTop: "0.85rem" }}>
        <PartnerApplicationPoliciesPanel
          applicationId={application.id}
          connectionComplete={journey.testAvailable}
          onNavigate={onNavigate}
        />
      </div>
    </>
  );
}
