import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AeoPillarLayout } from "@/components/seo/AeoPillarLayout";
import { getPillarBySlug, PILLAR_PAGES } from "@/lib/categoryInfrastructure";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return PILLAR_PAGES.map(p => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const page = getPillarBySlug(params.slug);
  if (!page) return {};
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    openGraph: { title: page.metaTitle, description: page.metaDescription },
  };
}

export default function LearnPillarPage({ params }: Props) {
  const page = getPillarBySlug(params.slug);
  if (!page) notFound();
  return <AeoPillarLayout page={page} />;
}
