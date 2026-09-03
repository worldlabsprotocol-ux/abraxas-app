// FILE: app/verify/page.tsx
// Redirect ?q=ABX-… to canonical /verify/[recordId] when the ID is known.

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RedesignShell } from "@/components/redesign/RedesignShell";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { VerifyPageIntro } from "@/components/verify/VerifyPageIntro";
import { DeveloperContextBanner } from "@/components/redesign/DeveloperContextBanner";
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
      <div style={{ padding: "0 clamp(1rem, 3vw, 2rem)", marginBottom: "1rem" }}>
        <DeveloperContextBanner title="Developer Receipt Tester" />
      </div>
      <VerifyPageIntro />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(1rem, 3vw, 2rem) clamp(1rem, 3vw, 2rem)" }}>
        <Suspense fallback={<RedesignPageLoading label="Loading navigation…" compact />}>
          <PassportPageTabs active="verify" />
        </Suspense>
        <Suspense fallback={<RedesignPageLoading label="Loading verifier…" compact />}>
          <VerifyClient />
        </Suspense>
      </div>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(1rem, 3vw, 2rem) clamp(2rem, 6vw, 4rem)" }}>
        <p style={{
          fontFamily: "'Inter',system-ui,sans-serif",
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          margin: "0 0 0.75rem",
        }}>
          Reference demos (below the live tools)
        </p>
        <VerifyPageIntroDemo />
        <VerifyStaticSample />
      </div>
    </RedesignShell>
  );
}
