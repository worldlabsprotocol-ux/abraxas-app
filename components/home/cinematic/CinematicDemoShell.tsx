"use client";

import type { ReactNode } from "react";
import { DEMO_VARIANTS, type DemoVariant, type ProgressStyle } from "./demoVariants";

const actEase = [0.22, 1, 0.36, 1] as const;
export { actEase };

function ProgressRail({
  act,
  actCount,
  style,
  accent,
}: {
  act: number;
  actCount: number;
  style: ProgressStyle;
  accent: string;
}) {
  if (style === "minimal") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>
        {act} / {actCount}
      </span>
    );
  }

  if (style === "timeline") {
    return (
      <div className="flex w-full max-w-xs items-center gap-1">
        {Array.from({ length: actCount }, (_, i) => i + 1).map(n => (
          <div key={n} className="flex flex-1 items-center gap-1">
            <span
              className="h-2 w-2 shrink-0 rounded-full transition-all duration-500"
              style={{
                background: act >= n ? accent : "rgba(255,255,255,0.12)",
                boxShadow: act === n ? `0 0 10px ${accent}88` : undefined,
              }}
            />
            {n < actCount && (
              <span
                className="h-px flex-1 transition-colors duration-500"
                style={{ background: act > n ? `${accent}66` : "rgba(255,255,255,0.08)" }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (style === "steps") {
    return (
      <div className="flex items-center gap-1.5">
        {Array.from({ length: actCount }, (_, i) => i + 1).map(n => (
          <span
            key={n}
            className="flex h-5 w-5 items-center justify-center rounded font-mono text-[9px] font-bold transition-all duration-500"
            style={{
              border: `1px solid ${act >= n ? accent : "rgba(255,255,255,0.12)"}`,
              background: act === n ? `${accent}22` : act > n ? `${accent}11` : "transparent",
              color: act >= n ? accent : "rgba(255,255,255,0.35)",
            }}
          >
            {n}
          </span>
        ))}
      </div>
    );
  }

  if (style === "orbit") {
    return (
      <div className="relative flex h-6 w-6 items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke={accent}
            strokeWidth="1.5"
            strokeDasharray={`${(act / actCount) * 56} 56`}
            transform="rotate(-90 12 12)"
          />
        </svg>
        <span className="absolute font-mono text-[8px] font-bold" style={{ color: accent }}>
          {act}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: actCount }, (_, i) => i + 1).map(n => (
        <span
          key={n}
          className="h-1.5 rounded-full transition-all duration-500"
          style={{
            width: act === n ? 28 : act > n ? 14 : 14,
            background: act === n ? accent : act > n ? `${accent}55` : "rgba(255,255,255,0.1)",
          }}
        />
      ))}
    </div>
  );
}

export function CinematicDemoShell({
  act,
  actCount,
  actLabel,
  actCaption,
  elapsed,
  totalMs,
  reducedMotion,
  variant = "default",
  compact = false,
  minHeight = 260,
  containerRef,
  children,
}: {
  act: number;
  actCount: number;
  actLabel: string;
  actCaption: string;
  elapsed: number;
  totalMs: number;
  reducedMotion: boolean;
  variant?: DemoVariant;
  compact?: boolean;
  minHeight?: number;
  containerRef?: React.Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  const theme = DEMO_VARIANTS[variant];

  return (
    <div ref={containerRef} className="cinematic-demo relative mx-auto w-full max-w-5xl">
      <div
        className={`pointer-events-none absolute inset-0 opacity-90 ${theme.frameClass}`}
        style={{ background: theme.ambient, transition: "background 0.8s ease" }}
        aria-hidden
      />

      <div
        className={`relative shadow-2xl backdrop-blur-sm ${theme.frameClass} ${
          compact ? "p-3 sm:p-4" : "p-4 sm:p-6 md:p-8"
        }`}
        style={theme.frameStyle}
      >
        <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ? "mb-3" : "mb-4 sm:mb-5"}`}>
          <div className="flex flex-wrap items-center gap-3">
            <ProgressRail act={act} actCount={actCount} style={theme.progressStyle} accent={theme.accent} />
            <span
              className="font-mono text-[10px] uppercase tracking-[0.16em] sm:text-xs"
              style={{ color: theme.labelColor }}
            >
              {actLabel}
            </span>
          </div>
          <span className="font-mono text-[10px] tabular-nums text-white/25">
            {reducedMotion ? "Paused" : `${Math.ceil((totalMs - elapsed) / 1000)}s`}
          </span>
        </div>

        <p
          className={`font-medium leading-snug ${
            compact ? "mb-3 min-h-[2.25rem] text-xs sm:text-sm" : "mb-5 min-h-[2.75rem] text-sm sm:mb-6 sm:min-h-[2rem] sm:text-base md:text-lg"
          }`}
          style={{ color: theme.captionColor, textAlign: variant === "terminal" ? "left" : "center" }}
        >
          {actCaption}
        </p>

        <div className="relative" style={{ minHeight }}>
          {children}
        </div>
      </div>
    </div>
  );
}
