"use client";

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { HolderAccessPanel } from "@/components/sui/HolderAccessPanel";
import {
  ACCOUNT_HOLDER_SIGN_IN_REQUIRED,
  ACCOUNT_HUB_EYEBROW,
  ACCOUNT_ORGANIZATIONS_SUBHEAD,
  ACCOUNT_ORGANIZATIONS_TITLE,
} from "@/lib/account/accountHubCopy";
import { PARTNER_APPLICATION_PATH } from "@/lib/integrate/partnerJourney";
import { INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF } from "@/lib/partner/launchpad/institutionalActivationEntry";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export default function AccountOrganizationsPage() {
  const { isAuthenticated } = useSuiAuth();

  return (
    <RedesignPage accent="developer" maxWidth={760}>
      <PageHeader
        eyebrow={ACCOUNT_HUB_EYEBROW}
        title={ACCOUNT_ORGANIZATIONS_TITLE}
        subtitle={ACCOUNT_ORGANIZATIONS_SUBHEAD}
      />

      {!isAuthenticated ? (
        <ContentCard title="Sign in">
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.75rem" }}>
            {ACCOUNT_HOLDER_SIGN_IN_REQUIRED}
          </p>
          <HolderAccessPanel />
        </ContentCard>
      ) : null}

      <ContentCard title="Organization eligibility">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 0 }}>
          Private organization and authorized-signer eligibility is policy-bound and partner-scoped. Abraxas stores opaque references — not legal names or KYB files — and never grants organization access from wallet or email alone.
        </p>
        <BulletList
          items={[
            "Complete institutional verification flows from Launchpad when your sandbox policy requires organization eligibility.",
            "Design partner enrollment is reviewed manually; production access is not automatic.",
            "If you lack authorization, use the recovery action shown in Launchpad or contact your operator.",
          ]}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
          <Btn href={INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF} size="sm">
            Integration workspace
          </Btn>
          <Btn href="/developers/institutional-verification" variant="secondary" size="sm">
            Verification SDK
          </Btn>
          <Btn href="/account/applications" variant="ghost" size="sm">
            Attach Launchpad session
          </Btn>
        </div>
      </ContentCard>

      <ContentCard title="Design partner program">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 0 }}>
          Apply when you meet program criteria. Approval may provision partner resources through operator review — not through this account page.
        </p>
        <Btn href="/design-partner" size="sm">
          Design partner hub
        </Btn>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.75rem 0 0" }}>
          General partner application:{" "}
          <Link href={PARTNER_APPLICATION_PATH} style={{ color: "var(--accent)", fontWeight: 600 }}>
            Apply as relying party
          </Link>
        </p>
      </ContentCard>

      <Btn href="/account" variant="ghost" size="sm">
        Back to account
      </Btn>
    </RedesignPage>
  );
}
