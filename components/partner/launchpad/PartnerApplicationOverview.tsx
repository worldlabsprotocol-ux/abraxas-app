"use client";
// FILE: components/partner/launchpad/PartnerApplicationOverview.tsx

import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { NextActionCard } from "@/components/product";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { PartnerLaunchpadMerchantJourney } from "@/components/partner/launchpad/PartnerLaunchpadMerchantJourney";
import { PartnerLaunchpadTechnicalDetails } from "@/components/partner/launchpad/PartnerLaunchpadTechnicalDetails";
import {
  deriveLaunchpadFirstSuccess,
  type LaunchpadIntegrationEvidence,
} from "@/lib/partner/launchpad/firstSuccessUx";
import {
  merchantPolicySubtitle,
  type LaunchpadJourneyResolution,
} from "@/lib/partner/launchpad/journeyState";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import type { ApplicationPoliciesSummary } from "@/lib/partner/launchpad/applicationPolicyBindings";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

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

function EnvironmentBanner({ sandbox }: { sandbox: boolean }) {
  return (
    <div
      role="status"
      style={{
        marginBottom: "0.85rem",
        padding: "0.65rem 0.85rem",
        borderRadius: 10,
        border: `1px solid ${sandbox ? "rgba(96,165,250,0.35)" : "rgba(16,185,129,0.35)"}`,
        background: sandbox ? "rgba(96,165,250,0.08)" : "rgba(16,185,129,0.08)",
      }}
    >
      <p style={{ margin: 0, fontFamily: MONO, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.08em", color: sandbox ? "#60A5FA" : "#10B981" }}>
        {sandbox ? "SANDBOX" : "PRODUCTION"}
      </p>
      <p style={{ margin: "0.25rem 0 0", fontFamily: FONT, fontSize: "0.74rem", lineHeight: 1.5, color: "var(--text-secondary)" }}>
        {sandbox
          ? "Safe for integration and testing. Passing results here are not production authorization."
          : "Live environment. Access was reviewed before activation."}
      </p>
    </div>
  );
}

export function PartnerApplicationOverview({
  application,
  journey,
  policySummary,
  evidence,
  productionActivated,
  onNavigate,
}: {
  application: ApplicationSummary;
  journey: LaunchpadJourneyResolution;
  policySummary: ApplicationPoliciesSummary | null;
  evidence: LaunchpadIntegrationEvidence;
  productionActivated?: boolean;
  onNavigate?: (step: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const primaryBinding = policySummary?.bindings.find((binding) => binding.binding_role === "primary")
    ?? policySummary?.bindings[0];

  const appTitle = application.display_name || application.application_name;
  const subtitle = merchantPolicySubtitle(application.policy_template_id);
  const sandbox = !productionActivated && application.environment !== "production";

  const firstSuccess = deriveLaunchpadFirstSuccess({
    journey,
    evidence,
    callbackUrls: application.allowed_return_urls,
    productionActivated: Boolean(productionActivated),
  });

  const quickstartHref = "/docs/VERIFY_WITH_ABRAXAS_QUICKSTART";
  const reuseHref = "/evaluation/two-app";

  return (
    <ContentCard title={appTitle}>
      <EnvironmentBanner sandbox={sandbox} />

      <div style={{ marginBottom: "0.85rem" }}>
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", fontWeight: 700, margin: "0 0 0.2rem", color: "var(--text-primary)" }}>
          {subtitle}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
          {firstSuccess.humanStatus}
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
          action={firstSuccess.primaryLabel}
          detail={[firstSuccess.primaryDetail, firstSuccess.whyItMatters].filter(Boolean).join(" ")}
          buttonLabel={firstSuccess.primaryCta}
          onAction={
            onNavigate
              ? () => {
                  if (firstSuccess.primaryCta.toLowerCase().includes("quickstart")) {
                    window.location.href = quickstartHref;
                    return;
                  }
                  onNavigate(firstSuccess.stage);
                }
              : undefined
          }
        />
      </div>

      {firstSuccess.showCallbackEducation && (
        <div
          style={{
            marginTop: "0.85rem",
            padding: "0.75rem 0.85rem",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface-inset)",
          }}
        >
          <p style={{ margin: 0, fontFamily: MONO, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.06em", color: "var(--text-muted)" }}>
            Callback vs authorization
          </p>
          <p style={{ margin: "0.35rem 0 0", fontFamily: FONT, fontSize: "0.74rem", lineHeight: 1.55, color: "var(--text-secondary)" }}>
            Your callback URL receives a continuation signal when verification finishes. Your server must verify the signed result before granting access.
          </p>
        </div>
      )}

      {firstSuccess.showServerVerificationSuccess && (
        <div
          role="status"
          style={{
            marginTop: "0.85rem",
            padding: "0.75rem 0.85rem",
            borderRadius: 10,
            border: "1px solid rgba(16,185,129,0.35)",
            background: "rgba(16,185,129,0.08)",
            transition: reduceMotion ? undefined : "opacity 0.35s ease",
          }}
        >
          <p style={{ margin: 0, fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, color: "#10B981" }}>
            Result verified on your server
          </p>
          <p style={{ margin: "0.35rem 0 0", fontFamily: FONT, fontSize: "0.74rem", lineHeight: 1.55, color: "var(--text-secondary)" }}>
            Authentic · Currently valid · Bound to this application. Your integration received the narrow eligibility result — not underlying identity documents.
          </p>
        </div>
      )}

      {firstSuccess.showReuseDiscovery && (
        <div style={{ marginTop: "0.85rem" }}>
          <p style={{ margin: "0 0 0.45rem", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Test reuse across another application
          </p>
          <p style={{ margin: "0 0 0.55rem", fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Optional: prove the same trusted verification can satisfy a second application without collecting identity again.
          </p>
          <Btn href={reuseHref} size="sm" variant="secondary">Open two-app evaluation</Btn>
        </div>
      )}

      {firstSuccess.showProductionTransition && (
        <div
          style={{
            marginTop: "0.85rem",
            padding: "0.75rem 0.85rem",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface-inset)",
          }}
        >
          <p style={{ margin: 0, fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, color: "var(--text-primary)" }}>
            Before production
          </p>
          <ul style={{ margin: "0.45rem 0 0", paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
            <li>Confirm application configuration and callback URLs</li>
            <li>Confirm server-side result verification is working</li>
            <li>Review production requirements and submit a request</li>
          </ul>
          {onNavigate && (
            <div style={{ marginTop: "0.55rem" }}>
              <Btn size="sm" variant="ghost" onClick={() => onNavigate("go_live")}>Review production checklist</Btn>
            </div>
          )}
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

      <p style={{ margin: "0.85rem 0 0", fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
        Need the integration guide?{" "}
        <Link href={quickstartHref} style={{ color: "var(--accent)", fontWeight: 700 }}>Verify with Abraxas quickstart</Link>
      </p>
    </ContentCard>
  );
}
