// FILE: app/verify/[recordId]/page.tsx
// Stable public record URLs — static catalog + owner self-serve listings.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RedesignShell } from "@/components/redesign/RedesignShell";
import { VerifyRecordStatic } from "@/components/verify/VerifyRecordStatic";
import { REGISTRY_ASSETS, resolveRegistryAsset } from "@/lib/data/registryAssets";
import { resolveExternalRegistryAsset } from "@/lib/portal/externalRegistry";
import { resolveVerifierQuery } from "@/lib/verifyRegistry";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { recordId: string };
}

export function generateStaticParams() {
  return REGISTRY_ASSETS.map(asset => ({ recordId: asset.abxId }));
}

async function resolveRecord(recordId: string) {
  const decoded = decodeURIComponent(recordId);
  return resolveRegistryAsset(decoded) ?? await resolveExternalRegistryAsset(decoded);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const asset = await resolveRecord(params.recordId);
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
    openGraph: { title, description, type: "website" },
  };
}

export default async function VerifyRecordPage({ params }: PageProps) {
  const asset = await resolveRecord(params.recordId);
  if (!asset) notFound();

  return (
    <RedesignShell>
      <VerifyRecordStatic recordId={asset.abxId} />
    </RedesignShell>
  );
}
