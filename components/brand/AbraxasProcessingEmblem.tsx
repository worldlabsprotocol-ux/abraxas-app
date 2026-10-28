"use client";
// FILE: components/brand/AbraxasProcessingEmblem.tsx
// Official Abraxas emblem for authentic async processing (no generic spinners).

import Image from "next/image";
import { OFFICIAL_EMBLEM_HERO_WEBP } from "@/lib/brand/officialBrandAssets";

export function AbraxasProcessingEmblem({
  size = 56,
  pulse = true,
  className,
}: {
  size?: number;
  pulse?: boolean;
  className?: string;
}) {
  const wrapClass = ["abx-processing-emblem", pulse ? "abx-processing-emblem--pulse" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapClass} style={{ width: size, height: size }} aria-hidden>
      <Image
        src={OFFICIAL_EMBLEM_HERO_WEBP.src}
        alt=""
        width={size}
        height={size}
        className="abx-processing-emblem__mark"
        priority
      />
    </div>
  );
}
