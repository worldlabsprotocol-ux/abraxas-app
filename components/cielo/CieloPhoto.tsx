"use client";
// FILE: components/cielo/CieloPhoto.tsx
// Consistent Cielo imagery with optional crop (for collage source files).

import type { CSSProperties } from "react";

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
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      style={{
        width: "100%",
        height: height ?? "100%",
        minHeight,
        objectFit: "cover",
        objectPosition,
        display: "block",
        ...style,
      }}
    />
  );
}
