"use client";
// FILE: components/goodTrouble/GoodTroubleRetailCheckoutCTA.tsx
// Plain-language sandbox entry into the canonical Abraxas partner flow.

import { Btn } from "@/components/redesign/ui";
import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import {
  goodTroubleReturnUrl,
  goodTroubleVerifyUrl,
} from "@/lib/goodTrouble/partnerIntegration";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function GoodTroubleRetailCheckoutCTA() {
  // This component runs in the browser so both verification and callback stay
  // on the host the visitor opened (demo, preview, local, or production).
  const verifyUrl = goodTroubleVerifyUrl();
  const returnUrl = goodTroubleReturnUrl();

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
        Confirm 21+ privately
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
        Good Trouble receives an approved or not approved result. Your birth date and identity documents stay private.
      </p>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.45rem",
        margin: "0 0 1rem",
      }}>
        {["About 60 seconds", "Sandbox", "Passport sign-in"].map((label) => (
          <span key={label} style={{
            padding: "0.35rem 0.6rem",
            borderRadius: 999,
            border: "1px solid rgba(94,234,212,0.2)",
            background: "rgba(94,234,212,0.07)",
            color: "var(--text-secondary)",
            fontFamily: FONT,
            fontSize: "0.7rem",
            fontWeight: 700,
          }}>
            {label}
          </span>
        ))}
      </div>

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
