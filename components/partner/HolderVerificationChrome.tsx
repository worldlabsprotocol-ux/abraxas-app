"use client";

import { EnvironmentBadge } from "@/components/product/EnvironmentBadge";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function HolderVerificationChrome({
  environment,
}: {
  environment: "sandbox" | "production";
}) {
  return (
    <header className="abx-holder-verification-chrome">
      <div>
        <p className="abx-holder-verification-chrome__eyebrow">Abraxas Verification</p>
      </div>
      <EnvironmentBadge environment={environment} />
    </header>
  );
}

export function holderVerificationChromeStyles(): typeof FONT {
  return FONT;
}
