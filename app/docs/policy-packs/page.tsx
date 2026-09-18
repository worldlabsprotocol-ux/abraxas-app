// FILE: app/docs/policy-packs/page.tsx
// Developer guide: policy pack → hosted verification → signed receipt → server verification.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { POLICY_PACK_LIST } from "@/lib/partner/launchpad/policyPacks";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function PolicyPacksDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Policy packs"
        title="Choose a pack, verify, then check the signed receipt"
        subtitle="Abraxas is reusable private eligibility infrastructure. A partner selects a narrow policy, hosts verification, and verifies a signed result. Google sign-in is not eligibility."
      />

      <ContentCard title="The loop">
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.65rem" }}>
          <li><strong>Policy pack.</strong> Pick a catalog pack in Partner Launchpad. Packs are declarative. They do not run partner code.</li>
          <li><strong>Hosted verification.</strong> Send the holder to <code style={{ fontFamily: MONO }}>/partner/verify</code> with your application slug and an allowlisted return URL.</li>
          <li><strong>Signed receipt.</strong> The callback carries <code style={{ fontFamily: MONO }}>receipt_id</code>, <code style={{ fontFamily: MONO }}>decision</code>, and <code style={{ fontFamily: MONO }}>status</code> only.</li>
          <li><strong>Server verification.</strong> Fetch the public receipt, check signature, partner, policy, expiry, revocation, and sandbox vs production before granting access.</li>
        </ol>
        <p style={{ ...body, marginTop: "0.85rem" }}>
          Self-service test harness cases use the same receipt trust evaluators. Failures stay failures. See <Link href="/developers/launchpad">Partner Launchpad</Link>.
        </p>
      </ContentCard>

      <ContentCard title="Catalog">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {POLICY_PACK_LIST.map((pack) => (
            <div key={pack.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.75rem" }}>
              <strong style={{ fontFamily: FONT }}>{pack.display_name}</strong>
              <p style={{ ...body, marginTop: "0.35rem" }}>{pack.holder_explanation}</p>
              <p style={{ ...body, marginTop: "0.35rem", fontSize: "0.75rem" }}>
                Partner receives {pack.disclosed_result}. Suitability: {pack.production_suitability.replace(/_/g, " ")}.
              </p>
            </div>
          ))}
        </div>
      </ContentCard>
    </RedesignPage>
  );
}
