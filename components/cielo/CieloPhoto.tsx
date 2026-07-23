"use client";
// FILE: components/cielo/CieloPhoto.tsx
// Consistent Cielo imagery. dark letterbox prevents white-edge artifacts.

import type { CSSProperties } from "react";

const BG = "#06090B";

export function CieloPhoto({
  src,
  alt,
  objectPosition = "center",
  height,
  minHeight = 320,
  style,
}: {
  src: string;
  alt: string;
  objectPosition?: string;
  height?: number | string;
  minHeight?: number | string;
  style?: CSSProperties;
}) {
  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: height ?? "100%",
      minHeight,
      overflow: "hidden",
      background: BG,
      ...style,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition,
          display: "block",
        }}
      />
    </div>
  );
}
