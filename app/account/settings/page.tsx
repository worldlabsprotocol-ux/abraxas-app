"use client";

import { useCallback } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { PartnerLaunchpadSessionPanel } from "@/components/account/PartnerLaunchpadSessionPanel";
import { useAccountOverview, ACCOUNT_OVERVIEW_QUERY_KEY } from "@/lib/hooks/useAccountOverview";
import { useQueryClient } from "@tanstack/react-query";
import {
  ACCOUNT_HUB_EYEBROW,
  ACCOUNT_SETTINGS_SUBHEAD,
  ACCOUNT_SETTINGS_TITLE,
} from "@/lib/account/accountHubCopy";
import { clearAccountUseCasePreference } from "@/lib/account/accountUseCasePreference";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export default function AccountSettingsPage() {
  const auth = useSuiAuth();
  const qc = useQueryClient();
  const { data: overview, refetch } = useAccountOverview();

  const onPartnerSessionChange = useCallback(
    (authenticated: boolean) => {
      void qc.invalidateQueries({ queryKey: [ACCOUNT_OVERVIEW_QUERY_KEY] });
      void refetch();
      if (!authenticated) return;
    },
    [qc, refetch],
  );

  return (
    <RedesignPage accent="neutral" maxWidth={720}>
      <PageHeader
        eyebrow={ACCOUNT_HUB_EYEBROW}
        title={ACCOUNT_SETTINGS_TITLE}
        subtitle={ACCOUNT_SETTINGS_SUBHEAD}
      />

      <ContentCard title="Abraxas account session">
        {auth.isAuthenticated && auth.suiAddress ? (
          <>
            <code style={{ fontFamily: MONO, fontSize: "0.72rem", wordBreak: "break-all", color: "var(--text-secondary)" }}>
              {auth.suiAddress}
            </code>
            {auth.session?.email && (
              <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", margin: "0.5rem 0 0" }}>
                {auth.session.email}
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
              <Btn
                size="sm"
                variant="secondary"
                onClick={() => {
                  clearAccountUseCasePreference();
                  auth.signOut();
                }}
              >
                Sign out of Abraxas account
              </Btn>
            </div>
          </>
        ) : (
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0 }}>
            Not signed in. Open Passport or use Sign in from the navigation bar.
          </p>
        )}
      </ContentCard>

      <ContentCard title="Partner Launchpad operator session">
        <PartnerLaunchpadSessionPanel
          signedIn={overview?.partner_console.authenticated ?? false}
          partnerId={overview?.partner_console.partner_id}
          environment={overview?.partner_console.environment}
          onSessionChange={onPartnerSessionChange}
          showInstitutionalShortcuts={false}
        />
      </ContentCard>

      <Btn href="/account" variant="ghost" size="sm">
        Back to account
      </Btn>
    </RedesignPage>
  );
}
