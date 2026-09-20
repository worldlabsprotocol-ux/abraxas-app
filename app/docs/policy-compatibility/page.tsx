// FILE: app/docs/policy-compatibility/page.tsx
// Reviewed compatibility-edge registry. Not automatic equivalence, KYC, or ZK.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import { POLICY_COMPATIBILITY_NOTICE } from "@/lib/policy/compatibilityEdge";
import { productionActiveEdgeCount } from "@/lib/policy/compatibilityEdge";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function PolicyCompatibilityDocsPage() {
  const activeProduction = productionActiveEdgeCount();
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Privacy · Policy compatibility"
        title="Reuse across versions only through a reviewed edge"
        subtitle={POLICY_COMPATIBILITY_NOTICE}
      />

      <ContentCard title="Exact-match reuse">
        <p style={body}>
          A current, unexpired, unrevoked reusable eligibility fact may satisfy a later request
          for the <strong>same policy pack and version</strong>. The server decides compatibility.
          Hosted Partner Flow shows a reuse option only after that confirmation. Selecting reuse
          does not issue a result.
        </p>
      </ContentCard>

      <ContentCard title="Reviewed continuity">
        <p style={body}>
          Cross-version or cross-pack reuse is allowed only when one <strong>active</strong>{" "}
          registry edge matches the source and target exactly: pack, version, assurance,
          method category, result category, disclosure boundary, and environment. Edges are
          server-owned source. Browsers, partners, and holders cannot create, edit, select, or
          override them. Compatibility is never transitive: A→B and B→C do not imply A→C.
        </p>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          This catalog currently publishes{" "}
          <code style={{ fontFamily: MONO }}>{activeProduction}</code> active Production
          cross-version edges. Planning successors are not live continuity.
        </p>
      </ContentCard>

      <ContentCard title="No automatic equivalence">
        <p style={body}>
          The server does not infer equivalence from labels, categories, version numbers,
          action names, or client input. Age, residency, membership, identity, sandbox,
          trading, payment, and custom-policy packs are not interchangeable because they
          look similar.
        </p>
      </ContentCard>

      <ContentCard title="Fresh consent">
        <p style={body}>
          Every derived partner-bound result still requires explicit holder consent for that
          request. Passport activity stays source-private: it never lists future partners,
          source receipts, fact IDs, edge IDs, or compatibility history.
        </p>
      </ContentCard>

      <ContentCard title="Sandbox and Production">
        <p style={body}>
          A sandbox or test fact never satisfies a Production policy, even if a fixture edge
          tries to say otherwise. Production facts may be used in sandbox only when the same
          pack and version (or a reviewed edge that names that environment pair) already
          qualifies.
        </p>
      </ContentCard>

      <ContentCard title="Holder withdrawal">
        <p style={body}>
          Withdrawing the source receipt revokes the internal fact and invalidates already-derived
          partner receipts for future checks, as defined by the reusable eligibility lifecycle.
        </p>
      </ContentCard>

      <ContentCard title="Not compliance theater">
        <p style={body}>
          This registry is an engineering governance control. It is not legal compliance, KYC
          equivalence, a license, or a zero-knowledge proof. Selective disclosure remains the
          authority for every partner and client payload.
        </p>
      </ContentCard>

      <ContentCard title="Related">
        <p style={body}>
          <Link href="/docs/reusable-eligibility">Reusable eligibility</Link>
          {" · "}
          <Link href="/docs/selective-disclosure">Selective disclosure</Link>
          {" · "}
          <Link href="/docs/partner-flow">Partner Flow</Link>
          {" · "}
          <Link href="/docs/policy-packs">Policy packs</Link>
          {" · "}
          <Link href="/developers/integration-studio">Integration Studio</Link>
          {" · "}
          <Link href="/developers/launchpad">Policy Version Planner</Link>
        </p>
      </ContentCard>
      <PublicJourneyNextSteps />
    </RedesignPage>
  );
}
