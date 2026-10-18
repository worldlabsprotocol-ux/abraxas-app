"use client";

import { useCallback, useState } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { PartnerLaunchpadSessionPanel } from "@/components/account/PartnerLaunchpadSessionPanel";
import { NativeAccountSolanaPanel } from "@/components/account/NativeAccountSolanaPanel";
import { AccountSessionsNotice } from "@/components/account/AccountSessionsNotice";
import {
  ACCOUNT_APPLICATIONS_SUBHEAD,
  ACCOUNT_APPLICATIONS_TITLE,
  ACCOUNT_HUB_EYEBROW,
} from "@/lib/account/accountHubCopy";
import { useAccountOverview, ACCOUNT_OVERVIEW_QUERY_KEY } from "@/lib/hooks/useAccountOverview";
import { useQueryClient } from "@tanstack/react-query";
import { INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF } from "@/lib/partner/launchpad/institutionalActivationEntry";
import { InstitutionalDeveloperJourneyNav } from "@/components/developers/InstitutionalDeveloperJourneyNav";

export default function AccountApplicationsPage() {
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

      <ContentCard title="Your Abraxas account">
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Solana wallet sign-in for Launchpad, sandbox applications, and premium integration paths. Identity verification
          is only required when a specific application policy demands it.
        </p>
        <NativeAccountSolanaPanel onSuccess={() => void refetch()} />
        <div style={{ marginTop: "0.5rem" }}>
          <Btn href="/#start-sandbox" variant="ghost" size="sm">
            New here? Welcome entry
          </Btn>
        </div>
      </ContentCard>

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
          <Btn href="/pricing" variant="ghost" size="sm">
            Plans & pricing
          </Btn>
          <Btn href="/account" variant="ghost" size="sm">
            Back to account
          </Btn>
        </div>
      </ContentCard>
    </RedesignPage>
  );
}
