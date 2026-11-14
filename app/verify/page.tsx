// FILE: app/verify/page.tsx
// Redirect ?q=ABX-… to canonical /verify/[recordId] when the ID is known.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AbxPageShell } from "@/components/design/AbxPageShell";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { VerifyPageIntro } from "@/components/verify/VerifyPageIntro";
import { IndependentVerificationFlow } from "@/components/verify/IndependentVerificationFlow";
import { VerifyPageIntroDemo } from "@/components/verify/VerifyPageIntroDemo";
import { VerifyStaticSample } from "@/components/verify/VerifyStaticSample";
import { VerifyClient } from "./VerifyClient";
import { resolveRegistryAsset } from "@/lib/data/registryAssets";

interface PageProps {
  searchParams?: { q?: string; mode?: string };
}

const DEVELOPER_MODES = new Set(["developer", "receipt", "registry", "credential", "policy"]);

function isDeveloperWorkbench(mode: string | undefined): boolean {
  if (!mode) return false;
  return DEVELOPER_MODES.has(mode.trim());
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

  const developer = isDeveloperWorkbench(searchParams?.mode);

  if (!developer) {
    return (
      <AbxPageShell accent="verify" maxWidth={720}>
        <div style={{ padding: "clamp(1.25rem, 4vw, 2rem) clamp(1rem, 3vw, 1.5rem) clamp(2rem, 6vw, 3rem)" }}>
          <IndependentVerificationFlow />
        </div>
      </AbxPageShell>
    );
  }

  return (
    <AbxPageShell accent="verify">
      <VerifyPageIntro />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(1rem, 3vw, 2rem) clamp(1rem, 3vw, 2rem)" }}>
        <p style={{
          fontFamily: "'Inter',system-ui,sans-serif",
          fontSize: "0.78rem",
          color: "var(--text-secondary)",
          lineHeight: 1.55,
          margin: "0 0 1rem",
          maxWidth: 640,
        }}>
          <Link href="/verify" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
            ← Back to independent verify
          </Link>
        </p>
        <Suspense fallback={<RedesignPageLoading label="Loading tester…" compact />}>
          <VerifyClient />
        </Suspense>
      </div>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(1rem, 3vw, 2rem) clamp(2rem, 6vw, 4rem)" }}>
        <details>
          <summary style={{
            width: "fit-content",
            fontFamily: "'Inter',system-ui,sans-serif",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}>
            Illustrative samples (not live verification)
          </summary>
          <div style={{ paddingTop: "0.75rem" }}>
            <VerifyPageIntroDemo />
            <VerifyStaticSample />
          </div>
        </details>
      </div>
    </AbxPageShell>
  );
}