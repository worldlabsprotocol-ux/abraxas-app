"use client";
// FILE: components/home/HomeTrustClose.tsx
// Trust statement and final CTA band.

import { Btn } from "@/components/redesign/ui";
import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";
import { useZkLoginSignInChooserOptional } from "@/components/sui/ZkLoginSignInChooserProvider";
import { canOpenSignInChooser } from "@/lib/sui/zklogin/signInChooserState";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  SIMPLIFIED_FINAL_LINE,
  SIMPLIFIED_HOME_CTA_PRIMARY,
  SIMPLIFIED_HOME_CTA_PRIMARY_HREF,
  SIMPLIFIED_HOME_CTA_SECONDARY,
  SIMPLIFIED_HOME_CTA_SECONDARY_HREF,
  SIMPLIFIED_TRUST_STATEMENT,
} from "@/lib/home/simplifiedHomeCopy";

const FONT = ABRAXAS_FONT_SANS;

export function HomeTrustClose() {
  const auth = useSuiAuthOptional();
  const chooser = useZkLoginSignInChooserOptional();
  const signedIn = Boolean(auth?.suiAddress);
  const useChooser = !signedIn && canOpenSignInChooser({ configured: auth?.isConfigured ?? false });

  return (
    <section aria-labelledby="home-trust-heading" className="abx-home-section-center" style={{ width: "100%" }}>
      <h2 id="home-trust-heading" className="sr-only">
        Trust and next steps
      </h2>
      <p
        style={{
          maxWidth: 640,
          margin: "0 auto 2rem",
          fontFamily: FONT,
          fontSize: "0.9rem",
          lineHeight: 1.65,
          color: "var(--text-secondary)",
        }}
      >
        {SIMPLIFIED_TRUST_STATEMENT}
      </p>

      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1rem, 2.5vw, 1.15rem)",
          fontWeight: 800,
          color: "var(--text-primary)",
          margin: "0 0 1.1rem",
        }}
      >
        {SIMPLIFIED_FINAL_LINE}
      </p>

      <div className="abx-home-hero-actions">
        {useChooser ? (
          <Btn size="lg" onClick={() => chooser?.openChooser()}>
            {SIMPLIFIED_HOME_CTA_PRIMARY}
          </Btn>
        ) : (
          <Btn href={SIMPLIFIED_HOME_CTA_PRIMARY_HREF} size="lg">
            {SIMPLIFIED_HOME_CTA_PRIMARY}
          </Btn>
        )}
        <Btn href={SIMPLIFIED_HOME_CTA_SECONDARY_HREF} variant="secondary" size="lg">
          {SIMPLIFIED_HOME_CTA_SECONDARY}
        </Btn>
      </div>
    </section>
  );
}
