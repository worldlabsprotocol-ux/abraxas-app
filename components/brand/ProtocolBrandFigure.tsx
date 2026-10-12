"use client";
// FILE: components/brand/ProtocolBrandFigure.tsx
// Official protocol imagery for architecture exhibits (founder-provided).

import Image from "next/image";
import { OFFICIAL_BRAND_ASSETS } from "@/lib/brand/officialBrandAssets";

type AssetKey = keyof typeof OFFICIAL_BRAND_ASSETS;

export function ProtocolBrandFigure({
  asset,
  priority = false,
  caption,
  className,
}: {
  asset: AssetKey;
  priority?: boolean;
  caption?: string;
  className?: string;
}) {
  const meta = OFFICIAL_BRAND_ASSETS[asset];
  return (
    <figure className={className ?? "abx-protocol-brand-figure"}>
      <div className="abx-protocol-brand-figure__frame">
        <Image
          src={meta.src}
          alt={meta.alt}
          width={meta.width}
          height={meta.height}
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            borderRadius: 12,
          }}
        />
      </div>
      {caption ? <figcaption className="abx-protocol-brand-figure__caption">{caption}</figcaption> : null}
    </figure>
  );
}
