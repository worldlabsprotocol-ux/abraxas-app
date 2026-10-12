import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Company — Abraxas",
  description: "Why Abraxas, design partner program, and institutional positioning.",
  path: "/company",
});

export default function CompanyPage() {
  return (
    <RedesignPage accent="legal" maxWidth={880}>
      <PageHeader
        eyebrow="Company"
        title="Infrastructure for reusable trust"
        subtitle="Abraxas is verification and authorization infrastructure — not a replacement KYC vendor."
      />
      <ContentCard title="Learn more">
        <ul>
          <li>
            <Link href="/why">Why Abraxas</Link> — category and buyer narrative
          </li>
          <li>
            <Link href="/design-partner">Design partner program</Link> — reviewed pilot applications
          </li>
          <li>
            <Link href="/pricing">Pricing</Link> — public pricing surfaces
          </li>
          <li>
            <Link href="/docs/litepaper">Litepaper</Link> — protocol overview
          </li>
        </ul>
      </ContentCard>
    </RedesignPage>
  );
}
