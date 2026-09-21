// FILE: app/docs/policy-release-candidates/page.tsx

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type { CSSProperties } from "react";
import { POLICY_RC_NOTICE } from "@/lib/partner/policyReleaseCandidate/contract";

const FONT = ABRAXAS_FONT_SANS;
const body: CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function PolicyReleaseCandidatesDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Operators · Policy release candidates"
        title="Turn an accepted proposal into a reviewable candidate"
        subtitle={POLICY_RC_NOTICE}
      />
      <ContentCard title="Path">
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.35rem" }}>
          <li>Partner proposal — structured eligibility gate. Not a policy.</li>
          <li>Operator release candidate — server-owned specification and contract fixtures.</li>
          <li>Reviewed catalog PR — a separately reviewed source-code change publishes any pack or version.</li>
          <li>Sandbox validation — Studio, Starter Kit, and Partner Flow stay on the existing catalog until that PR merges.</li>
          <li>Reviewed Production adoption — Launchpad Policy Version Planner and Production review, never auto-promotion.</li>
        </ol>
      </ContentCard>
      <ContentCard title="Lifecycle">
        <p style={body}>
          Draft → Ready for review → Needs revision → Approved for catalog PR → Superseded.
          Approved for catalog PR is still not a live policy. Abraxas does not auto-publish policy
          logic and does not turn a proposal into a live compliance decision.
        </p>
      </ContentCard>
      <ContentCard title="Where this lives">
        <p style={body}>
          <Link href="/docs/policy-proposals">Policy proposals</Link>
          {" · "}
          <Link href="/docs/policy-packs">Policy packs</Link>
          {" · "}
          <Link href="/docs/selective-disclosure">Selective disclosure</Link>
          {" · "}
          <Link href="/docs/policy-compatibility">Compatibility edges</Link>
          {" · "}
          <Link href="/developers/integration-studio">Policy Fit</Link>
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
