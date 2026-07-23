// FILE: app/verify/[recordId]/page.tsx
// Stable public record URLs. e.g. /verify/ABX-RE-HOSP-001

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RedesignShell } from "@/components/redesign/RedesignShell";
import { VerifyRecordStatic } from "@/components/verify/VerifyRecordStatic";
import { REGISTRY_ASSETS, resolveRegistryAsset } from "@/lib/data/registryAssets";
import { resolveVerifierQuery } from "@/lib/verifyRegistry";

interface PageProps {
  params: { recordId: string };
}

export function generateStaticParams() {
  return REGISTRY_ASSETS.map(asset => ({ recordId: asset.abxId }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const asset = resolveRegistryAsset(params.recordId);
  if (!asset) {
    return { title: "Record not found · Abraxas Verify" };
  }

  let label = asset.name;
  try {
    const live = await resolveVerifierQuery(asset.abxId);
    if (live.entity_label) label = live.entity_label;
  } catch {
    /* static fallback */
  }

  const title = `${asset.abxId} · ${label} · Abraxas Verify`;
  const description = `Public registry record for ${label}. Assurance L${asset.assuranceLevel}. Check status, scope, and named issuers without signing in.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default function VerifyRecordPage({ params }: PageProps) {
  const asset = resolveRegistryAsset(params.recordId);
  if (!asset) notFound();

  return (
    <RedesignShell>
      <VerifyRecordStatic recordId={asset.abxId} />
    </RedesignShell>
  );
}
