// FILE: app/verify/page.tsx
// Redirect ?q=ABX-… to canonical /verify/[recordId] when the ID is known.

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RedesignShell } from "@/components/redesign/RedesignShell";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { VerifyPageIntro } from "@/components/verify/VerifyPageIntro";
import { VerifyPageIntroDemo } from "@/components/verify/VerifyPageIntroDemo";
import { VerifyStaticSample } from "@/components/verify/VerifyStaticSample";
import { VerifyClient } from "./VerifyClient";
import { PassportPageTabs } from "@/components/passport/PassportPageTabs";
import { resolveRegistryAsset } from "@/lib/data/registryAssets";

interface PageProps {
  searchParams?: { q?: string; mode?: string };
}

export default function VerifyPage({ searchParams }: PageProps) {
  const q = searchParams?.q?.trim();
  if (q) {
    const asset = resolveRegistryAsset(q);
    if (asset) {
      const mode = searchParams?.mode;
      redirect(mode ? `/verify/${encodeURIComponent(asset.abxId)}?mode=${mode}` : `/verify/${encodeURIComponent(asset.abxId)}`);
    }
  }

  return (
    <RedesignShell>
      <VerifyPageIntro />
      <VerifyPageIntroDemo />
      <VerifyStaticSample />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(1rem, 3vw, 2rem) clamp(2rem, 6vw, 4rem)" }}>
        <Suspense fallback={<RedesignPageLoading label="Loading navigation…" compact />}>
          <PassportPageTabs active="verify" />
        </Suspense>
        <Suspense fallback={<RedesignPageLoading label="Loading verifier…" compact />}>
          <VerifyClient />
        </Suspense>
      </div>
    </RedesignShell>
  );
}
