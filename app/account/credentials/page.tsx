"use client";

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { HolderAccessPanel } from "@/components/sui/HolderAccessPanel";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import {
  ACCOUNT_CREDENTIALS_SUBHEAD,
  ACCOUNT_CREDENTIALS_TITLE,
  ACCOUNT_HOLDER_SIGN_IN_REQUIRED,
  ACCOUNT_HUB_EYEBROW,
} from "@/lib/account/accountHubCopy";
import {
  HOLDER_VERIFY_CREDENTIAL_PATH,
  HOLDER_VERIFY_DEFAULT_PATH,
  PARTNER_RECEIPT_VERIFIER_PATH,
} from "@/lib/integrate/partnerJourney";

export default function AccountCredentialsPage() {
  const { isAuthenticated } = useSuiAuth();

  return (
    <RedesignPage accent="neutral" maxWidth={720}>
      <PageHeader
        eyebrow={ACCOUNT_HUB_EYEBROW}
        title={ACCOUNT_CREDENTIALS_TITLE}
        subtitle={ACCOUNT_CREDENTIALS_SUBHEAD}
      />

      {!isAuthenticated ? (
        <ContentCard title="Sign in required">
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.75rem" }}>
            {ACCOUNT_HOLDER_SIGN_IN_REQUIRED}
          </p>
          <HolderAccessPanel />
        </ContentCard>
      ) : (
        <ContentCard title="Passport tools">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Btn href={HOLDER_VERIFY_DEFAULT_PATH} size="sm">
              Registry lookup
            </Btn>
            <Btn href={HOLDER_VERIFY_CREDENTIAL_PATH} variant="secondary" size="sm">
              Test credential JWT
            </Btn>
            <Btn href="/passport?view=portable-trust" variant="secondary" size="sm">
              Portable trust export
            </Btn>
            <Btn href={PARTNER_RECEIPT_VERIFIER_PATH} variant="ghost" size="sm">
              Receipt verifier
            </Btn>
          </div>
        </ContentCard>
      )}

      <Btn href="/account" variant="ghost" size="sm">
        Back to account
      </Btn>
    </RedesignPage>
  );
}
