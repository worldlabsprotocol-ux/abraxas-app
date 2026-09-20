"use client";
// FILE: app/design-partner/DesignPartnerPolicyFitNotice.tsx
// Safe structured handoff from Integration Studio. No lead persistence.

import { useSearchParams } from "next/navigation";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  POLICY_FIT_ACTION_LABELS,
  POLICY_FIT_CATEGORY_LABELS,
  POLICY_FIT_ENVIRONMENT_LABELS,
  POLICY_FIT_REVIEW_NOTICE,
  isPolicyFitAction,
  isPolicyFitCategory,
  isPolicyFitEnvironment,
} from "@/lib/partner/integrationStudio/policyFit/contract";

const FONT = ABRAXAS_FONT_SANS;

export function DesignPartnerPolicyFitNotice() {
  const params = useSearchParams();
  if (params.get("source") !== "integration-studio-policy-fit") return null;
  const action = params.get("action") ?? "";
  const category = params.get("category") ?? "";
  const environment = params.get("environment") ?? "";
  if (!isPolicyFitAction(action) || !isPolicyFitCategory(category) || !isPolicyFitEnvironment(environment)) {
    return null;
  }

  return (
    <ContentCard title="Talk to us about a policy fit">
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
        Studio sent these structured choices only. {POLICY_FIT_ACTION_LABELS[action]}.
        {" "}{POLICY_FIT_CATEGORY_LABELS[category]}.
        {" "}{POLICY_FIT_ENVIRONMENT_LABELS[environment]}.
        {" "}{POLICY_FIT_REVIEW_NOTICE}
      </p>
    </ContentCard>
  );
}
