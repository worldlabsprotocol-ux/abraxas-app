"use client";
// FILE: components/registry/CmnSlabPhoto.tsx
// Institutional PSA slab frame — vault catalog presentation.

import { CMN_SLAB_FRAME, cmnDesignsPhotoRotation } from "@/lib/cmnDesignsDisplay";

export function CmnSlabPhoto({
  src,
  alt,
  height,
  rotation,
  fill = false,
  compact = false,
}: {
  src: string;
  alt: string;
  height?: number;
  rotation?: number;
  /** Fill parent height (slideshow) vs intrinsic gallery frame */
  fill?: boolean;
  compact?: boolean;
}) {
  const deg = rotation ?? cmnDesignsPhotoRotation(src);

  return (
    <div
      style={{
        height: fill ? "100%" : height,
        width: "100%",
        background: CMN_SLAB_FRAME.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: compact ? "4px 6px" : CMN_SLAB_FRAME.padding,
        overflow: "hidden",
        position: fill ? "absolute" : "relative",
        inset: fill ? 0 : undefined,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={fill ? "eager" : "lazy"}
        decoding="async"
        style={{
          maxWidth: compact ? "88%" : "62%",
          maxHeight: compact ? "94%" : "96%",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          transform: deg ? `rotate(${deg}deg)` : undefined,
          filter: "contrast(1.06) saturate(0.9) brightness(1.03)",
          boxShadow: compact ? "none" : "0 10px 36px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
          borderRadius: 2,
        }}
      />
    </div>
  );
}
