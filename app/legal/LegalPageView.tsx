"use client";
// FILE: app/legal/LegalPageView.tsx

import Link from "next/link";
import { AbxAlert, AbxCard } from "@/components/design/AbxPrimitives";
import { AbxInnerPage } from "@/components/design/AbxInnerPage";
import { ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;

const SECTIONS = [
  {
    assetClass: "Music and IP royalties",
    structure: "Royalty assignment agreement",
    description:
      "When an artist or rights holder registers a music catalog, Abraxas operates under a limited royalty assignment. This standard music industry instrument assigns collection rights for a defined period without transferring ownership of the underlying masters or publishing.",
    ownership: "Artist or label retains full ownership of masters and publishing. Abraxas holds collection rights only during the operating period.",
    enforcement:
      "Royalty assignment is governed by applicable music licensing law. PRO registrations remain with the original rights holder. Abraxas cannot block or redirect payments outside the platform.",
    jurisdiction: "United States primary. Registration through DistroKid, UnitedMasters, or direct PRO affiliation.",
    tokenRole: "Token position represents the vault position share. It is not a security and does not convey ownership of the underlying catalog.",
    status: "Framework defined. SPV formation in progress. Current beta vaults operate under informal royalty assignment pending full legal structure.",
  },
  {
    assetClass: "Real estate",
    structure: "Fractional lease assignment or SPV",
    description:
      "For income producing real estate, Abraxas operates under a lease assignment that directs rental income to the vault during the operating period. For larger CRE positions, an SPV structure holds the property management agreement.",
    ownership: "Property owner retains full title. Abraxas holds income assignment rights only.",
    enforcement: "Lease assignment recorded with property management company. Income flows directly from tenant or property manager to vault wallet.",
    jurisdiction: "State specific. Depends on property location.",
    tokenRole: "Token position represents vault share backed by rental income stream. Not a security. Not a deed or equity interest.",
    status: "Framework defined. Current real estate vault operates in simulation. Live income assignment pending beta graduation.",
  },
  {
    assetClass: "Receivables and invoices",
    structure: "Invoice factoring agreement",
    description:
      "Receivables vaults operate under a standard invoice factoring structure where outstanding invoices are assigned to the platform in exchange for immediate liquidity.",
    ownership: "Invoice originator receives advance payment. Abraxas collects against the invoice and retains the factoring spread upon settlement.",
    enforcement: "UCC Article 9 security interest filed against assigned receivables.",
    jurisdiction: "United States UCC. Cross border receivables handled case by case.",
    tokenRole: "Token position represents the vault factoring pool share. Not a security.",
    status: "Framework defined. Current receivables vault operates in simulation pending beta graduation.",
  },
] as const;

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <p style={{ fontFamily: FONT, fontSize: "0.82rem", lineHeight: 1.65, color: "var(--text-secondary)", margin: "0 0 0.5rem" }}>
      <strong style={{ color: "var(--text-primary)" }}>{label}: </strong>
      {value}
    </p>
  );
}

export function LegalPageView() {
  return (
    <AbxInnerPage
      accent="legal"
      eyebrow="Legal"
      title="Legal overview"
      lead="How Abraxas handles the relationship between off chain assets and their on chain representations. For asset originators evaluating whether to commit real assets, this page answers the legal structure question."
      maxWidth={780}
    >
      <AbxAlert tone="warning" title="Beta disclaimer">
        Abraxas is in beta. The legal structures described below represent the intended operational framework. Not all structures are fully executed. Consult independent legal counsel before committing assets. This is not legal advice.
      </AbxAlert>

      {SECTIONS.map((section) => (
        <AbxCard key={section.assetClass} accent="legal">
          <h2 style={{ fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800, margin: "0 0 0.35rem", color: "var(--text-primary)" }}>
            {section.assetClass}
          </h2>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--abx-accent)", margin: "0 0 0.75rem", fontWeight: 600 }}>
            {section.structure}
          </p>
          <Detail label="Description" value={section.description} />
          <Detail label="Ownership" value={section.ownership} />
          <Detail label="Enforcement" value={section.enforcement} />
          <Detail label="Jurisdiction" value={section.jurisdiction} />
          <Detail label="Token role" value={section.tokenRole} />
          <Detail label="Status" value={section.status} />
        </AbxCard>
      ))}

      <AbxCard accent="legal">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", lineHeight: 1.65, color: "var(--text-secondary)", margin: 0 }}>
          Read the full{" "}
          <Link href="/legal/terms" style={{ color: "var(--abx-accent)", fontWeight: 600, textDecoration: "none" }}>terms of service</Link>
          {" "}and{" "}
          <Link href="/legal/privacy" style={{ color: "var(--abx-accent)", fontWeight: 600, textDecoration: "none" }}>privacy policy</Link>.
        </p>
      </AbxCard>
    </AbxInnerPage>
  );
}
