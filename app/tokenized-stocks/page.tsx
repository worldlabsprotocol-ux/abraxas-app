"use client";
// FILE: app/tokenized-stocks/page.tsx
// Robinhood / embedded finance — tokenized stocks integration pitch.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { BUILD_WITH_CAPABILITIES, TOKENIZED_STOCKS_PITCH } from "@/lib/infrastructurePositioning";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export default function TokenizedStocksPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Embedded finance · tokenized equities"
        title="Building tokenized stocks?"
        subtitle={TOKENIZED_STOCKS_PITCH}
      />

      <ContentCard title="Infrastructure, not another marketplace">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: 0 }}>
          If you are embedding stock tokens or RWAs into consumer applications, Abraxas is the trust layer you plug into —
          Passport, verification API, and reusable compliance — so every partner app does not rebuild KYC and asset diligence from scratch.
        </p>
      </ContentCard>

      <ContentCard title="What you get on day one">
        <BulletList items={[...BUILD_WITH_CAPABILITIES]} />
      </ContentCard>

      <ContentCard title="The integration loop">
        <BulletList items={[
          "Issuer or sponsor verifies asset scope once on-registry",
          "Your app reads Passport + policy decision via API",
          "Custodians, lenders, and secondary venues accept the same proof",
          "Users never re-upload the same ownership records",
        ]} />
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginBottom: "2rem" }}>
        <Btn href="/integrate" size="lg">Build with Abraxas →</Btn>
        <Btn href="/developers" variant="secondary" size="lg">Read docs →</Btn>
        <Btn href="/design-partner" variant="secondary" size="lg">Book integration →</Btn>
        <Link href="/integrate" style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--accent)", alignSelf: "center", textDecoration: "none" }}>
          Full integrate overview →
        </Link>
      </div>
    </RedesignPage>
  );
}
