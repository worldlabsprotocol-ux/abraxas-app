"use client";

import type { ReactNode } from "react";

const actEase = [0.22, 1, 0.36, 1] as const;

export { actEase };

export type CinematicMood = "danger" | "gold" | "success" | "violet";

const MOOD_GRADIENT: Record<CinematicMood, string> = {
  danger: "radial-gradient(ellipse 80% 55% at 50% 42%, rgba(239,68,68,0.07), transparent 62%)",
  gold: "radial-gradient(ellipse 75% 50% at 50% 45%, rgba(212,175,55,0.1), transparent 58%)",
  success: "radial-gradient(ellipse 80% 55% at 50% 40%, rgba(34,197,94,0.09), transparent 60%)",
  violet: "radial-gradient(ellipse 78% 52% at 50% 44%, rgba(167,139,250,0.1), transparent 60%)",
};

export function CinematicDemoShell({
  act,
  actCount,
  actLabel,
  actCaption,
  elapsed,
  totalMs,
  reducedMotion,
  mood = "gold",
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
  mood?: CinematicMood;
  compact?: boolean;
  minHeight?: number;
  containerRef?: React.Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div ref={containerRef} className="cinematic-demo relative mx-auto w-full max-w-5xl">
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-90"
        style={{
          background: MOOD_GRADIENT[mood],
          transition: "background 0.8s ease",
        }}
        aria-hidden
      />

      <div
        className={`relative rounded-2xl border border-white/[0.08] bg-[#080a10]/90 shadow-2xl backdrop-blur-sm ${
          compact ? "p-3 sm:p-4" : "p-4 sm:p-6 md:p-8"
        }`}
      >
        <div className={`flex flex-wrap items-center justify-between gap-2 ${compact ? "mb-3" : "mb-4 sm:mb-5"}`}>
          <div className="flex items-center gap-2">
            {Array.from({ length: actCount }, (_, i) => i + 1).map(n => (
              <span
                key={n}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  act === n ? "w-8 bg-gold" : act > n ? "w-4 bg-gold/40" : "w-4 bg-white/10"
                }`}
              />
            ))}
            <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 sm:text-xs">
              {actLabel}
            </span>
          </div>
          <span className="font-mono text-[10px] tabular-nums text-white/25">
            {reducedMotion ? "Paused" : `${Math.ceil((totalMs - elapsed) / 1000)}s`}
          </span>
        </div>

        <p
          className={`text-center font-medium leading-snug text-white/85 ${
            compact
              ? "mb-3 min-h-[2.25rem] text-xs sm:text-sm"
              : "mb-5 min-h-[2.75rem] text-sm sm:mb-6 sm:min-h-[2rem] sm:text-base md:text-lg"
          }`}
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
