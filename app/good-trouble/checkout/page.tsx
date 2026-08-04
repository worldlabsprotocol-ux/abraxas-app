// FILE: app/good-trouble/checkout/page.tsx
// Good Trouble regulated retail checkout — canonical Abraxas partner-verification entry.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { GoodTroubleRetailCheckoutCTA } from "@/components/goodTrouble/GoodTroubleRetailCheckoutCTA";
import { GOOD_TROUBLE_BRAND, GOOD_TROUBLE_PILOT_DISCLAIMER } from "@/lib/goodTrouble/constants";

export default function GoodTroubleCheckoutPage() {
  return (
    <RedesignPage maxWidth={640}>
      <PageHeader
        eyebrow="Good Trouble · Regulated retail"
        title="Checkout verification"
        subtitle={`${GOOD_TROUBLE_BRAND.name} uses Abraxas Passport for age-gated retail eligibility in ${GOOD_TROUBLE_BRAND.location}.`}
      />
      <p
        style={{
          fontFamily: "'Inter',system-ui,sans-serif",
          fontSize: "0.72rem",
          color: "var(--text-muted)",
          lineHeight: 1.6,
          margin: "0 0 1rem",
        }}
      >
        {GOOD_TROUBLE_PILOT_DISCLAIMER}
      </p>
      <GoodTroubleRetailCheckoutCTA />
    </RedesignPage>
  );
}
