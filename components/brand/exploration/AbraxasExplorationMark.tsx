"use client";

import type { BrandDirectionId, BrandExplorationLevel } from "@/lib/brand/exploration/brandExplorationMeta";
import { BRAND_EXPLORATION_COLORS } from "@/lib/brand/exploration/brandExplorationMeta";

export type AbraxasExplorationMarkProps = {
  direction: BrandDirectionId;
  level?: BrandExplorationLevel;
  size?: number;
  variant?: "dark" | "light" | "mono";
  className?: string;
  title?: string;
};

const C = BRAND_EXPLORATION_COLORS;

function palette(variant: AbraxasExplorationMarkProps["variant"]) {
  if (variant === "light") {
    return {
      shell: C.graphite,
      ink: C.graphite,
      accent: "#2A9B72",
      filaments: ["#2A9B72", "#6B7280", "#6B7280", "#6B7280", "#6B7280"],
      living: [C.livingViolet, C.livingLime, C.livingGold, C.livingMagenta, C.livingViolet],
    };
  }
  if (variant === "mono") {
    return {
      shell: "#F0F4F8",
      ink: "#F0F4F8",
      accent: "#FFFFFF",
      filaments: ["#FFFFFF", "#CBD5E1", "#CBD5E1", "#CBD5E1", "#CBD5E1"],
      living: ["#FFFFFF", "#E2E8F0", "#FFFFFF", "#E2E8F0", "#FFFFFF"],
    };
  }
  return {
    shell: C.institutionalTeal,
    ink: C.mist,
    accent: C.institutionalTeal,
    filaments: [C.institutionalTeal, "#5EEAD4", "#94A3B8", "#5EEAD4", C.institutionalTeal],
    living: [C.livingViolet, C.livingLime, C.livingGold, C.livingMagenta, C.livingViolet],
  };
}

function SovereignCore({ level, colors }: { level: BrandExplorationLevel; colors: ReturnType<typeof palette> }) {
  return (
    <>
      <circle cx="32" cy="32" r="28" fill="none" stroke={colors.shell} strokeWidth="2.5" opacity={0.9} />
      <circle cx="32" cy="32" r="18" fill="none" stroke={colors.shell} strokeWidth="1.5" opacity={0.55} />
      <circle cx="32" cy="32" r="7" fill={colors.accent} />
      {[
        "M32 14 A18 18 0 0 1 46 22",
        "M46 42 A18 18 0 0 1 32 50",
        "M32 50 A18 18 0 0 1 18 42",
        "M18 22 A18 18 0 0 1 32 14",
      ].map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke={colors.shell}
          strokeWidth={level === "living" ? 2 : 1.5}
          strokeLinecap="round"
          opacity={0.75}
        />
      ))}
    </>
  );
}

function LivingProtocol({ level, colors }: { level: BrandExplorationLevel; colors: ReturnType<typeof palette> }) {
  const filamentColors = level === "living" ? colors.living : colors.filaments;
  const paths = [
    "M32 10 C42 18, 44 28, 32 32 C20 28, 22 18, 32 10",
    "M54 32 C46 42, 36 44, 32 32 C36 20, 46 22, 54 32",
    "M32 54 C22 46, 20 36, 32 32 C44 36, 42 46, 32 54",
    "M10 32 C18 22, 28 20, 32 32 C28 44, 18 42, 10 32",
    "M22 22 C28 26, 30 30, 32 32 C30 34, 26 36, 22 22",
  ];
  return (
    <>
      <circle cx="32" cy="32" r="28" fill={level === "living" ? "rgba(11,18,24,0.35)" : "none"} stroke={colors.shell} strokeWidth="2.5" />
      {level === "living" ? (
        <circle cx="32" cy="32" r="24" fill="url(#abx-living-glow)" opacity={0.85} />
      ) : null}
      {paths.map((d, i) => (
        <path
          key={d}
          d={d}
          fill={level === "living" ? filamentColors[i % filamentColors.length] : "none"}
          fillOpacity={level === "living" ? 0.35 : 0}
          stroke={filamentColors[i % filamentColors.length]}
          strokeWidth={level === "living" ? 1.75 : 2}
          strokeLinejoin="round"
          opacity={0.92}
        />
      ))}
      <circle cx="32" cy="32" r="4.5" fill={colors.accent} opacity={0.95} />
    </>
  );
}

function VerifiableUniverse({ level, colors }: { level: BrandExplorationLevel; colors: ReturnType<typeof palette> }) {
  const spokes = 6;
  return (
    <>
      <circle cx="32" cy="32" r="28" fill="none" stroke={colors.shell} strokeWidth="2.5" />
      {Array.from({ length: spokes }).map((_, i) => {
        const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
        const x = 32 + 26 * Math.cos(a);
        const y = 32 + 26 * Math.sin(a);
        return (
          <line
            key={i}
            x1={x}
            y1={y}
            x2="32"
            y2="32"
            stroke={colors.accent}
            strokeWidth={level === "living" ? 2 : 1.5}
            opacity={0.85}
          />
        );
      })}
      <polygon
        points="32,24 37,28 35,35 29,35 27,28"
        fill={level === "living" ? C.livingGold : colors.accent}
        opacity={0.95}
      />
    </>
  );
}

export function AbraxasExplorationMark({
  direction,
  level = "permanent",
  size = 64,
  variant = "dark",
  className,
  title = "Abraxas brand exploration mark",
}: AbraxasExplorationMarkProps) {
  const colors = palette(variant);
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="abx-living-glow" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={C.livingMagenta} stopOpacity={0.45} />
          <stop offset="45%" stopColor={C.livingViolet} stopOpacity={0.25} />
          <stop offset="100%" stopColor={C.graphite} stopOpacity={0} />
        </radialGradient>
      </defs>
      {direction === "sovereign-core" ? (
        <SovereignCore level={level} colors={colors} />
      ) : direction === "verifiable-universe" ? (
        <VerifiableUniverse level={level} colors={colors} />
      ) : (
        <LivingProtocol level={level} colors={colors} />
      )}
    </svg>
  );
}

export function AbraxasExplorationLockup({
  direction,
  level = "permanent",
  emblemSize = 40,
  variant = "dark",
}: {
  direction: BrandDirectionId;
  level?: BrandExplorationLevel;
  emblemSize?: number;
  variant?: "dark" | "light" | "mono";
}) {
  const textColor = variant === "light" ? C.graphite : C.mist;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.65rem" }}>
      <AbraxasExplorationMark direction={direction} level={level} size={emblemSize} variant={variant} />
      <span
        style={{
          fontWeight: 800,
          letterSpacing: "0.08em",
          fontSize: emblemSize * 0.42,
          color: textColor,
          textTransform: "uppercase",
        }}
      >
        Abraxas
      </span>
    </span>
  );
}
