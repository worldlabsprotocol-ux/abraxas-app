"use client";

import { useCallback, useState } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { HolderAccessPanel } from "@/components/sui/HolderAccessPanel";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { PartnerLaunchpadSessionPanel } from "@/components/account/PartnerLaunchpadSessionPanel";
import { NativeAccountPasskeyPanel } from "@/components/account/NativeAccountPasskeyPanel";
import { AccountSessionsNotice } from "@/components/account/AccountSessionsNotice";
import {
  ACCOUNT_APPLICATIONS_SUBHEAD,
  ACCOUNT_APPLICATIONS_TITLE,
  ACCOUNT_HOLDER_SIGN_IN_REQUIRED,
  ACCOUNT_HUB_EYEBROW,
} from "@/lib/account/accountHubCopy";
import { useAccountOverview, ACCOUNT_OVERVIEW_QUERY_KEY } from "@/lib/hooks/useAccountOverview";
import { useQueryClient } from "@tanstack/react-query";
import { INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF } from "@/lib/partner/launchpad/institutionalActivationEntry";
import { InstitutionalDeveloperJourneyNav } from "@/components/developers/InstitutionalDeveloperJourneyNav";

export default function AccountApplicationsPage() {
  const { isAuthenticated } = useSuiAuth();
  const qc = useQueryClient();
  const { data: overview, refetch } = useAccountOverview({ enabled: true });
  const [partnerSignedIn, setPartnerSignedIn] = useState<boolean | null>(null);

  const partnerActive = partnerSignedIn ?? overview?.partner_console.authenticated ?? false;

  const onSessionChange = useCallback(
    (authenticated: boolean) => {
      setPartnerSignedIn(authenticated);
      void qc.invalidateQueries({ queryKey: [ACCOUNT_OVERVIEW_QUERY_KEY] });
      void refetch();
    },
    [qc, refetch],
  );

  return (
    <RedesignPage accent="developer" maxWidth={760}>
      <PageHeader
        eyebrow={ACCOUNT_HUB_EYEBROW}
        title={ACCOUNT_APPLICATIONS_TITLE}
        subtitle={ACCOUNT_APPLICATIONS_SUBHEAD}
      />
      <div style={{ marginBottom: "1rem" }}>
        <AccountSessionsNotice />
      </div>

      <ContentCard title="Native Abraxas account (operator)">
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Passkey sign-in for Launchpad and sandbox applications. Separate from Passport holder sign-in and from server API keys.
        </p>
        <NativeAccountPasskeyPanel mode="authenticate" onSuccess={() => void refetch()} />
        <div style={{ marginTop: "0.5rem" }}>
          <Btn href="/welcome" variant="ghost" size="sm">
            New here? Welcome entry
          </Btn>
        </div>
      </ContentCard>

      {!isAuthenticated ? (
        <ContentCard title="Passport holder access">
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {ACCOUNT_HOLDER_SIGN_IN_REQUIRED}
          </p>
          <HolderAccessPanel />
        </ContentCard>
      ) : null}

      <ContentCard title="Operator session">
        <PartnerLaunchpadSessionPanel
          signedIn={partnerActive}
          partnerId={overview?.partner_console.partner_id}
          environment={overview?.partner_console.environment}
          onSessionChange={onSessionChange}
        />
      </ContentCard>

      <ContentCard title="Institutional developer journey">
        <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 0 }}>
          After your operator session is attached, continue verify → connect → test in Launchpad or the integration workspace.
        </p>
        <InstitutionalDeveloperJourneyNav title="Six-step journey" currentStepId="understand_product" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
          <Btn href="/developers/launchpad" size="sm">
            Partner Launchpad
          </Btn>
          <Btn href={INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF} variant="secondary" size="sm">
            Integration workspace
          </Btn>
          <Btn href="/developers/integration-studio" variant="ghost" size="sm">
            Integration Studio
          </Btn>
          <Btn href="/account" variant="ghost" size="sm">
            Back to account
          </Btn>
        </div>
      </ContentCard>
    </RedesignPage>
  );
}
