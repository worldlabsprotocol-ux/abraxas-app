// FILE: app/docs/reclaim-private-attestations/page.tsx

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { RECLAIM_ATTESTATION_NOTICE, RECLAIM_HOLDER_COPY } from "@/lib/reclaimAttestation/contract";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function ReclaimPrivateAttestationsDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Protocol · Private attestations"
        title="Reclaim private attestation adapter"
        subtitle={RECLAIM_ATTESTATION_NOTICE}
      />
      <ContentCard title="What this is">
        <p style={body}>
          This is the first real issuer connector. A holder completes a Reclaim proof. Abraxas
          verifies it on the server, maps one approved result into the existing policy path, then
          continues fresh consent and a partner-bound receipt. It is not a generic identity product,
          a browser-side verifier, a provider marketplace, a raw-proof store, or an onchain proof
          submission path.
        </p>
      </ContentCard>
      <ContentCard title="Holder copy">
        <p style={body}>{RECLAIM_HOLDER_COPY} Google remains account access only.</p>
      </ContentCard>
      <ContentCard title="Backend callback contract">
        <p style={body}>
          Reclaim posts to the allowlisted Abraxas route <code>/api/reclaim/callback</code>. Partners
          never host this callback and never receive the raw proof. Session context is an opaque
          Abraxas session reference. The browser receives only the signed request configuration
          needed to launch the provider flow. App secrets stay on the server.
        </p>
      </ContentCard>
      <ContentCard title="What is persisted">
        <p style={body}>
          Opaque session reference, HMAC bindings, mapping id, source-controlled provider id and
          version, policy-result class, proof digest, timestamps, and lifecycle status. Raw proof
          JSON, extracted values, source website data, signatures, TEE material, emails, names,
          dates of birth, wallets, callback URLs, and app secrets are never stored or returned.
        </p>
      </ContentCard>
      <ContentCard title="Where this connects">
        <p style={body}>
          <Link href="/docs/verification-issuer-trust">Issuer trust</Link>
          {" · "}
          <Link href="/docs/policy-release-candidates">Release candidates</Link>
          {" · "}
          <Link href="/docs/selective-disclosure">Selective disclosure</Link>
          {" · "}
          <Link href="/docs/reusable-eligibility">Reusable eligibility</Link>
          {" · "}
          <Link href="/docs/partner-flow">Partner Flow</Link>
          {" · "}
          <Link href="/docs/hosted-partner-flow-handoff">Hosted Partner Flow</Link>
          {" · "}
          <Link href="/docs/starter-kit">Starter kits</Link>
        </p>
      </ContentCard>
      <PublicJourneyNextSteps />
    </RedesignPage>
  );
}
