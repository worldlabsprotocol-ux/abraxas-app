// FILE: app/case-studies/chickasaw-project/page.tsx
// Chickasaw Project — minimal public case study (no internal demo surfaces).

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RedesignShell } from "@/components/redesign/RedesignShell";
import { CHICKASAW_PROJECT } from "@/lib/assets";
import { CPG_ASSET } from "@/lib/cpgLandCaseStudy";
import { siteUrl } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "Chickasaw Project — Abraxas reference",
  description: "Grady County land reference on Abraxas — registry-ready diligence for Oklahoma growth corridor parcels.",
  alternates: { canonical: siteUrl("/case-studies/chickasaw-project") },
};

export default function ChickasawProjectPage() {
  const asset = CHICKASAW_PROJECT;
  return (
    <RedesignShell>
      <article style={{ maxWidth: 720, padding: "clamp(2rem, 5vw, 3rem) 0" }}>
        <p className="pr-label">{asset.abxId}</p>
        <h1 className="pr-h2" style={{ maxWidth: "none", fontSize: "var(--fs-h1)" }}>{asset.name}</h1>
        <p className="pr-body">{CPG_ASSET.subtitle}</p>
        <div className="pr-proof-image-wrap" style={{ borderRadius: "var(--radius-lg)", margin: "1.5rem 0" }}>
          <Image
            src={asset.image.src}
            alt={asset.image.alt}
            fill
            sizes="(max-width: 768px) 100vw, 720px"
            style={{ objectFit: "cover" }}
            priority
          />
        </div>
        <p className="pr-body">{asset.outcome}</p>
        <p className="pr-body">
          {CPG_ASSET.parentAcres} acres across surveyed tracts in the Chickasha / Blanchard corridor.
          Partner status updates sync to the Abraxas registry — buyers verify on-protocol.
        </p>
        <div className="pr-cta-row">
          <Link href={asset.verifyHref} className="pr-text-link">Verify record →</Link>
          <Link href="/" className="pr-text-link pr-text-link-muted">Back to home →</Link>
        </div>
      </article>
    </RedesignShell>
  );
}
