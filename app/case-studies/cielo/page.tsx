import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { CaseStudyGallery, CaseStudyPhotoHero } from "@/components/case-studies/CaseStudyGallery";
import { CIELO_GALLERY_IMAGES, CIELO_HERO_IMAGE } from "@/lib/data/cieloMedia";
import { publicHomeFlowById, PUBLIC_FLOW_STATUS_LABEL } from "@/lib/product/publicFlowManifest";

const cielo = publicHomeFlowById("cielo-registry");
if (!cielo) throw new Error("cielo_flow_missing");

export default function CieloCaseStudyPage() {
  return (
    <RedesignPage accent="neutral" maxWidth={900}>
      <PageHeader
        eyebrow={`Case study · ${PUBLIC_FLOW_STATUS_LABEL[cielo.status]}`}
        title="Cielo Sunrise"
        subtitle={cielo.endState}
      />
      <CaseStudyPhotoHero
        src={CIELO_HERO_IMAGE.src}
        alt={CIELO_HERO_IMAGE.alt}
        objectPosition={CIELO_HERO_IMAGE.objectPosition}
        badge="Registry record · Planned"
        title="Cielo Sunrise"
        subtitle="A reference asset dossier, not a completed Abraxas booking"
      />
      <ContentCard title="What this case study shows">
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          This record shows how asset information could be presented for review. It does not establish a current third-party appraisal, active verification certificate, USDC payment rail, or production booking flow. Those claims require separately dated, independently checkable evidence.
        </p>
        <Link href={cielo.route} style={{ color: "#10B981", fontWeight: 700 }}>Open the registry record →</Link>
      </ContentCard>
      <ContentCard title="Property photos">
        <CaseStudyGallery images={[...CIELO_GALLERY_IMAGES]} altPrefix="Cielo Sunrise" />
      </ContentCard>
      <ContentCard title="What would make it live">
        <ol style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
          <li>Publish current third-party evidence with source dates and scope.</li>
          <li>Complete a production booking through a partner-owned payment path.</li>
          <li>Expose a verifiable receipt and transaction record before claiming usage or revenue.</li>
        </ol>
      </ContentCard>
      <Link href="/investors" style={{ color: "#10B981", fontWeight: 700 }}>Investor data room →</Link>
    </RedesignPage>
  );
}
