"use client";

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { WelcomeStartSandboxFlow } from "@/components/account/WelcomeStartSandboxFlow";

export default function WelcomePage() {
  return (
    <RedesignPage accent="developer" maxWidth={720}>
      <PageHeader
        eyebrow="Abraxas"
        title="Welcome to Abraxas"
        subtitle="Verification infrastructure built around privacy. Sign in only when a protected operation requires it."
      />

      <ContentCard title="Explore verification">
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Public product exploration and policy previews — no Google sign-in, wallet, or personal identity required.
        </p>
        <Btn href="/try" size="sm">
          Explore verification
        </Btn>
      </ContentCard>

      <ContentCard title="Start sandbox">
        <WelcomeStartSandboxFlow />
      </ContentCard>

      <ContentCard title="Open Passport">
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Holder credentials and policy-specific verification — only when you choose to verify or share evidence.
        </p>
        <Btn href="/passport" size="sm">
          Open Passport
        </Btn>
      </ContentCard>
    </RedesignPage>
  );
}
