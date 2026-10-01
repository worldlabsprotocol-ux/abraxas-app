"use client";
// FILE: components/passport/PassportReuseStrip.tsx
// Holder-facing reuse visualization — established once, answers many questions.

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function PassportReuseStrip() {
  return (
    <div className="abx-passport-reuse-strip" aria-label="Passport reuse">
      <p className="abx-passport-reuse-strip__title" style={{ fontFamily: FONT }}>
        Verify once · reuse many times
      </p>
      <p className="abx-passport-reuse-strip__body" style={{ fontFamily: FONT }}>
        Your verified evidence stays in your Passport. When a partner asks a supported question, Abraxas can answer from existing evidence — you do not repeat the full verification each time.
      </p>
    </div>
  );
}
