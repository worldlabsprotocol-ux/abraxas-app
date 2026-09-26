"use client";
// FILE: components/goodTrouble/GoodTroubleRetailCheckoutCTA.tsx
// Plain-language sandbox entry into the canonical Abraxas partner flow.

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
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const STEPS = [
  "Continue to your Abraxas Passport",
  "Confirm the required verified information",
  "Return with a signed eligibility result",
] as const;

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
      <p style={{
        fontFamily: FONT,
        fontSize: "0.7rem",
        fontWeight: 800,
        color: "#A5B4FC",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        margin: "0 0 0.35rem",
      }}>
        Sandbox verification
      </p>
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
        Prove you are 21+ without sharing your birth date
      </h2>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.82rem",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          margin: "0 0 0.9rem",
          maxWidth: 520,
        }}
      >
        Good Trouble receives only the eligibility result needed for this sandbox flow. Your identity documents stay with Abraxas.
      </p>

      <ol style={{ listStyle: "none", margin: "0 0 1rem", padding: 0, display: "grid", gap: "0.5rem" }}>
        {STEPS.map((step, index) => (
          <li
            key={step}
            style={{
              display: "grid",
              gridTemplateColumns: "1.6rem minmax(0, 1fr)",
              gap: "0.55rem",
              alignItems: "center",
              fontFamily: FONT,
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "1.5rem",
                height: "1.5rem",
                borderRadius: "999px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(94,234,212,0.12)",
                color: "#5EEAD4",
                fontWeight: 800,
                fontSize: "0.72rem",
              }}
            >
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <Btn href={verifyUrl} size="lg" fullWidth>
        Continue with Abraxas →
      </Btn>

      <details style={{ marginTop: "0.8rem" }}>
        <summary style={{
          fontFamily: FONT,
          fontSize: "0.72rem",
          color: "var(--text-muted)",
          cursor: "pointer",
        }}>
          Technical details
        </summary>
        <div style={{
          fontFamily: MONO,
          fontSize: "0.58rem",
          color: "var(--text-muted)",
          marginTop: "0.45rem",
          lineHeight: 1.6,
          overflowWrap: "anywhere",
        }}>
          partner_id={GOOD_TROUBLE_PARTNER_ID} · policy_id={GOOD_TROUBLE_RETAIL_POLICY_ID}
          <br />
          return_url={returnUrl}
        </div>
      </details>
    </section>
  );
}
