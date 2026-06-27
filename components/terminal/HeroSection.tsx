"use client";
// FILE: components/terminal/HeroSection.tsx
// Migrated to Tailwind v4 utility classes. Same component name,
// same exports, same exact copy and structure as before, this is a
// styling-layer migration only, not a content or behavior change.
// Split into two exported pieces so AssetGrid can sit between them:
// HeroIntro (headline + stats) -> AssetGrid -> HeroPassportTeaser.

import { AbraxasPassport } from "@/components/identity/AbraxasPassport";
import { ScrollFade } from "./ui";

const STATS: Array<{ label: string; value: string }> = [
  { label: "Verified assets",  value: "6" },
  { label: "Value attested",   value: "Just Under $2M" },
  { label: "Credential standard", value: "W3C" },
];

export function HeroIntro() {
  return (
    <div className="mb-6 border-b border-border pb-6">
      <div className="mb-3 flex items-center gap-2.5">
        <svg width={28} height={28} viewBox="0 0 40 40" fill="none">
          <polygon points="20,2 38,20 20,38 2,20"
            stroke="var(--color-primary)" strokeWidth="2" fill="none"/>
          <polygon points="20,8 32,20 20,32 8,20"
            stroke="var(--color-primary)" strokeWidth="1.5" fill="rgba(16,185,129,0.1)"/>
          <circle cx="20" cy="20" r="3" fill="var(--color-primary)"/>
        </svg>
        <span className="text-[0.95rem] font-black tracking-wide text-primary">
          ABRAXAS
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5">
          <span className="size-1.5 rounded-full bg-primary animate-[var(--animate-pulse-dot)]" />
          <span className="text-[0.62rem] font-bold tracking-wide text-primary">
            PROTOCOL READY
          </span>
        </span>
      </div>

      <h1 className="mb-3.5 text-[clamp(1.7rem,4.2vw,2.75rem)] font-bold leading-[1.15]
                      tracking-tight text-foreground">
        Know what&apos;s real
        <br />
        before you trust it.
      </h1>
      <p className="mb-5 max-w-[540px] text-[clamp(0.88rem,1.8vw,1rem)]
                     leading-relaxed text-muted-foreground">
        Real estate. Royalties. Mineral rights. Businesses. Anything real.
        See what&apos;s actually verified before you put money or trust behind it,
        not just a listing and someone&apos;s word.
      </p>

      <div className="mb-2.5 flex flex-wrap gap-2.5">
        <a href="/terminal#demo-assets"
          className="inline-block rounded-lg bg-primary px-6 py-2.5 text-[0.85rem]
                     font-bold text-black no-underline">
          Enter Protocol
        </a>
        <button onClick={() => { window.location.href = "/terminal?signin=1"; }}
          className="rounded-lg border-[1.5px] border-primary bg-transparent
                     px-6 py-2.5 text-[0.85rem] font-bold text-primary">
          Join Waitlist
        </button>
      </div>
      <div className="mb-6">
        <span className="text-[0.66rem] text-muted-foreground">
          You may see a quick &quot;I&apos;m not a robot&quot; check when signing in,
          that&apos;s normal security, not something meant to slow you down.
        </span>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {STATS.map(s => (
          <div key={s.label}
            className="rounded-[10px] border border-border bg-secondary px-4 py-2.5">
            <div className="font-mono text-[1.1rem] font-bold text-foreground">
              {s.value}
            </div>
            <div className="mt-0.5 text-[0.68rem] text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <div className="flex flex-col items-center gap-1 animate-[var(--animate-scroll-bounce)]">
          <span className="text-[0.6rem] font-semibold tracking-wide text-muted-foreground">
            SCROLL
          </span>
          <span className="text-[0.85rem] text-primary">▾</span>
        </div>
      </div>
    </div>
  );
}

interface HeroPassportTeaserProps {
  onGetVerified: () => void;
}

export function HeroPassportTeaser({ onGetVerified }: HeroPassportTeaserProps) {
  return (
    <ScrollFade>
      <div className="mb-7">
        <div className="mb-3.5 flex items-center gap-2">
          <span className="text-[0.95rem] font-bold text-foreground">
            The Abraxas Passport
          </span>
          <span className="rounded-full bg-primary/10 px-3 py-0.5 text-[0.68rem]
                            font-medium text-primary">
            Verify once, use everywhere
          </span>
        </div>
        <div className="mb-3.5 text-[0.72rem] text-muted-foreground">
          Every stamp shown below, this is what a fully verified Passport
          looks like. Yours starts empty and fills in as you complete each step.
        </div>
        <div className="overflow-hidden rounded-2xl shadow-[0_4px_20px_rgba(16,185,129,0.094)]">
          <AbraxasPassport
            onGetVerified={onGetVerified}
            earnedStamps={["identity", "biometric", "business", "investor", "owner", "royalty", "property", "tribal", "compliance", "lending", "social"]}
          />
        </div>
      </div>
    </ScrollFade>
  );
}
