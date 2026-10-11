import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { PUBLIC_DEMO_ORIGIN } from "@/lib/product/publicOrigin";
import { CIELO_LIMITS_PLAIN, GOOD_TROUBLE_LIMITS_PLAIN } from "@/lib/product/productStoryCopy";

const FONT = "'Inter',system-ui,sans-serif";

export const metadata = {
  title: "Live partner journey · Abraxas",
  description: "What can be tested authentically on Demo versus simulated tour surfaces.",
};

export default function LivePartnerJourneyPage() {
  return (
    <RedesignPage accent="developer" maxWidth={880}>
      <PageHeader
        eyebrow="Partner evaluation"
        title="Authentic end-to-end journey (Demo)"
        subtitle="Use the public Demo origin for real Phantom wallet sessions. The judge tour remains simulated and is not a substitute for this path."
      />

      <ContentCard title="What Abraxas does">
        <p style={{ fontFamily: FONT, fontSize: "0.84rem", lineHeight: 1.65, color: "var(--text-secondary)", margin: "0 0 0.75rem" }}>
          Abraxas verifies qualifying evidence once, obtains explicit holder consent, and returns a signed eligibility answer —
          not raw identity documents — to the requesting partner.
        </p>
        <BulletList items={[
          "Verify once · share only the answer · reuse when policy and freshness allow",
          "Server-side receipt verification and continuous validity (signature ≠ permanent trust)",
          "Production partner access requires reviewed Launchpad activation",
        ]} />
      </ContentCard>

      <ContentCard title="Approved nonproduction entry">
        <p style={{ fontFamily: FONT, fontSize: "0.84rem", lineHeight: 1.65, color: "var(--text-secondary)", margin: "0 0 0.75rem" }}>
          Public Demo host (no Vercel SSO on preview): <strong>{PUBLIC_DEMO_ORIGIN}</strong>
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href={`${PUBLIC_DEMO_ORIGIN}/passport`} size="sm">Open Passport (Demo)</Btn>
          <Btn href={`${PUBLIC_DEMO_ORIGIN}/cielo/verified-rate`} variant="secondary" size="sm">Cielo verified-rate</Btn>
          <Btn href="/experience/tour" variant="ghost" size="sm">Simulated judge tour</Btn>
        </div>
      </ContentCard>

      <ContentCard title="Recommended first partner path — Cielo">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", lineHeight: 1.65, color: "var(--text-secondary)", margin: "0 0 0.65rem" }}>
          {CIELO_LIMITS_PLAIN}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
          Cielo v1 emphasizes account, profile, and fresh wallet binding with optional identity — a clearer Demo path than
          Good Trouble L2 age-21 IDV when Veriff credentials are limited. Good Trouble remains second once L2 evidence is available.
        </p>
      </ContentCard>

      <ContentCard title="Good Trouble (second)">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", lineHeight: 1.65, color: "var(--text-secondary)", margin: 0 }}>
          {GOOD_TROUBLE_LIMITS_PLAIN} L2 policies require verified evidence — self-attestation cannot substitute.
        </p>
      </ContentCard>

      <ContentCard title="What is simulated">
        <BulletList items={[
          "/experience/tour — labeled simulation, no real credentials",
          "Partner verify ?preview_phase=… — UI fixtures only (local/CI)",
          "On-chain commitments — only when Demo feature flags and schema are active",
        ]} />
      </ContentCard>

      <ContentCard title="Data never shared with partners">
        <BulletList items={[
          "Government ID images, biometrics, full legal name, email (unless partner collects separately)",
          "Date of birth to Good Trouble (21+ answer only)",
          "Private keys or wallet seed material",
        ]} />
      </ContentCard>

      <ContentCard title="Request a technical integration discussion">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", lineHeight: 1.65, color: "var(--text-secondary)", margin: "0 0 0.75rem" }}>
          Use Integration Studio and Partner Launchpad for sandbox keys. Production activation stays on the reviewed path.
        </p>
        <Btn href="/developers/integration-studio" size="sm">Integration Studio</Btn>
        <Btn href="/developers/launchpad" variant="secondary" size="sm">Partner Launchpad</Btn>
        <Link href="/integrations" style={{ marginLeft: "0.75rem", fontSize: "0.78rem", color: "var(--accent)" }}>Integrations hub →</Link>
      </ContentCard>
    </RedesignPage>
  );
}
