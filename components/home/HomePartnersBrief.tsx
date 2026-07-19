"use client";
// FILE: components/home/HomePartnersBrief.tsx

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { ConceptDemoLead, ConceptDemoVideo } from "@/components/home/ConceptDemoVideo";
import { IndependentVerifyCinematicDemo } from "@/components/home/cinematic/IndependentVerifyCinematicDemo";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function HomePartnersBrief() {
  return (
    <section style={{
      padding: "clamp(2rem, 5vw, 3rem) 0",
      borderTop: "1px solid var(--border-strong)",
    }} aria-labelledby="partners-heading">
      <ConceptDemoLead
        eyebrow="Built for relying parties"
        headingId="partners-heading"
        title="Partners receive the minimum proof their policy requires"
        body="No passports, selfies, biometrics, or document folders by default — only the claims the policy needs."
      />

      <ConceptDemoVideo demo={IndependentVerifyCinematicDemo} compact id="partners-demo" />

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 1rem" }}>
        Partner integrations are pilot-ready for approved organizations.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/design-partner" variant="secondary" size="sm">Become a relying party →</Btn>
        <Link href="/integrate" style={{
          fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: "var(--accent)",
          alignSelf: "center", textDecoration: "none",
        }}>
          Integrate Abraxas →
        </Link>
      </div>
    </section>
  );
}
