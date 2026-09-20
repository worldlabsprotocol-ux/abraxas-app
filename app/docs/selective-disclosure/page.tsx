// FILE: app/docs/selective-disclosure/page.tsx
// Canonical selective-disclosure boundary. Not a second policy engine. Not ZK.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  SELECTIVE_DISCLOSURE_CRYPTOGRAPHY_NOTICE,
  SELECTIVE_DISCLOSURE_NOTICE,
} from "@/lib/privacy/selectiveDisclosure";
import { POLICY_PACK_LIST } from "@/lib/partner/launchpad/policyPacks";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function SelectiveDisclosureDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Privacy · Selective disclosure"
        title="Abraxas shares a policy result, not the evidence"
        subtitle={SELECTIVE_DISCLOSURE_NOTICE}
      />

      <ContentCard title="What is released">
        <p style={body}>
          Each catalog policy pack already names a partner-visible result and a withheld set.
          The server applies that disclosure profile before Holder briefs, consent previews,
          public receipts, Partner Kit responses, webhooks, Passport activity, Launchpad health
          summaries, and portable action-contract results. Partners keep the same minimal
          contracts they already use. Eligibility rules do not change.
        </p>
      </ContentCard>

      <ContentCard title="What is withheld">
        <p style={body}>
          Unless a pack’s existing approved contract specifically allows a field, the boundary
          forbids raw evidence, document or selfie material, legal name, email, date of birth,
          address, wallet addresses and public keys, OAuth or session material, provider payloads,
          raw database errors, and internal policy implementation details. Public receipts, Partner
          Kit, and webhooks keep receipt identifiers and signatures because those existing contracts
          already include them. Holder, Passport, and action-contract JSON do not.
        </p>
      </ContentCard>

      <ContentCard title="Catalog packs">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          {POLICY_PACK_LIST.map((pack) => (
            <li key={pack.id}>
              <code style={{ fontFamily: MONO }}>{pack.id}</code>
              {" — "}
              {pack.disclosed_result}. Withheld: {pack.partner_does_not_receive.join(", ")}.
            </li>
          ))}
        </ul>
      </ContentCard>

      <ContentCard title="Not zero-knowledge cryptography">
        <p style={body}>{SELECTIVE_DISCLOSURE_CRYPTOGRAPHY_NOTICE}</p>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Sandbox-only packs remain unmistakably not Production-usable. Browser-supplied
          disclosure profiles, claim allowlists, policy versions, environments, receipts, keys,
          callbacks, approvals, and Production flags are rejected.
        </p>
      </ContentCard>

      <ContentCard title="Related">
        <p style={body}>
          <Link href="/developers/integration-studio">Integration Studio</Link>
          {" · "}
          <Link href="/docs/passport-spec">Passport</Link>
          {" · "}
          <Link href="/docs/partner-flow">Partner Flow</Link>
          {" · "}
          <Link href="/docs/portable-action-contract">Portable action contract</Link>
          {" · "}
          <Link href="/docs/policy-packs">Policy packs</Link>
        </p>
      </ContentCard>
      <PublicJourneyNextSteps />
    </RedesignPage>
  );
}
