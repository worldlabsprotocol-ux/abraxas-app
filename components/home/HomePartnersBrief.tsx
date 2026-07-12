"use client";
// FILE: components/home/HomePartnersBrief.tsx
// Issuers + partner wedge — verification first, integrations second.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function HomePartnersBrief() {
  return (
    <>
      <section style={{
        padding: "clamp(1.5rem, 4vw, 2rem) 0",
        borderTop: "1px solid var(--border-strong)",
      }} aria-labelledby="issuers-heading">
        <h2 id="issuers-heading" style={{
          fontFamily: FONT, fontSize: "var(--fs-h3)", fontWeight: 800,
          letterSpacing: "-0.02em", color: "var(--text-primary)",
          margin: "0 0 0.5rem", maxWidth: 520,
        }}>
          For asset & business owners
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
          lineHeight: 1.65, maxWidth: 520, margin: "0 0 1rem",
        }}>
          Verification comes first — tokenization and partner access follow once your record is live.
          List when you are ready; the Cielo pilot shows the guest-facing loop today.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <Btn href="/design-partner" variant="secondary" size="sm">Become a design partner →</Btn>
          <Btn href="/build" variant="ghost" size="sm">List your asset →</Btn>
          <Link href="/case-studies/cielo" style={{
            fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: ACCENT,
            textDecoration: "none",
          }}>
            See Cielo case study →
          </Link>
        </div>
      </section>

      <section style={{
        padding: "clamp(1.5rem, 4vw, 2rem) 0",
        borderTop: "1px solid var(--border-strong)",
      }} aria-labelledby="partners-heading">
        <h2 id="partners-heading" style={{
          fontFamily: FONT, fontSize: "var(--fs-h3)", fontWeight: 800,
          letterSpacing: "-0.02em", color: "var(--text-primary)",
          margin: "0 0 0.5rem", maxWidth: 520,
        }}>
          Ask for the eligibility decision — not the customer&apos;s document folder.
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
          lineHeight: 1.65, maxWidth: 520, margin: "0 0 1rem",
        }}>
          Design partners are in final onboarding. Integrate once — every future credential becomes reusable.
          Cielo shows the reference loop today.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/integrations" variant="secondary" size="sm">Integrations →</Btn>
          <Link href="/docs" style={{
            fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: ACCENT,
            alignSelf: "center", textDecoration: "none",
          }}>
            Documentation →
          </Link>
        </div>
      </section>
    </>
  );
}
