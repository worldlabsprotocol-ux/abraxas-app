// FILE: app/docs/policy-proposals/page.tsx

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type { CSSProperties } from "react";
import { POLICY_PROPOSAL_NOTICE } from "@/lib/partner/policyProposal/contract";

const FONT = ABRAXAS_FONT_SANS;
const body: CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function PolicyProposalsDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Partners · Policy proposals"
        title="Propose the eligibility gate you need"
        subtitle={POLICY_PROPOSAL_NOTICE}
      />
      <ContentCard title="Lifecycle">
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.35rem" }}>
          <li>Draft or submit structured choices from Launchpad or Integration Studio.</li>
          <li>Submitted — Abraxas received the proposal. No policy exists yet.</li>
          <li>Needs information — the operator asks for a clearer product action or result.</li>
          <li>Under review — an operator is reading the sanitized proposal.</li>
          <li>Accepted for policy work — backlog only. A human still has to write a separately reviewed catalog change.</li>
          <li>Declined — the request is closed. Use Policy Fit or Design Partner if a current pack is close.</li>
        </ol>
      </ContentCard>
      <ContentCard title="What acceptance is not">
        <p style={body}>
          Accepted proposals are not live policy changes. They do not publish a pack, bump a version,
          write a compatibility edge, issue a credential, or activate Mainnet.
        </p>
      </ContentCard>
      <ContentCard title="Where to go next">
        <p style={body}>
          <Link href="/developers/integration-studio">Policy Fit</Link>
          {" · "}
          <Link href="/developers/launchpad">Partner Launchpad</Link>
          {" · "}
          <Link href="/docs/starter-kit">Starter Kit</Link>
          {" · "}
          <Link href="/docs/partner-flow">Partner Flow</Link>
          {" · "}
          <Link href="/design-partner">Design Partner</Link>
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
