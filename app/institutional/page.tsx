import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { INVESTOR_PROOF_MAP, INVESTOR_PROOF_STATUS_LABEL } from "@/lib/investorProofMap";

export default function InstitutionalPage() {
  return (
    <RedesignPage accent="neutral" maxWidth={900}>
      <PageHeader
        eyebrow="Institutional diligence"
        title="Private eligibility, with the evidence visible"
        subtitle="Inspect the sandbox flow, the verifier code, and the remaining deployment gates. A code artifact or Vercel build does not imply a live chain integration."
      />

      <div style={{ display: "grid", gap: "1rem" }}>
        {INVESTOR_PROOF_MAP.map((proof) => (
          <ContentCard key={proof.id} title={proof.title}>
            <p style={{ fontWeight: 700, color: "var(--text-primary)" }}>
              {INVESTOR_PROOF_STATUS_LABEL[proof.status]}
            </p>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{proof.detail}</p>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              <strong>Next proof:</strong> {proof.nextGate}
            </p>
            <Link href={proof.evidenceHref} style={{ color: "#10B981", fontWeight: 700 }}>
              Inspect evidence →
            </Link>
          </ContentCard>
        ))}
      </div>

      <ContentCard title="Boundary for a protocol partner">
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Abraxas returns a narrow, audience-bound eligibility result after holder consent. The partner verifies the current public receipt and owns wallet governance, AML/KYT, transactions, and execution. The sandbox institutional result is not live KYB or a Utila integration.
        </p>
        <Link href="/docs/eligibility-presentation-protocol" style={{ color: "#10B981", fontWeight: 700 }}>
          Read the presentation protocol →
        </Link>
      </ContentCard>
    </RedesignPage>
  );
}
