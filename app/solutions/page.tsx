import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Solutions: Abraxas",
  description: "Reuse verified evidence across applications with policy-specific authorization and signed receipts.",
  path: "/solutions",
});

export default function SolutionsPage() {
  return (
    <RedesignPage accent="partner" maxWidth={880}>
      <PageHeader
        eyebrow="Solutions"
        title="Verification reuse without identity file exchange"
        subtitle="Keep your existing KYC stack. Abraxas controls what each application learns from trusted evidence."
      />
      <ContentCard title="Common integration patterns">
        <ul>
          <li>
            <Link href="/integrate">For businesses</Link>: commercial positioning and integration pillars
          </li>
          <li>
            <Link href="/docs/trading-venue">Trading venue access</Link>: venue-specific policy profiles
          </li>
          <li>
            <Link href="/solutions/supply-network">Supply network</Link>: provenance-oriented eligibility
          </li>
          <li>
            <Link href="/good-trouble">Sandbox example</Link>: Good Trouble age-gated browse demo
          </li>
        </ul>
      </ContentCard>
    </RedesignPage>
  );
}
