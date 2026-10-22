"use client";
// FILE: components/brand/AbraxasLogo.tsx
// Official Abraxas logo lockups — founder-provided assets only.

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { LIVING_SPHERE_BRAND } from "@/lib/brand/livingSphereBrandAssets";
import { PUBLIC_FONT_SANS } from "@/lib/design/publicSurface";

const FONT = PUBLIC_FONT_SANS;

export type AbraxasLogoProps = {
  /** Nav / footer: emblem + wordmark. Emblem-only for compact loading states. */
  variant?: "lockup" | "emblem";
  /** Emblem height in px (width follows aspect ratio). */
  emblemSize?: number;
  href?: string;
  /** When true, hide the text wordmark (emblem must remain recognizable). */
  emblemOnly?: boolean;
  className?: string;
};

export function AbraxasLogo({
  variant = "lockup",
  emblemSize = 34,
  href = "/",
  emblemOnly = false,
  className,
}: AbraxasLogoProps) {
  const emblem = LIVING_SPHERE_BRAND.hero;
  const showWordmark = variant === "lockup" && !emblemOnly;

  const inner = (
    <>
      <span
        className="abx-brand-living-sphere-mark"
        style={{
          width: emblemSize,
          height: emblemSize,
          flexShrink: 0,
          position: "relative",
        }}
      >
        <Image
          src={emblem.src}
          alt={emblemOnly ? emblem.alt : ""}
          fill
          priority={emblemSize >= 40}
          fetchPriority={emblemSize >= 40 ? "high" : "low"}
          sizes={`${emblemSize}px`}
          className="abx-brand-living-sphere-mark__img"
        />
      </span>
      {showWordmark ? (
        <span
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.05rem, 1.6vw, 1.25rem)",
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Abraxas
        </span>
      ) : null}
    </>
  );

  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: showWordmark ? "0.55rem" : 0,
    textDecoration: "none",
    flexShrink: 0,
  };

  if (href) {
    return (
      <Link href={href} aria-label="Abraxas home" className={className} style={style}>
        {inner}
      </Link>
    );
  }

  return (
    <span className={className} style={style}>
      {inner}
    </span>
  );
}
