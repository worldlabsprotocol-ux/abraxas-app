import type { Metadata } from "next";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { CurrentStatusModule } from "@/components/status/CurrentStatusModule";
import { INTEGRATE_COUNTERPARTY_TRUST } from "@/lib/trustTransfer";
import { PRODUCTION_STATUS_HEADLINE } from "@/lib/currentStatus";

export const metadata: Metadata = {
  title: "Integrate — Abraxas",
  description:
    "Accept Abraxas Passport proof in your app. Core verification is live in production — we are finalizing the remaining gates for full open mainnet.",
};

export default function IntegratePage() {
  return (
    <RedesignPage maxWidth={880}>
      <PageHeader
        eyebrow="For builders & partners"
        title="Integrate Abraxas verification"
        subtitle={PRODUCTION_STATUS_HEADLINE}
      />

      <ContentCard title="What you get today">
        <BulletList items={[
          "Cryptographic verification — counterparties verify credentials independently, without calling Abraxas for every check",
          "Verify once, reuse while valid — not trust forever. Material changes trigger refresh or revocation",
          "Production proof — Cielo Sunrise and land deals run on Abraxas verification with real assets",
        ]} />
      </ContentCard>

      <div id="counterparty-trust">
        <ContentCard title={INTEGRATE_COUNTERPARTY_TRUST.title}>
          <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.85rem" }}>
            {INTEGRATE_COUNTERPARTY_TRUST.headline}
          </p>
          <BulletList items={[...INTEGRATE_COUNTERPARTY_TRUST.bullets]} />
          <p style={{ fontSize: "0.78rem", margin: "0.85rem 0 0" }}>
            <Link href="/trust-framework#trust-over-time" style={{ color: "#10B981", fontWeight: 700, textDecoration: "none" }}>
              How verification stays current over time →
            </Link>
          </p>
        </ContentCard>
      </div>

      <CurrentStatusModule />

      <ContentCard title="Start integrating">
        <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.85rem" }}>
          Partner integrations are live today. Full self-serve onboarding opens after the final mainnet gates.
          Reach out to scope your use case.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/partners" size="sm">Contact us →</Btn>
          <Btn href="/developers" variant="secondary" size="sm">Developer docs →</Btn>
          <Btn href="/trust-framework" variant="ghost" size="sm">Trust framework →</Btn>
        </div>
      </ContentCard>
    </RedesignPage>
  );
}
