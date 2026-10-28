"use client";
// FILE: components/brand/AbraxasProcessingEmblem.tsx
// Founder-approved living sphere during authentic async processing (no generic spinners).

import Image from "next/image";
import { trustProcessingEmblemForSize } from "@/lib/brand/livingSphereBrandAssets";

export function AbraxasProcessingEmblem({
  size = 56,
  pulse = true,
  className,
}: {
  size?: number;
  pulse?: boolean;
  className?: string;
}) {
  const asset = trustProcessingEmblemForSize(size);
  const wrapClass = ["abx-processing-emblem", pulse ? "abx-processing-emblem--pulse" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapClass} style={{ width: size, height: size }} aria-hidden>
      <Image
        src={asset.src}
        alt=""
        width={size}
        height={size}
        className="abx-processing-emblem__mark abx-processing-emblem__mark--living-sphere"
        priority
        sizes={`${size}px`}
      />
    </div>
  );
}
