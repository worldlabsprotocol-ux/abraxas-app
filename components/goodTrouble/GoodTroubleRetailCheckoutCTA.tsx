"use client";
// FILE: components/goodTrouble/GoodTroubleRetailCheckoutCTA.tsx
// Regulated retail verification entry — links into the canonical Abraxas partner flow.

import { Btn } from "@/components/redesign/ui";
import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import {
  goodTroubleProductionReturnUrl,
  goodTroubleProductionVerifyUrl,
} from "@/lib/goodTrouble/partnerIntegration";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function GoodTroubleRetailCheckoutCTA() {
  const verifyUrl = goodTroubleProductionVerifyUrl();
  const returnUrl = goodTroubleProductionReturnUrl();

  return (
    <section
      aria-labelledby="gt-retail-checkout-heading"
      style={{
        padding: "1.25rem",
        borderRadius: 16,
        border: "1px solid var(--border-strong)",
        background: "var(--surface-raised)",
      }}
    >
      <h2
        id="gt-retail-checkout-heading"
        style={{
          fontFamily: FONT,
          fontSize: "1.1rem",
          fontWeight: 800,
          color: "var(--text-primary)",
          margin: "0 0 0.5rem",
        }}
      >
        Verify to complete your purchase
      </h2>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.82rem",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          margin: "0 0 1rem",
          maxWidth: 520,
        }}
      >
        Missouri regulated retail requires age and identity verification through Abraxas Passport.
        You will return here after verification with a signed session receipt.
      </p>
      <div
        style={{
          fontFamily: "'JetBrains Mono','SF Mono',ui-monospace,monospace",
          fontSize: "0.58rem",
          color: "var(--text-muted)",
          marginBottom: "1rem",
          lineHeight: 1.6,
        }}
      >
        partner_id={GOOD_TROUBLE_PARTNER_ID} · policy_id={GOOD_TROUBLE_RETAIL_POLICY_ID}
        <br />
        return_url={returnUrl}
      </div>
      <Btn href={verifyUrl} size="sm">
        Continue with Abraxas →
      </Btn>
    </section>
  );
}
