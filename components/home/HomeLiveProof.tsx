// FILE: components/home/HomeLiveProof.tsx
// Cielo + Chickasaw — once each, correct photos from lib/assets.ts.

import Image from "next/image";
import Link from "next/link";
import { LIVE_PROOF_ASSETS } from "@/lib/assets";

export function HomeLiveProof() {
  return (
    <section aria-labelledby="live-proof-heading" className="pr-section pr-section-border">
      <span className="pr-label">Live proof</span>
      <h2 id="live-proof-heading" className="pr-h2">Production reference assets</h2>
      <p className="pr-body pr-body-tight">
        Two live reference deployments on Abraxas today.
      </p>
      <div className="pr-proof-grid">
        {LIVE_PROOF_ASSETS.map((asset) => (
          <article key={asset.id} className="pr-proof-card">
            <div className="pr-proof-image-wrap">
              <Image
                src={asset.image.src}
                alt={asset.image.alt}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: "cover", objectPosition: asset.image.objectPosition ?? "center" }}
              />
            </div>
            <div className="pr-proof-body">
              <div className="pr-proof-meta">
                <span className="pr-label pr-label-inline">{asset.abxId}</span>
              </div>
              <h3 className="pr-proof-title">{asset.name}</h3>
              <p className="pr-proof-sub">{asset.assetClass} · {asset.location}</p>
              <p className="pr-body">{asset.outcome}</p>
              <div className="pr-proof-links">
                <Link href={asset.verifyHref} className="pr-text-link">Verify record →</Link>
                <Link href={asset.href} className="pr-text-link pr-text-link-muted">Case study →</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
