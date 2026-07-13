// FILE: app/about/page.tsx
// What is actually true today — no fabricated traction.

import type { Metadata } from "next";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_CATEGORY, ABRAXAS_ONE_LINER, ABRAXAS_POSITIONING, ABRAXAS_TAGLINE } from "@/lib/northStar";
import { partnersActiveCount } from "@/lib/partnerStatus";

export const metadata: Metadata = {
  title: "About Abraxas",
  description:
    "Abraxas is the trust infrastructure layer from World Labs — reusable verification for assets, businesses, and people.",
  openGraph: {
    title: "About Abraxas",
    description: ABRAXAS_ONE_LINER,
    type: "website",
  },
};

const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

export default function AboutPage() {
  const partnerCount = partnersActiveCount();

  return (
    <RedesignPage maxWidth={760}>
      <div style={{ paddingBottom: "2.5rem" }}>
        <p style={{
          fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: "#10B981", marginBottom: "0.5rem",
        }}>
          {ABRAXAS_CATEGORY}
        </p>
        <h1 style={{
          fontFamily: FONT, fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 900,
          letterSpacing: "-0.03em", lineHeight: 1.1,
          color: "var(--text-primary)", margin: "0 0 1rem",
        }}>
          About Abraxas
        </h1>
        <p style={{ fontFamily: FONT, fontSize: "0.92rem", color: "var(--text-primary)", lineHeight: 1.65, margin: "0 0 0.35rem" }}>
          {ABRAXAS_POSITIONING}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: ACCENT, fontWeight: 700, margin: "0 0 0.75rem" }}>
          {ABRAXAS_TAGLINE}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1.5rem" }}>
          Abraxas is built by World Labs Protocol. We eliminate repeated verification so assets,
          people, and businesses can move faster — not another identity protocol, not a tokenization headline.
        </p>

        <Section title="What is live today">
          <ul style={listStyle}>
            <li>Public asset registry — browse Cielo Sunrise, Smyrna Townhome, and Naj Tulum without login</li>
            <li>Cielo Sunrise genesis pilot — World Labs–owned hospitality asset, $1.1M independent appraisal on record</li>
            <li>USDC-on-Sui settlement rail for the Cielo reference booking flow (pilot)</li>
            <li>Abraxas Passport — Google sign-in, wallet binding, consent receipts, reusable proof</li>
            {partnerCount > 0 && (
              <li>{partnerCount} active design partner{partnerCount === 1 ? "" : "s"} — names published when approved</li>
            )}
          </ul>
        </Section>

        <Section title="Cielo Sunrise — genesis dogfood">
          <p style={bodyStyle}>
            Cielo Sunrise is our owned proof point: a live short-term rental in Mineral Bluff, Georgia,
            with public assurance metrics, registry record ABX-RE-HOSP-001, and the reference loop
            partners integrate against. It is a pilot — not a claim that every workflow is production-scale yet.
          </p>
          <Btn href="/flagship" size="sm" variant="secondary">View Cielo asset →</Btn>
        </Section>

        <Section title="Registry">
          <p style={bodyStyle}>
            Verified assets publish assurance levels (L1–L4) with honest scope labels. Numbers on cards
            come from appraisals, public records, or owner statements — each labeled on the asset detail page.
          </p>
          <Btn href="/#registry" size="sm" variant="secondary">Browse registry →</Btn>
        </Section>

        <Section title="Partners">
          <p style={{ ...bodyStyle, marginBottom: "0.75rem" }}>
            Real relying parties and design partners are in final execution. We name them publicly only
            with approval — the program remains open for selective future slots.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Btn href="/design-partner" size="sm">Design partners →</Btn>
            <Btn href="/integrations" size="sm" variant="secondary">Integrations →</Btn>
          </div>
        </Section>

        <div style={{ marginTop: "2rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/passport" size="lg">Get verified once →</Btn>
          <Link href="/about/team" style={{ fontFamily: FONT, fontSize: "0.82rem", color: "#10B981", alignSelf: "center", textDecoration: "none" }}>
            Team →
          </Link>
        </div>
      </div>
    </RedesignPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2 style={{
        fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800,
        color: "var(--text-primary)", margin: "0 0 0.65rem",
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

const bodyStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: "0 0 0.75rem",
};

const listStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.75,
  margin: 0,
  paddingLeft: "1.15rem",
};
